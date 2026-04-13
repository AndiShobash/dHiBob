import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

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
      return ctx.db.document.update({
        where: { id: input.id, companyId: ctx.user.companyId },
        data: { signatureStatus: 'SIGNED' },
      });
    }),
});
