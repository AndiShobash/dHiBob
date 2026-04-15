import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

function requireHr(role: string) {
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'HR') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Only HR/Admin can edit the portal' });
  }
}

const itemSchema = z.object({
  type: z.enum(['LINK', 'ANNOUNCEMENT', 'FILE']),
  section: z.string().min(1),
  title: z.string().min(1),
  content: z.string().optional(),
  url: z.string().optional(),
  fileName: z.string().optional(),
  fileData: z.string().optional(),
  pinned: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export const hrPortalRouter = router({
  // All employees can view
  list: protectedProcedure.query(async ({ ctx }) => {
    const items = await ctx.db.hrPortalItem.findMany({
      where: { companyId: ctx.user.companyId },
      include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
      orderBy: [{ pinned: 'desc' }, { section: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    // Group by section
    const sectionMap = new Map<string, typeof items>();
    for (const item of items) {
      if (!sectionMap.has(item.section)) sectionMap.set(item.section, []);
      sectionMap.get(item.section)!.push(item);
    }
    return Array.from(sectionMap.entries()).map(([section, items]) => ({ section, items }));
  }),

  // HR/Admin only — create
  create: protectedProcedure
    .input(itemSchema)
    .mutation(async ({ ctx, input }) => {
      requireHr(ctx.user.role);
      return ctx.db.hrPortalItem.create({
        data: {
          companyId: ctx.user.companyId,
          authorId: ctx.user.employeeId!,
          type: input.type,
          section: input.section,
          title: input.title,
          content: input.content,
          url: input.url,
          fileName: input.fileName,
          fileData: input.fileData,
          pinned: input.pinned ?? false,
          sortOrder: input.sortOrder ?? 0,
        },
      });
    }),

  // HR/Admin only — update
  update: protectedProcedure
    .input(z.object({ id: z.string() }).merge(itemSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      requireHr(ctx.user.role);
      const item = await ctx.db.hrPortalItem.findUnique({ where: { id: input.id } });
      if (!item || item.companyId !== ctx.user.companyId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' });
      }
      const { id, ...data } = input;
      return ctx.db.hrPortalItem.update({ where: { id }, data });
    }),

  // HR/Admin only — delete
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireHr(ctx.user.role);
      const item = await ctx.db.hrPortalItem.findUnique({ where: { id: input.id } });
      if (!item || item.companyId !== ctx.user.companyId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' });
      }
      return ctx.db.hrPortalItem.delete({ where: { id: input.id } });
    }),
});
