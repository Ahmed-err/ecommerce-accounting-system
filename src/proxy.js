import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { logger } from "@/lib/logger";
import { canOpen, staffHome } from "@/lib/staff-access";

const { auth } = NextAuth(authConfig);

// Sends people to login with a way back to the page they asked for.
function loginUrl(nextUrl) {
  const url = new URL("/login", nextUrl);
  url.searchParams.set("callbackUrl", `${nextUrl.pathname}${nextUrl.search}`);
  return url;
}

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
    if (isLoggedIn) return Response.redirect(new URL(staffHome(userRole), nextUrl));
    return null;
  }

  // Staff pages: sign-in first, then the role must be allowed to open this page.
  if (isAdminRoute || isPosRoute) {
    if (!isLoggedIn) {
      logger.warn("proxy_blocked", { requestId, path, reason: "unauthenticated_staff" });
      return Response.redirect(loginUrl(nextUrl));
    }
    if (!canOpen(userRole, path)) {
      logger.warn("proxy_blocked", { requestId, path, reason: "role_not_allowed", userRole });
      return Response.redirect(new URL(staffHome(userRole), nextUrl));
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
