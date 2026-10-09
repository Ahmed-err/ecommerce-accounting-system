// Shared rules for reading what people type as their email or phone, so sign-up,
// login and password reset all find the same account.

export function normalizeEmail(input) {
  return String(input || "").trim().toLowerCase();
}

/**
 * Sudan numbers (09…, 01…, 9…, +249…, 00249…) get one canonical form, +249XXXXXXXXX.
 * `variants` also lists the forms older sign-ups were saved in (+09…, 09…, +9…), so
 * existing accounts keep matching without touching their data. Other international
 * numbers are kept as typed (digits with a leading +). Returns null for anything else.
 */
export function phoneVariants(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (!/^\+?\d{8,15}$/.test(digits)) return null;
  digits = digits.replace(/^\+/, "").replace(/^00/, "");

  const national =
    digits.match(/^249([19]\d{8})$/)?.[1] ||
    digits.match(/^0([19]\d{8})$/)?.[1] ||
    digits.match(/^([19]\d{8})$/)?.[1];

  if (national) {
    const canonical = `+249${national}`;
    return { canonical, variants: [canonical, `+0${national}`, `0${national}`, `+${national}`] };
  }
  const canonical = `+${digits}`;
  return { canonical, variants: [canonical] };
}

const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

/** True for a same-site path to send someone back to after login. */
export function isSafeCallbackPath(path) {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
  const pathname = path.split(/[?#]/)[0];
  return !AUTH_PAGES.includes(pathname);
}

/**
 * Prisma `where` that finds the account someone means by an email or phone number,
 * ignoring email case and phone format. Null when the input is neither.
 */
export function accountLookupWhere(identifier) {
  const raw = String(identifier || "").trim();
  if (!raw) return null;
  if (raw.includes("@")) return { email: { equals: normalizeEmail(raw), mode: "insensitive" } };
  const phone = phoneVariants(raw);
  return phone ? { phone: { in: phone.variants } } : null;
}

/** Sign-up and reset password rule: 8+ characters with an upper-case letter, a lower-case letter and a digit. */
export function isStrongPassword(password) {
  const p = String(password || "");
  return p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p);
}
