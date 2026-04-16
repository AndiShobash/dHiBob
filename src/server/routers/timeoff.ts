import { z } from 'zod';
import { differenceInCalendarDays, startOfYear, endOfYear } from 'date-fns';
import { router, protectedProcedure } from '@/server/trpc';
import { TRPCError } from '@trpc/server';
import { calculateBalance } from '@/lib/accrual-engine';

// Input schemas aligned to actual Prisma schema
const submitRequestSchema = z.object({
  employeeId: z.string(),
  policyId: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().optional(),
});

const listRequestsSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  employeeId: z.string().optional(),
  limit: z.number().min(1).max(1000).default(100),
  cursor: z.string().optional(),
});

const approveRejectSchema = z.object({ requestId: z.string() });

const getBalanceSchema = z.object({ employeeId: z.string(), year: z.number().optional() });

export const timeoffRouter = router({
  // Create a new leave type
  createPolicy: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      type: z.string().min(1),
      color: z.string().default('#3b82f6'),
      accrualRate: z.number().optional(),
      maxCarryOver: z.number().optional(),
      allowNegative: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.timeOffPolicy.create({
        data: { companyId: ctx.user.companyId, ...input },
      });
    }),

  // Update a leave type
  updatePolicy: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      type: z.string().optional(),
      color: z.string().optional(),
      accrualRate: z.number().optional(),
      maxCarryOver: z.number().optional(),
      allowNegative: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const policy = await ctx.db.timeOffPolicy.findFirst({ where: { id: input.id, companyId: ctx.user.companyId } });
      if (!policy) throw new TRPCError({ code: 'NOT_FOUND' });
      const { id, ...data } = input;
      return ctx.db.timeOffPolicy.update({ where: { id }, data });
    }),

  // Delete a leave type
  deletePolicy: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const policy = await ctx.db.timeOffPolicy.findFirst({ where: { id: input.id, companyId: ctx.user.companyId } });
      if (!policy) throw new TRPCError({ code: 'NOT_FOUND' });
      return ctx.db.timeOffPolicy.delete({ where: { id: input.id } });
    }),

  listPolicies: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.timeOffPolicy.findMany({
      where: { companyId: ctx.user.companyId },
      orderBy: { name: 'asc' },
    });
  }),

  listRequests: protectedProcedure.input(listRequestsSchema).query(async ({ ctx, input }) => {
    const { status, employeeId, limit, cursor } = input;
    const where: Record<string, unknown> = { employee: { companyId: ctx.user.companyId } };
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;
    const requests = await ctx.db.timeOffRequest.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, department: { select: { name: true } } } },
        policy: { select: { id: true, name: true, type: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });
    let nextCursor: string | undefined = undefined;
    if (requests.length > limit) {
      const nextItem = requests.pop();
      nextCursor = nextItem?.id;
    }
    return { requests, nextCursor };
  }),

  getPolicyBalances: protectedProcedure.input(getBalanceSchema).query(async ({ ctx, input }) => {
    const { employeeId, year } = input;
    const currentYear = year ?? new Date().getFullYear();
    const employee = await ctx.db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found' });
    if (employee.companyId !== ctx.user.companyId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this employee' });
    }

    const [policies, approvedRequests] = await Promise.all([
      ctx.db.timeOffPolicy.findMany({ where: { companyId: ctx.user.companyId } }),
      ctx.db.timeOffRequest.findMany({
        where: { employeeId, status: 'APPROVED', startDate: { gte: startOfYear(new Date(currentYear, 0, 1)) }, endDate: { lte: endOfYear(new Date(currentYear, 0, 1)) } },
        include: { policy: true },
      }),
    ]);

    const today = new Date();
    const yearEnd = endOfYear(new Date(currentYear, 0, 1));

    return policies.map(policy => {
      const policyRequests = approvedRequests.filter(r => r.policyId === policy.id);
      
      const current = calculateBalance({
        employeeStartDate: employee.startDate,
        policyAccrualRate: policy.accrualRate || 0,
        policyMaxCarryOver: policy.maxCarryOver || 0,
        approvedRequests: policyRequests,
        calculationDate: today,
        carryover: 0 // Mocked for now
      });

      const projected = calculateBalance({
        employeeStartDate: employee.startDate,
        policyAccrualRate: policy.accrualRate || 0,
        policyMaxCarryOver: policy.maxCarryOver || 0,
        approvedRequests: policyRequests,
        calculationDate: yearEnd,
        carryover: 0 // Mocked for now
      });

      return {
        policyId: policy.id,
        policyName: policy.name,
        accrualRate: policy.accrualRate || 0,
        accrued: current.accrued,
        used: current.used,
        available: current.available,
        projectedYearEnd: projected.available,
      };
    });
  }),

  submitRequest: protectedProcedure.input(submitRequestSchema).mutation(async ({ ctx, input }) => {
    const { employeeId, policyId, startDate, endDate, reason } = input;
    const employee = await ctx.db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found' });
    if (employee.companyId !== ctx.user.companyId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this employee' });
    }
    const policy = await ctx.db.timeOffPolicy.findUnique({ where: { id: policyId } });
    if (!policy) throw new TRPCError({ code: 'NOT_FOUND', message: 'Policy not found' });

    if (endDate < startDate) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'End date must not be before start date' });
    }

    const days = differenceInCalendarDays(endDate, startDate) + 1;

    // Future-Date Validation
    const approvedRequests = await ctx.db.timeOffRequest.findMany({
      where: { employeeId, policyId, status: 'APPROVED', startDate: { gte: startOfYear(startDate) }, endDate: { lte: endOfYear(startDate) } },
    });

    const projection = calculateBalance({
      employeeStartDate: employee.startDate,
      policyAccrualRate: policy.accrualRate || 0,
      policyMaxCarryOver: policy.maxCarryOver || 0,
      approvedRequests,
      calculationDate: endDate,
      carryover: 0
    });

    if (!policy.allowNegative && projection.available < days) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Insufficient accrued balance for the requested dates.' });
    }

    const request = await ctx.db.timeOffRequest.create({
      data: {
        employeeId,
        policyId,
        startDate,
        endDate,
        days,
        reason,
        status: 'PENDING',
      },
      include: { employee: true, policy: true },
    });
    return request;
  }),

  approve: protectedProcedure.input(approveRejectSchema).mutation(async ({ ctx, input }) => {
    const request = await ctx.db.timeOffRequest.findUnique({
      where: { id: input.requestId },
      include: { employee: true },
    });
    if (!request) throw new TRPCError({ code: 'NOT_FOUND', message: 'Request not found' });
    if (request.employee.companyId !== ctx.user.companyId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this request' });
    }
    return ctx.db.timeOffRequest.update({
      where: { id: input.requestId },
      data: {
        status: 'APPROVED',
        reviewedBy: ctx.user.employeeId ?? null,
        reviewedAt: new Date(),
      },
      include: { employee: true, policy: true },
    });
  }),

  reject: protectedProcedure.input(approveRejectSchema).mutation(async ({ ctx, input }) => {
    const request = await ctx.db.timeOffRequest.findUnique({
      where: { id: input.requestId },
      include: { employee: true },
    });
    if (!request) throw new TRPCError({ code: 'NOT_FOUND', message: 'Request not found' });
    if (request.employee.companyId !== ctx.user.companyId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this request' });
    }
    return ctx.db.timeOffRequest.update({
      where: { id: input.requestId },
      data: {
        status: 'REJECTED',
        reviewedBy: ctx.user.employeeId ?? null,
        reviewedAt: new Date(),
      },
      include: { employee: true, policy: true },
    });
  }),

  // Cancel a pending request (employee can cancel their own)
  cancelRequest: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.timeOffRequest.findUnique({
        where: { id: input.requestId },
        include: { employee: true },
      });
      if (!request) throw new TRPCError({ code: 'NOT_FOUND' });
      if (request.employeeId !== ctx.user.employeeId && request.employee.companyId !== ctx.user.companyId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      if (request.status === 'REJECTED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Rejected requests cannot be cancelled' });
      }
      return ctx.db.timeOffRequest.delete({ where: { id: input.requestId } });
    }),

  // Edit a pending request
  editRequest: protectedProcedure
    .input(z.object({
      requestId: z.string(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.timeOffRequest.findUnique({
        where: { id: input.requestId },
        include: { employee: true },
      });
      if (!request) throw new TRPCError({ code: 'NOT_FOUND' });
      if (request.employeeId !== ctx.user.employeeId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      if (request.status === 'REJECTED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Rejected requests cannot be edited' });
      }
      const data: any = { status: 'PENDING', reviewedBy: null, reviewedAt: null };
      if (input.startDate) data.startDate = input.startDate;
      if (input.endDate) data.endDate = input.endDate;
      if (input.reason !== undefined) data.reason = input.reason;
      if (input.startDate && input.endDate) {
        const diffMs = input.endDate.getTime() - input.startDate.getTime();
        data.days = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
      }
      return ctx.db.timeOffRequest.update({
        where: { id: input.requestId },
        data,
        include: { employee: true, policy: true },
      });
    }),

  // Team calendar — all requests for the company in a date range
  teamCalendar: protectedProcedure
    .input(z.object({ startDate: z.coerce.date(), endDate: z.coerce.date() }).optional())
    .query(async ({ ctx }) => {
      const requests = await ctx.db.timeOffRequest.findMany({
        where: {
          status: { in: ['APPROVED', 'PENDING'] },
          employee: { companyId: ctx.user.companyId },
        },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, avatar: true, department: { select: { name: true } } } },
          policy: { select: { id: true, name: true, type: true, color: true } },
        },
        orderBy: { startDate: 'asc' },
      });
      return requests;
    }),

  getBalance: protectedProcedure.input(getBalanceSchema).query(async ({ ctx, input }) => {
    const requests = await ctx.db.timeOffRequest.findMany({
      where: { employeeId: input.employeeId, status: 'APPROVED' },
      include: { policy: true }
    });
    
    const summary = {
      vacation: { used: 0 },
      sick: { used: 0 },
      personal: { used: 0 },
    };

    requests.forEach(r => {
      const type = r.policy.type.toLowerCase() as keyof typeof summary;
      if (summary[type]) {
        summary[type].used += r.days;
      }
    });

    return summary;
  }),
});
