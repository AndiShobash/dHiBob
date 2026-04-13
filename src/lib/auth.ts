import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from './db';
import { redisClient } from './redis';

const SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null;
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { employee: { include: { company: true } } },
          });
          if (!user) return null;
          const isValid = await compare(credentials.password, user.passwordHash);
          if (!isValid) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.employee
              ? `${user.employee.firstName} ${user.employee.lastName}`
              : user.email,
            role: user.role,
            employeeId: user.employee?.id,
            companyId: user.employee?.companyId ?? '',
          };
        } catch (error) {
          console.error('[auth] authorize error:', error);
          return null;
        }
      },
    }),
  ],
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.companyId = user.companyId;
        token.employeeId = user.employeeId;
        // Cache active session in Redis for blocklist/audit support
        try {
          const redis = await redisClient();
          await redis.set(
            `session:${user.id}`,
            JSON.stringify({ companyId: user.companyId, role: user.role }),
            'EX',
            SESSION_TTL,
          );
        } catch {
          // Redis unavailable — auth still proceeds (non-blocking)
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? '';
        session.user.role = token.role as string;
        session.user.companyId = token.companyId as string;
        session.user.employeeId = token.employeeId as string | undefined;
      }
      return session;
    },
  },
  session: { strategy: 'jwt', maxAge: SESSION_TTL },
  secret: process.env.NEXTAUTH_SECRET,
};
