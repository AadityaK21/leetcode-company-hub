import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config: no Prisma, no bcrypt. Used by middleware.
 * The full config (adapter + credentials) lives in auth.ts.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 14 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const protectedPaths = [
        "/dashboard",
        "/bookmarks",
        "/revisions",
        "/settings",
        "/admin",
      ];
      const isProtected = protectedPaths.some((p) =>
        request.nextUrl.pathname.startsWith(p)
      );
      return isProtected ? !!auth?.user : true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "USER" | "ADMIN") ?? "USER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
