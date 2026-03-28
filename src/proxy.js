import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isAuthRoute = ["/login", "/register", "/forgot-password", "/reset-password"].includes(nextUrl.pathname);
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isPosRoute = nextUrl.pathname.startsWith("/pos");

  if (isApiAuthRoute) return null;

  // Redirect already-logged-in users away from auth pages
  if (isAuthRoute) {
    if (isLoggedIn) {
       if (userRole === "CUSTOMER") return Response.redirect(new URL("/", nextUrl));
       return Response.redirect(new URL("/admin", nextUrl));
    }
    return null;
  }

  // Protect /pos — only staff can access
  if (isPosRoute) {
    if (!isLoggedIn) {
      return Response.redirect(new URL("/login", nextUrl));
    }
    if (!["ADMIN", "MANAGER", "CASHIER"].includes(userRole)) {
      return Response.redirect(new URL("/", nextUrl));
    }
    return null;
  }

  // Protect /admin routes
  if (isAdminRoute) {
    if (!isLoggedIn) {
      return Response.redirect(new URL("/login", nextUrl));
    }

    // Customers cannot access admin
    if (userRole === "CUSTOMER") {
       return Response.redirect(new URL("/", nextUrl));
    }

    // Only ADMINs can access accounting and employees
    if (nextUrl.pathname.startsWith("/admin/employees") || nextUrl.pathname.startsWith("/admin/accounting")) {
       if (userRole !== "ADMIN") {
          return Response.redirect(new URL("/admin", nextUrl));
       }
    }

    // Only ADMINs and MANAGERs can access inventory
    if (nextUrl.pathname.startsWith("/admin/inventory")) {
       if (!["ADMIN", "MANAGER"].includes(userRole)) {
          return Response.redirect(new URL("/admin", nextUrl));
       }
    }

    return null;
  }

  return null;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
