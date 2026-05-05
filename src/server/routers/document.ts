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

  createForSignature: protectedProcedure
    .input(z.object({
      name: z.string(),
      filePath: z.string(),
      employeeId: z.string(),
      type: z.string().default('CONTRACT'),
      folder: z.string().default('contracts'),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.document.create({
        data: {
          name: input.name,
          filePath: input.filePath,
          employeeId: input.employeeId,
          type: input.type,
          folder: input.folder,
          companyId: ctx.user.companyId,
          uploadedBy: ctx.user.employeeId || ctx.user.id,
          fileSize: 0,
          mimeType: 'application/pdf',
        },
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
          linkUrl: `/people/${doc.employeeId}`,
        });
      }

      return doc;
    }),
});
