// Auth.js sends failed sign-ins (mostly Google) to /login?error=<code>. Each code becomes a
// plain message the customer can act on, instead of Auth.js's English error page.
const KEYS = {
  AccessDenied: "authErrAccessDenied",
  OAuthAccountNotLinked: "authErrAccountNotLinked",
  AccountNotLinked: "authErrAccountNotLinked",
  Configuration: "authErrGoogleUnavailable",
};

export function authErrorKey(code) {
  if (!code) return null;
  return KEYS[code] || "authErrGoogleFailed";
}
