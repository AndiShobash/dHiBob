import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const NOTIFICATION_EVENT_TYPES = [
  'TIMEOFF_REQUEST',
  'TIMEOFF_APPROVED',
  'TIMEOFF_REJECTED',
  'DOCUMENT_SIGNED',
  'DOCUMENT_PENDING_SIGNATURE',
  'EMPLOYEE_UPDATED',
  'TASK_ASSIGNED',
  'SURVEY_PUBLISHED',
  'HR_ANNOUNCEMENT',
  'SYSTEM',
] as const;

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

  // --- Notification Preferences ---

  // Get all preferences for the current user
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const employeeId = ctx.user.employeeId as string;
    return ctx.db.notificationPreference.findMany({
      where: { employeeId },
    });
  }),

  // Upsert a single preference (create or update)
  upsertPreference: protectedProcedure
    .input(z.object({
      eventType: z.string(),
      inApp: z.boolean(),
      email: z.boolean(),
      slack: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const employeeId = ctx.user.employeeId as string;
      return ctx.db.notificationPreference.upsert({
        where: {
          employeeId_eventType: {
            employeeId,
            eventType: input.eventType,
          },
        },
        create: {
          employeeId,
          eventType: input.eventType,
          inApp: input.inApp,
          email: input.email,
          slack: input.slack,
        },
        update: {
          inApp: input.inApp,
          email: input.email,
          slack: input.slack,
        },
      });
    }),

  // Reset all preferences to defaults (delete all preference rows)
  resetPreferences: protectedProcedure.mutation(async ({ ctx }) => {
    const employeeId = ctx.user.employeeId as string;
    return ctx.db.notificationPreference.deleteMany({
      where: { employeeId },
    });
  }),
});
