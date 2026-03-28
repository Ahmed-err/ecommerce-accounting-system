import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { checkRateLimit } from "@/lib/rate-limit";

export const { 
  handlers: { GET, POST }, 
  auth, 
  signIn, 
  signOut 
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
  providers: [
    Google({
       clientId: process.env.GOOGLE_CLIENT_ID,
       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
       allowDangerousEmailAccountLinking: false,
    }),
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const rateKey = `login_${credentials.email}`;
        const allowed = await checkRateLimit(rateKey, 10, 15 * 60 * 1000, { failClosed: true });
        if (!allowed) {
            throw new Error("Too many login attempts. Please try again later.");
        }

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: credentials.email },
              { phone: credentials.email } // Assuming 'email' field in form is used for both
            ]
          },
        });

        if (!user || !user.password) return null;

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
