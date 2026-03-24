import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { TRPCError } from '@trpc/server';

const createCycleSchema = z.object({
  name: z.string().min(1), startDate: z.coerce.date(), endDate: z.coerce.date(),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'REVIEW', 'COMPLETED']).default('PLANNING'),
});
const listCyclesSchema = z.object({
  status: z.enum(['PLANNING', 'ACTIVE', 'REVIEW', 'COMPLETED']).optional(),
  limit: z.number().min(1).max(100).default(10), cursor: z.string().optional(),
});
const submitReviewSchema = z.object({
  cycleId: z.string(), employeeId: z.string(), rating: z.number().min(1).max(5),
  comments: z.string(), strengths: z.array(z.string()).optional(),
  areasForImprovement: z.array(z.string()).optional(),
});
const createGoalSchema = z.object({
  employeeId: z.string(), title: z.string().min(1), description: z.string(),
  targetDate: z.coerce.date(), cycleId: z.string().optional(),
  keyResults: z.array(z.string()).optional(),
});
const updateGoalProgressSchema = z.object({ goalId: z.string(), progress: z.number().min(0).max(100), notes: z.string().optional() });
const listGoalsSchema = z.object({
  employeeId: z.string(), cycleId: z.string().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  limit: z.number().min(1).max(100).default(10), cursor: z.string().optional(),
});

export const performanceRouter = router({
  listCycles: protectedProcedure.input(listCyclesSchema).query(async ({ ctx, input }) => {
    const { status, limit, cursor } = input;
    let where: any = { companyId: ctx.user.companyId };
    if (status) where.status = status;
    const cycles = await ctx.db.performanceCycle.findMany({
      where, include: { _count: { select: { reviews: true, goals: true } } },
      orderBy: { createdAt: 'desc' }, take: limit + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });
    let nextCursor: typeof cursor | undefined = undefined;
    if (cycles.length > limit) { const nextItem = cycles.pop(); nextCursor = nextItem?.id; }
    return { cycles, nextCursor };
  }),

  createCycle: protectedProcedure.input(createCycleSchema).mutation(async ({ ctx, input }) => {
    if (input.startDate >= input.endDate) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Start date must be before end date' });
    const cycle = await ctx.db.performanceCycle.create({
      data: { ...input, companyId: ctx.user.companyId },
      include: { _count: { select: { reviews: true, goals: true } } },
    });
    return cycle;
  }),

  submitReview: protectedProcedure.input(submitReviewSchema).mutation(async ({ ctx, input }) => {
    const { cycleId, employeeId, rating, comments, strengths, areasForImprovement } = input;
    const cycle = await ctx.db.performanceCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) throw new TRPCError({ code: 'NOT_FOUND', message: 'Performance cycle not found' });
    if (cycle.companyId !== ctx.user.companyId) throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this cycle' });
    const employee = await ctx.db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found' });
    if (employee.companyId !== ctx.user.companyId) throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this employee' });
    const review = await ctx.db.performanceReview.create({
      data: { cycleId, employeeId, reviewerId: ctx.user.employeeId, rating, comments, strengths, areasForImprovement, submittedDate: new Date() },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return review;
  }),

  listGoals: protectedProcedure.input(listGoalsSchema).query(async ({ ctx, input }) => {
    const { employeeId, cycleId, status, limit, cursor } = input;
    const employee = await ctx.db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found' });
    if (employee.companyId !== ctx.user.companyId) throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this employee' });
    let where: any = { employeeId };
    if (cycleId) where.cycleId = cycleId;
    if (status) where.status = status;
    const goals = await ctx.db.goal.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });
    let nextCursor: typeof cursor | undefined = undefined;
    if (goals.length > limit) { const nextItem = goals.pop(); nextCursor = nextItem?.id; }
    return { goals, nextCursor };
  }),

  createGoal: protectedProcedure.input(createGoalSchema).mutation(async ({ ctx, input }) => {
    const { employeeId, title, description, targetDate, cycleId, keyResults } = input;
    const employee = await ctx.db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found' });
    if (employee.companyId !== ctx.user.companyId) throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this employee' });
    if (cycleId) {
      const cycle = await ctx.db.performanceCycle.findUnique({ where: { id: cycleId } });
      if (!cycle) throw new TRPCError({ code: 'NOT_FOUND', message: 'Performance cycle not found' });
      if (cycle.companyId !== ctx.user.companyId) throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this cycle' });
    }
    const goal = await ctx.db.goal.create({
      data: { employeeId, title, description, targetDate, cycleId, keyResults, status: 'ACTIVE', progress: 0, createdDate: new Date() },
    });
    return goal;
  }),

  updateGoalProgress: protectedProcedure.input(updateGoalProgressSchema).mutation(async ({ ctx, input }) => {
    const { goalId, progress, notes } = input;
    const goal = await ctx.db.goal.findUnique({ where: { id: goalId }, include: { employee: true } });
    if (!goal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Goal not found' });
    if (goal.employee.companyId !== ctx.user.companyId) throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this goal' });
    const updated = await ctx.db.goal.update({ where: { id: goalId }, data: { progress, notes, lastUpdated: new Date() } });
    return updated;
  }),
});
