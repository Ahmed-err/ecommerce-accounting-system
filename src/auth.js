import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";

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
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) return null;

        // Support both plain text (seeded) and hashed (registered) passwords
        let isPasswordCorrect = false;
        
        if (user.password.startsWith("$2y$") || user.password.startsWith("$2b$") || user.password.startsWith("$2a$")) {
          // It's a hash, use bcrypt
          const bcrypt = await import("bcryptjs");
          isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);
        } else {
          // It's plain text (seeded data)
          isPasswordCorrect = credentials.password === user.password;
        }

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
