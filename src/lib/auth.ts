import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) throw new Error('Invalid credentials');
        const user = await prisma.user.findUnique({ where: { email: credentials.email }, include: { employee: { include: { company: true } } } });
        if (!user) throw new Error('No user found');
        const isValid = await compare(credentials.password, user.password);
        if (!isValid) throw new Error('Invalid password');
        return { id: user.id, email: user.email, name: user.name, role: user.role, employeeId: user.employee?.id, companyId: user.employee?.companyId };
      },
    }),
  ],
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) { if (user) { token.role = user.role; } return token; },
    async session({ session, token }) { if (session.user) { session.user.id = token.sub || ''; session.user.role = token.role as string; } return session; },
  },
  session: { strategy: 'jwt', maxAge: 30*24*60*60 },
  secret: process.env.NEXTAUTH_SECRET,
};
