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
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
            manager: {
              select: {
                id: true, firstName: true, lastName: true,
                manager: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
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

    // Attach approver name snapshots so My Requests can show approval progress.
    // Fall back to the employee's current manager chain for legacy requests
    // that predate the snapshot columns.
    const leaderIds = new Set<string>();
    for (const r of requests) {
      if (r.teamLeaderId) leaderIds.add(r.teamLeaderId);
      if (r.groupLeaderId) leaderIds.add(r.groupLeaderId);
      if (r.hrApprovedBy) leaderIds.add(r.hrApprovedBy);
      if (r.teamLeaderApprovedBy) leaderIds.add(r.teamLeaderApprovedBy);
      if (r.groupLeaderApprovedBy) leaderIds.add(r.groupLeaderApprovedBy);
    }
    const leaders = leaderIds.size
      ? await ctx.db.employee.findMany({
          where: { id: { in: Array.from(leaderIds) } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const leaderMap = Object.fromEntries(leaders.map(l => [l.id, `${l.firstName} ${l.lastName}`]));
    const enriched = requests.map(r => {
      const currentManager = r.employee.manager;
      const currentSkipLevel = r.employee.manager?.manager;
      const effectiveTeamLeaderId = r.teamLeaderId ?? currentManager?.id ?? null;
      const effectiveGroupLeaderId = r.groupLeaderId ?? currentSkipLevel?.id ?? null;
      const teamLeaderName = effectiveTeamLeaderId
        ? leaderMap[effectiveTeamLeaderId] ?? (currentManager ? `${currentManager.firstName} ${currentManager.lastName}` : null)
        : null;
      const groupLeaderName = effectiveGroupLeaderId
        ? leaderMap[effectiveGroupLeaderId] ?? (currentSkipLevel ? `${currentSkipLevel.firstName} ${currentSkipLevel.lastName}` : null)
        : null;
      return {
        ...r,
        teamLeaderName,
        groupLeaderName,
        hrApprovedByName: r.hrApprovedBy ? leaderMap[r.hrApprovedBy] ?? null : null,
        teamLeaderApprovedByName: r.teamLeaderApprovedBy ? leaderMap[r.teamLeaderApprovedBy] ?? null : null,
        groupLeaderApprovedByName: r.groupLeaderApprovedBy ? leaderMap[r.groupLeaderApprovedBy] ?? null : null,
      };
    });
    return { requests: enriched, nextCursor };
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
    const employee = await ctx.db.employee.findUnique({
      where: { id: employeeId },
      include: { manager: true },
    });
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

    // Resolve approvers: team leader = direct manager; group leader = manager's manager
    const teamLeaderId = employee.managerId ?? null;
    let groupLeaderId: string | null = null;
    if (employee.manager?.managerId) {
      groupLeaderId = employee.manager.managerId;
    }
    // Avoid self-approval: employee's manager cannot act as group leader via chain
    if (groupLeaderId === teamLeaderId) groupLeaderId = null;

    // Find HR users in company (any user with HR/ADMIN/SUPER_ADMIN role)
    const hrUsers = await ctx.db.user.findMany({
      where: {
        role: { in: ['HR', 'ADMIN', 'SUPER_ADMIN'] },
        employee: { companyId: ctx.user.companyId },
      },
      select: { employeeId: true },
    });
    const hrEmployeeIds = hrUsers.map(u => u.employeeId).filter((id): id is string => !!id);
    const hasHr = hrEmployeeIds.length > 0;

    const request = await ctx.db.timeOffRequest.create({
      data: {
        employeeId,
        policyId,
        startDate,
        endDate,
        days,
        reason,
        status: 'PENDING',
        hrStatus: hasHr ? 'PENDING' : 'SKIPPED',
        teamLeaderId,
        teamLeaderStatus: teamLeaderId ? 'PENDING' : 'SKIPPED',
        groupLeaderId,
        groupLeaderStatus: groupLeaderId ? 'PENDING' : 'SKIPPED',
      },
      include: { employee: true, policy: true },
    });

    // If nothing to approve (no HR, no managers), auto-approve
    if (!hasHr && !teamLeaderId && !groupLeaderId) {
      await ctx.db.timeOffRequest.update({
        where: { id: request.id },
        data: { status: 'APPROVED', reviewedBy: ctx.user.employeeId ?? null, reviewedAt: new Date() },
      });
    } else {
      // Notify approvers
      const recipients = new Set<string>();
      hrEmployeeIds.forEach(id => recipients.add(id));
      if (teamLeaderId) recipients.add(teamLeaderId);
      if (groupLeaderId) recipients.add(groupLeaderId);
      recipients.delete(employeeId); // don't notify the requester themselves

      if (recipients.size > 0) {
        await ctx.db.notification.createMany({
          data: Array.from(recipients).map(recipientId => ({
            companyId: ctx.user.companyId,
            employeeId: recipientId,
            type: 'TIMEOFF_REQUEST',
            title: `${employee.firstName} ${employee.lastName} requested time off`,
            message: `${policy.name} · ${days} day(s) · ${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`,
            linkUrl: '/time-off',
          })),
        });
      }
    }

    return request;
  }),

  approve: protectedProcedure.input(approveRejectSchema).mutation(async ({ ctx, input }) => {
    const request = await ctx.db.timeOffRequest.findUnique({
      where: { id: input.requestId },
      include: {
        employee: { include: { manager: { include: { manager: true } } } },
        policy: true,
      },
    });
    if (!request) throw new TRPCError({ code: 'NOT_FOUND', message: 'Request not found' });
    if (request.employee.companyId !== ctx.user.companyId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this request' });
    }
    if (request.status !== 'PENDING') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Request is not pending' });
    }

    const actorEmployeeId = ctx.user.employeeId;
    const isHrRole = ['HR', 'ADMIN', 'SUPER_ADMIN'].includes(ctx.user.role);
    // Fall back to the employee's current manager chain for legacy requests with null snapshots
    const effectiveTeamLeaderId = request.teamLeaderId ?? request.employee.managerId ?? null;
    const effectiveGroupLeaderId = request.groupLeaderId ?? request.employee.manager?.managerId ?? null;
    const isTeamLeader = !!actorEmployeeId && actorEmployeeId === effectiveTeamLeaderId;
    const isGroupLeader = !!actorEmployeeId && actorEmployeeId === effectiveGroupLeaderId;

    if (!isHrRole && !isTeamLeader && !isGroupLeader) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not authorized to approve this request' });
    }

    const now = new Date();
    const data: Record<string, unknown> = {};
    if (isHrRole && request.hrStatus === 'PENDING') {
      data.hrStatus = 'APPROVED';
      data.hrApprovedBy = actorEmployeeId;
      data.hrApprovedAt = now;
    }
    if (isTeamLeader && request.teamLeaderStatus === 'PENDING') {
      data.teamLeaderStatus = 'APPROVED';
      data.teamLeaderApprovedBy = actorEmployeeId;
      data.teamLeaderApprovedAt = now;
      if (!request.teamLeaderId && effectiveTeamLeaderId) data.teamLeaderId = effectiveTeamLeaderId;
    }
    if (isGroupLeader && request.groupLeaderStatus === 'PENDING') {
      data.groupLeaderStatus = 'APPROVED';
      data.groupLeaderApprovedBy = actorEmployeeId;
      data.groupLeaderApprovedAt = now;
      if (!request.groupLeaderId && effectiveGroupLeaderId) data.groupLeaderId = effectiveGroupLeaderId;
    }
    if (Object.keys(data).length === 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No pending slots for you to approve' });
    }

    // Recompute overall status
    const hr = (data.hrStatus as string) ?? request.hrStatus;
    const tl = (data.teamLeaderStatus as string) ?? request.teamLeaderStatus;
    const gl = (data.groupLeaderStatus as string) ?? request.groupLeaderStatus;
    const allResolved = [hr, tl, gl].every(s => s === 'APPROVED' || s === 'SKIPPED');
    if (allResolved) {
      data.status = 'APPROVED';
      data.reviewedBy = actorEmployeeId ?? null;
      data.reviewedAt = now;
    }

    const updated = await ctx.db.timeOffRequest.update({
      where: { id: input.requestId },
      data,
      include: { employee: true, policy: true },
    });

    if (allResolved) {
      await ctx.db.notification.create({
        data: {
          companyId: ctx.user.companyId,
          employeeId: request.employeeId,
          type: 'TIMEOFF_APPROVED',
          title: `Your time off request was approved`,
          message: `${request.policy.name} · ${request.startDate.toISOString().slice(0, 10)} to ${request.endDate.toISOString().slice(0, 10)}`,
          linkUrl: '/time-off',
        },
      });
    }

    return updated;
  }),

  reject: protectedProcedure.input(approveRejectSchema).mutation(async ({ ctx, input }) => {
    const request = await ctx.db.timeOffRequest.findUnique({
      where: { id: input.requestId },
      include: {
        employee: { include: { manager: { include: { manager: true } } } },
        policy: true,
      },
    });
    if (!request) throw new TRPCError({ code: 'NOT_FOUND', message: 'Request not found' });
    if (request.employee.companyId !== ctx.user.companyId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this request' });
    }
    if (request.status !== 'PENDING') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Request is not pending' });
    }

    const actorEmployeeId = ctx.user.employeeId;
    const isHrRole = ['HR', 'ADMIN', 'SUPER_ADMIN'].includes(ctx.user.role);
    const effectiveTeamLeaderId = request.teamLeaderId ?? request.employee.managerId ?? null;
    const effectiveGroupLeaderId = request.groupLeaderId ?? request.employee.manager?.managerId ?? null;
    const isTeamLeader = !!actorEmployeeId && actorEmployeeId === effectiveTeamLeaderId;
    const isGroupLeader = !!actorEmployeeId && actorEmployeeId === effectiveGroupLeaderId;

    if (!isHrRole && !isTeamLeader && !isGroupLeader) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not authorized to reject this request' });
    }

    const now = new Date();
    const data: Record<string, unknown> = {
      status: 'REJECTED',
      reviewedBy: actorEmployeeId ?? null,
      reviewedAt: now,
    };
    if (isHrRole && request.hrStatus === 'PENDING') {
      data.hrStatus = 'REJECTED';
      data.hrApprovedBy = actorEmployeeId;
      data.hrApprovedAt = now;
    }
    if (isTeamLeader && request.teamLeaderStatus === 'PENDING') {
      data.teamLeaderStatus = 'REJECTED';
      data.teamLeaderApprovedBy = actorEmployeeId;
      data.teamLeaderApprovedAt = now;
      if (!request.teamLeaderId && effectiveTeamLeaderId) data.teamLeaderId = effectiveTeamLeaderId;
    }
    if (isGroupLeader && request.groupLeaderStatus === 'PENDING') {
      data.groupLeaderStatus = 'REJECTED';
      data.groupLeaderApprovedBy = actorEmployeeId;
      data.groupLeaderApprovedAt = now;
      if (!request.groupLeaderId && effectiveGroupLeaderId) data.groupLeaderId = effectiveGroupLeaderId;
    }

    const updated = await ctx.db.timeOffRequest.update({
      where: { id: input.requestId },
      data,
      include: { employee: true, policy: true },
    });

    await ctx.db.notification.create({
      data: {
        companyId: ctx.user.companyId,
        employeeId: request.employeeId,
        type: 'TIMEOFF_REJECTED',
        title: `Your time off request was rejected`,
        message: `${request.policy.name} · ${request.startDate.toISOString().slice(0, 10)} to ${request.endDate.toISOString().slice(0, 10)}`,
        linkUrl: '/time-off',
      },
    });

    return updated;
  }),

  // Returns pending requests the current user can act on (HR, direct manager, or skip-level manager).
  // Uses snapshotted leader IDs when present, otherwise falls back to the employee's current manager chain.
  listMyApprovals: protectedProcedure.query(async ({ ctx }) => {
    const actorEmployeeId = ctx.user.employeeId;
    const isHrRole = ['HR', 'ADMIN', 'SUPER_ADMIN'].includes(ctx.user.role);

    const orConditions: any[] = [];
    if (isHrRole) orConditions.push({ hrStatus: 'PENDING' });
    if (actorEmployeeId) {
      // Snapshotted leader match
      orConditions.push({ teamLeaderId: actorEmployeeId, teamLeaderStatus: 'PENDING' });
      orConditions.push({ groupLeaderId: actorEmployeeId, groupLeaderStatus: 'PENDING' });
      // Fallback: requester has no snapshot but their current manager chain includes the actor
      orConditions.push({ teamLeaderId: null, teamLeaderStatus: 'PENDING', employee: { managerId: actorEmployeeId } });
      orConditions.push({ groupLeaderId: null, groupLeaderStatus: 'PENDING', employee: { manager: { managerId: actorEmployeeId } } });
    }
    if (orConditions.length === 0) return [];

    const requests = await ctx.db.timeOffRequest.findMany({
      where: {
        status: 'PENDING',
        employee: { companyId: ctx.user.companyId },
        OR: orConditions,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
            manager: {
              select: {
                id: true, firstName: true, lastName: true,
                manager: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
        policy: { select: { id: true, name: true, type: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const leaderIds = new Set<string>();
    for (const r of requests) {
      if (r.teamLeaderId) leaderIds.add(r.teamLeaderId);
      if (r.groupLeaderId) leaderIds.add(r.groupLeaderId);
      if (r.hrApprovedBy) leaderIds.add(r.hrApprovedBy);
      if (r.teamLeaderApprovedBy) leaderIds.add(r.teamLeaderApprovedBy);
      if (r.groupLeaderApprovedBy) leaderIds.add(r.groupLeaderApprovedBy);
    }
    const leaders = leaderIds.size
      ? await ctx.db.employee.findMany({
          where: { id: { in: Array.from(leaderIds) } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const leaderMap = Object.fromEntries(leaders.map(l => [l.id, `${l.firstName} ${l.lastName}`]));

    return requests.map(r => {
      const currentManager = r.employee.manager;
      const currentSkipLevel = r.employee.manager?.manager;
      const effectiveTeamLeaderId = r.teamLeaderId ?? currentManager?.id ?? null;
      const effectiveGroupLeaderId = r.groupLeaderId ?? currentSkipLevel?.id ?? null;
      const teamLeaderName = effectiveTeamLeaderId
        ? leaderMap[effectiveTeamLeaderId] ?? (currentManager ? `${currentManager.firstName} ${currentManager.lastName}` : null)
        : null;
      const groupLeaderName = effectiveGroupLeaderId
        ? leaderMap[effectiveGroupLeaderId] ?? (currentSkipLevel ? `${currentSkipLevel.firstName} ${currentSkipLevel.lastName}` : null)
        : null;
      return {
        ...r,
        teamLeaderName,
        groupLeaderName,
        hrApprovedByName: r.hrApprovedBy ? leaderMap[r.hrApprovedBy] ?? null : null,
        teamLeaderApprovedByName: r.teamLeaderApprovedBy ? leaderMap[r.teamLeaderApprovedBy] ?? null : null,
        groupLeaderApprovedByName: r.groupLeaderApprovedBy ? leaderMap[r.groupLeaderApprovedBy] ?? null : null,
        canActAsHr: isHrRole && r.hrStatus === 'PENDING',
        canActAsTeamLeader: !!actorEmployeeId && effectiveTeamLeaderId === actorEmployeeId && r.teamLeaderStatus === 'PENDING',
        canActAsGroupLeader: !!actorEmployeeId && effectiveGroupLeaderId === actorEmployeeId && r.groupLeaderStatus === 'PENDING',
      };
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
