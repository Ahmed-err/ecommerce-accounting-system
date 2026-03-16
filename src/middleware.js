import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isPublicRoute = ["/", "/catalog"].includes(nextUrl.pathname);
  const isAuthRoute = ["/login", "/register"].includes(nextUrl.pathname);
  const isAdminRoute = nextUrl.pathname.startsWith("/admin") || 
                       nextUrl.pathname.startsWith("/inventory") || 
                       nextUrl.pathname.startsWith("/accounting");

  if (isApiAuthRoute) return null;

  if (isAuthRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/", nextUrl));
    }
    return null;
  }

  if (isAdminRoute && !isLoggedIn) {
    return Response.redirect(new URL("/login", nextUrl));
  }

  // Check roles for admin routes
  if (isAdminRoute && isLoggedIn) {
    const user = req.auth?.user;
    if (user?.role !== "ADMIN" && user?.role !== "MANAGER") {
        // Redirect non-admins trying to access admin pages
        return Response.redirect(new URL("/", nextUrl));
    }
  }

  return null;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
