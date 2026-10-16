export const authConfig = {
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      if (!token.id && token.sub) {
        token.id = token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id || token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    // Failed Google sign-ins come back to the login page with ?error=, shown in plain words
    // (lib/auth-errors.js) instead of Auth.js's English error page.
    error: "/login",
  },
};
