import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { effectiveRoles } from "./roles";
import * as bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { profile: true },
        });

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          roles: user.roles,
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        (token as any).realUserId = user.id;
      }
      if (!(token as any).realUserId && token.id) (token as any).realUserId = token.id;

      // Suplantación (solo lectura): solo un admin real puede activarla; cualquiera
      // puede desactivarla. Se gatilla con update({ impersonate: id | null }).
      if (trigger === "update") {
        const data = session as { impersonate?: string | null } | undefined;
        if (data && "impersonate" in data) {
          if (data.impersonate === null) {
            delete (token as any).impersonatedUserId;
          } else if (typeof data.impersonate === "string") {
            const realId = ((token as any).realUserId as string) ?? (token.id as string);
            const real = await prisma.user.findUnique({
              where: { id: realId },
              select: { isAdmin: true },
            });
            if (real?.isAdmin && data.impersonate !== realId) {
              (token as any).impersonatedUserId = data.impersonate;
            }
          }
        }
      }

      const realId = ((token as any).realUserId as string) ?? (token.id as string);
      const impersonatedId = (token as any).impersonatedUserId as string | undefined;
      const effectiveId = impersonatedId ?? realId;

      if (effectiveId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: effectiveId },
          select: {
            email: true,
            name: true,
            image: true,
            roles: true,
            isAdmin: true,
            membershipPeriods: { select: { role: true, startDate: true, endDate: true } },
          },
        });
        if (dbUser) {
          // Identidad efectiva = usuario suplantado si lo hay, si no el real. Así
          // toda la app (cliente y servidor) ve lo que vería esa persona.
          token.id = effectiveId;
          token.email = dbUser.email;
          token.name = dbUser.name;
          token.picture = dbUser.image ?? null;
          token.roles = effectiveRoles(dbUser.roles, dbUser.membershipPeriods);
          token.isAdmin = dbUser.isAdmin;
        }
      }

      // Estado de suplantación para el banner y el gating del admin real.
      (token as any).impersonating = Boolean(impersonatedId);
      if (impersonatedId) {
        const real = await prisma.user.findUnique({
          where: { id: realId },
          select: { isAdmin: true, name: true },
        });
        (token as any).realIsAdmin = real?.isAdmin ?? false;
        (token as any).realName = real?.name ?? null;
      } else {
        (token as any).realIsAdmin = token.isAdmin;
        (token as any).realName = token.name ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).roles = token.roles;
        (session.user as any).isAdmin = token.isAdmin;
        session.user.image = token.picture as string | undefined;
        if (token.email) session.user.email = token.email as string;
        if (token.name) session.user.name = token.name as string;
        (session.user as any).impersonating = (token as any).impersonating ?? false;
        (session.user as any).realIsAdmin = (token as any).realIsAdmin ?? token.isAdmin;
        (session.user as any).realName = (token as any).realName ?? null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
