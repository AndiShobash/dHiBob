import { initTRPC, TRPCError } from '@trpc/server';
import { type Session } from 'next-auth';
import { prisma } from '@/lib/db';

export type Context = { session: Session | null; db: typeof prisma; };
const t = initTRPC.context<Context>().create();
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { session: ctx.session, db: ctx.db, user: ctx.session.user } });
});
export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
