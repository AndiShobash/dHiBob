import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '@/server/trpc';
import { TRPCError } from '@trpc/server';

const createEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  department: z.string(),
  jobTitle: z.string(),
  startDate: z.coerce.date(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT']),
  manager: z.string().optional(),
  site: z.string().optional(),
  salary: z.number().positive().optional(),
  companyId: z.string(),
});

const updateEmployeeSchema = createEmployeeSchema.partial().extend({ id: z.string() });

const terminateEmployeeSchema = z.object({
  id: z.string(),
  endDate: z.coerce.date(),
  reason: z.string().optional(),
});

const listEmployeesSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  cursor: z.string().optional(),
  search: z.string().optional(),
  department: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).optional(),
  site: z.string().optional(),
});

export const employeeRouter = router({
  list: protectedProcedure.input(listEmployeesSchema).query(async ({ ctx, input }) => {
    const { limit, cursor, search, department, status, site } = input;
    let where: any = { companyId: ctx.user.companyId };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (department) where.department = department;
    if (status) where.status = status;
    if (site) where.site = site;
    const employees = await ctx.db.employee.findMany({
      where,
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        user: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });
    let nextCursor: typeof cursor | undefined = undefined;
    if (employees.length > limit) { const nextItem = employees.pop(); nextCursor = nextItem?.id; }
    return { employees, nextCursor };
  }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const employee = await ctx.db.employee.findUnique({
      where: { id: input.id },
      include: {
        company: true, manager: true,
        directReports: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
        user: { select: { id: true, email: true, role: true } },
      },
    });
    if (!employee) throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found' });
    if (employee.companyId !== ctx.user.companyId) throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this employee' });
    return employee;
  }),

  create: protectedProcedure.input(createEmployeeSchema).mutation(async ({ ctx, input }) => {
    if (input.companyId !== ctx.user.companyId && ctx.user.role !== 'ADMIN') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to create employees' });
    }
    const existingUser = await ctx.db.user.findUnique({ where: { email: input.email } });
    if (existingUser) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Email already in use' });
    const employee = await ctx.db.employee.create({
      data: {
        firstName: input.firstName, lastName: input.lastName, email: input.email, phone: input.phone,
        department: input.department, jobTitle: input.jobTitle, startDate: input.startDate,
        employmentType: input.employmentType, managerId: input.manager, site: input.site,
        salary: input.salary, companyId: input.companyId, status: 'ACTIVE',
      },
      include: { company: true, manager: true },
    });
    return employee;
  }),

  update: protectedProcedure.input(updateEmployeeSchema).mutation(async ({ ctx, input }) => {
    const { id, ...updateData } = input;
    const employee = await ctx.db.employee.findUnique({ where: { id } });
    if (!employee) throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found' });
    if (employee.companyId !== ctx.user.companyId) throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to update this employee' });
    const updated = await ctx.db.employee.update({
      where: { id }, data: { ...updateData, companyId: undefined },
      include: { company: true, manager: true },
    });
    return updated;
  }),

  terminate: protectedProcedure.input(terminateEmployeeSchema).mutation(async ({ ctx, input }) => {
    const employee = await ctx.db.employee.findUnique({ where: { id: input.id } });
    if (!employee) throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found' });
    if (employee.companyId !== ctx.user.companyId) throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to terminate this employee' });
    const terminated = await ctx.db.employee.update({
      where: { id: input.id }, data: { status: 'TERMINATED', endDate: input.endDate },
      include: { company: true },
    });
    return terminated;
  }),
});
