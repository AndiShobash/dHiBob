import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const notificationsRouter = router({
  // Get notifications for current user
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.notification.findMany({
      where: { employeeId: ctx.user.employeeId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }),

  // Unread count
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.notification.count({
      where: { employeeId: ctx.user.employeeId, read: false },
    });
  }),

  // Mark one as read
  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.notification.update({
        where: { id: input.id },
        data: { read: true },
      });
    }),

  // Mark all as read
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.db.notification.updateMany({
      where: { employeeId: ctx.user.employeeId, read: false },
      data: { read: true },
    });
  }),

  // Create notification (used by other routers/actions)
  create: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
      type: z.string(),
      title: z.string(),
      message: z.string().optional(),
      linkUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.notification.create({
        data: {
          companyId: ctx.user.companyId,
          ...input,
        },
      });
    }),
});
