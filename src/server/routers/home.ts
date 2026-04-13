import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const homeRouter = router({
  createShoutout: protectedProcedure
    .input(z.object({
      content: z.string().min(1),
      targetId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate target employee
      const target = await ctx.db.employee.findUnique({
        where: { id: input.targetId },
        select: { id: true, companyId: true, status: true }
      });

      if (!target) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Target employee not found' });
      }

      if (target.companyId !== ctx.user.companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot shoutout employee from different company' });
      }

      if (target.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot shoutout inactive employee' });
      }

      if (!ctx.user.employeeId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User must be an employee to post shoutouts' });
      }

      // Create the shoutout post
      return ctx.db.post.create({
        data: {
          type: 'SHOUTOUT',
          content: input.content,
          authorId: ctx.user.employeeId,
          targetId: input.targetId,
          companyId: ctx.user.companyId,
        },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          target: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        }
      });
    }),

  getFeed: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const nextSevenDays = new Date();
    nextSevenDays.setDate(today.getDate() + 7);

    // Fetch data concurrently
    const [employees, posts] = await Promise.all([
      ctx.db.employee.findMany({
        where: { companyId: ctx.user.companyId, status: 'ACTIVE' },
        select: { 
          id: true, 
          firstName: true, 
          lastName: true, 
          avatar: true, 
          startDate: true, 
          personalInfo: true, 
          department: { select: { name: true } } 
        },
      }),
      ctx.db.post.findMany({
        where: { companyId: ctx.user.companyId },
        include: { 
          author: { select: { id: true, firstName: true, lastName: true, avatar: true } }, 
          target: { select: { id: true, firstName: true, lastName: true, avatar: true } } 
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const feed: any[] = [];

    // New Joiners (last 30 days)
    employees.filter(e => e.startDate >= thirtyDaysAgo && e.startDate <= today).forEach(e => {
      feed.push({ 
        type: 'NEW_JOINER', 
        date: e.startDate, 
        data: { id: e.id, firstName: e.firstName, lastName: e.lastName, avatar: e.avatar, department: e.department } 
      });
    });

    // Birthdays & Anniversaries
    employees.forEach(e => {
      const start = new Date(e.startDate);
      // Anniversary
      if (start.getMonth() === today.getMonth() && start.getDate() === today.getDate() && start.getFullYear() < today.getFullYear()) {
        feed.push({ 
          type: 'ANNIVERSARY', 
          date: new Date(today.getFullYear(), start.getMonth(), start.getDate()), 
          data: { id: e.id, firstName: e.firstName, lastName: e.lastName, avatar: e.avatar, years: today.getFullYear() - start.getFullYear() } 
        });
      }

      // Birthday
      try {
        const info = JSON.parse(e.personalInfo || '{}');
        if (info.birthday) {
          const bday = new Date(info.birthday);
          const bdayThisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
          if (bdayThisYear >= today && bdayThisYear <= nextSevenDays) {
            feed.push({ 
              type: 'BIRTHDAY', 
              date: bdayThisYear, 
              data: { id: e.id, firstName: e.firstName, lastName: e.lastName, avatar: e.avatar } 
            });
          }
        }
      } catch (err) { /* ignore */ }
    });

    // Shoutouts
    posts.forEach((p: any) => {
      feed.push({ type: 'SHOUTOUT', date: p.createdAt, data: p });
    });

    // Sort by date descending
    return feed.sort((a, b) => b.date.getTime() - a.date.getTime());
  }),
});
