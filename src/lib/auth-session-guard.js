// Account state checks shared by sign-in and the JWT callback. Sessions use the JWT
// strategy, so without a periodic re-check a deactivated or demoted user would keep
// their old role until the token expires.

export const AUTH_RECHECK_MS = 5 * 60 * 1000;

export function canSignIn(user) {
  return Boolean(user) && user.isActive !== false && !user.accountDeletedAt;
}

/**
 * Re-reads role and active state at most every AUTH_RECHECK_MS.
 * Returns null (Auth.js then clears the session) when the account can no longer sign in.
 * A failed lookup keeps the token, so a database blip does not sign everyone out.
 */
export async function refreshAuthToken(token, loadUser, now = Date.now()) {
  if (!token?.id) return token;
  if (token.checkedAt && now - token.checkedAt < AUTH_RECHECK_MS) return token;

  let user;
  try {
    user = await loadUser(token.id);
  } catch (error) {
    console.error("[AUTH] Session re-check failed:", error);
    return token;
  }

  if (!canSignIn(user)) return null;
  return { ...token, role: user.role, checkedAt: now };
}
