import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { notifyService } from '@/lib/notify-service';

export const documentRouter = router({
  list: protectedProcedure
    .input(z.object({
      employeeId: z.string().optional(),
      folder: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.document.findMany({
        where: {
          companyId: ctx.user.companyId,
          ...(input.employeeId && { employeeId: input.employeeId }),
          ...(input.folder && { folder: input.folder }),
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

  sign: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db.document.update({
        where: { id: input.id, companyId: ctx.user.companyId },
        data: { signatureStatus: 'SIGNED' },
      });

      // Notify the document owner that their document was signed
      if (doc.employeeId && doc.employeeId !== ctx.user.employeeId) {
        await notifyService.send({
          companyId: ctx.user.companyId,
          recipients: [doc.employeeId],
          eventType: 'DOCUMENT_SIGNED',
          title: `Document "${doc.name}" has been signed`,
          message: 'Your document has been signed successfully.',
          linkUrl: '/documents',
        });
      }

      return doc;
    }),
});
