import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { checkRateLimit } from "@/lib/rate-limit";
import { canSignIn, refreshAuthToken } from "@/lib/auth-session-guard";
import { accountLookupWhere } from "@/lib/auth-identity";
import { cachedQuery } from "@/lib/cached-query";
import { CACHE_TTL, TAGS } from "@/lib/cache-tags";

// Account state the JWT callback re-checks every few minutes for every signed-in user (each
// POS tablet included). Cached and cleared by any User write, so deactivating someone, changing
// a role or a password still takes effect on their next request, while idle sessions no longer
// wake the database. Dates come back as ISO strings; refreshAuthToken handles both.
const loadAuthUserState = cachedQuery(
  (id) =>
    prisma.user.findUnique({
      where: { id },
      select: { role: true, isActive: true, accountDeletedAt: true, passwordChangedAt: true },
    }),
  ["auth-user-state-v1"],
  { tags: [TAGS.authUsers], revalidate: CACHE_TTL.authUsers }
);

const googleId = process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.GOOGLE_CLIENT_SECRET;

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  basePath: "/api/auth",
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Covers Google sign-in; credentials are checked in authorize().
    async signIn({ user }) {
      return canSignIn(user);
    },
    async jwt(params) {
      const token = await authConfig.callbacks.jwt(params);
      if (params.user) return { ...token, issuedAt: Date.now(), checkedAt: Date.now() };
      return refreshAuthToken(token, loadAuthUserState);
    },
  },
  providers: [
    ...(googleId && googleSecret
      ? [
          Google({
            clientId: googleId,
            clientSecret: googleSecret,
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const identifier = String(credentials.email).trim();

        const rateKey = `login_${identifier.toLowerCase()}`;
        const allowed = await checkRateLimit(rateKey, 10, 15 * 60 * 1000, { failClosed: true });
        if (!allowed) {
            throw new Error("Too many login attempts. Please try again later.");
        }

        const where = accountLookupWhere(identifier);
        if (!where) return null;
        const user = await prisma.user.findFirst({ where });

        if (!user || !user.password) return null;

        if (!canSignIn(user)) return null;

        // Always require hashed passwords - plain text fallback removed for security
        if (!user.password.startsWith("$2y$") && !user.password.startsWith("$2b$") && !user.password.startsWith("$2a$")) {
            console.warn(`[SECURITY] User ${user.email} has non-hashed password. Login denied.`);
            return null;
        }

        const bcrypt = await import("bcryptjs");
        const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordCorrect) return null;

        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
          image: user.avatar,
        };
      },
    }),
  ],
});

export const { GET, POST } = handlers;
