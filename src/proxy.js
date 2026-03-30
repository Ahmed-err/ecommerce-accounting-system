import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { logger } from "@/lib/logger";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const path = nextUrl.pathname;
  const userId = req.auth?.user?.id || null;
  const userRole = req.auth?.user?.role;
  logger.info("proxy_request", { requestId, path, userId, userRole });

  const isLoggedIn = !!req.auth;

  const isAuthRoute = ["/login", "/register", "/forgot-password", "/reset-password"].includes(nextUrl.pathname);
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isPosRoute = nextUrl.pathname.startsWith("/pos");

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
      logger.warn("proxy_blocked", { requestId, path, reason: "unauthenticated_pos" });
      return Response.redirect(new URL("/login", nextUrl));
    }
    if (!["ADMIN", "MANAGER", "CASHIER"].includes(userRole)) {
      logger.warn("proxy_blocked", { requestId, path, reason: "forbidden_pos_role", userRole });
      return Response.redirect(new URL("/", nextUrl));
    }
    return null;
  }

  // Protect /admin routes
  if (isAdminRoute) {
    if (!isLoggedIn) {
      logger.warn("proxy_blocked", { requestId, path, reason: "unauthenticated_admin" });
      return Response.redirect(new URL("/login", nextUrl));
    }

    // Customers cannot access admin
    if (userRole === "CUSTOMER") {
       logger.warn("proxy_blocked", { requestId, path, reason: "customer_admin_access" });
       return Response.redirect(new URL("/", nextUrl));
    }

    // Only ADMINs can access accounting and employees
    if (nextUrl.pathname.startsWith("/admin/employees") || nextUrl.pathname.startsWith("/admin/accounting")) {
       if (userRole !== "ADMIN") {
          logger.warn("proxy_blocked", { requestId, path, reason: "admin_only_section", userRole });
          return Response.redirect(new URL("/admin", nextUrl));
       }
    }

    // Only ADMINs and MANAGERs can access inventory
    if (nextUrl.pathname.startsWith("/admin/inventory")) {
       if (!["ADMIN", "MANAGER"].includes(userRole)) {
          logger.warn("proxy_blocked", { requestId, path, reason: "inventory_role_restricted", userRole });
          return Response.redirect(new URL("/admin", nextUrl));
       }
    }

    return null;
  }

  return null;
});

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/pos",
    "/pos/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
