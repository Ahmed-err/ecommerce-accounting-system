"use server";

import { createHash, randomUUID } from "node:crypto";
import { prisma as db } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendResetEmail, sendResetSMS } from "@/lib/senders";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { accountLookupWhere, isStrongPassword } from "@/lib/auth-identity";

// Only a hash of the reset token is stored, so a database read can't be used to reset passwords.
const hashToken = (token) => createHash("sha256").update(String(token || "")).digest("hex");

// Errors are codes; the pages show them in the visitor's language.
export async function requestPasswordReset(identifier) {
  try {
    const raw = String(identifier || "").trim();
    const ip = await getClientIP();
    const [idAllowed, ipAllowed] = await Promise.all([
      checkRateLimit(`reset_${raw.toLowerCase()}`, 5, 15 * 60 * 1000),
      checkRateLimit(`reset_ip_${ip}`, 10, 15 * 60 * 1000),
    ]);
    if (!idAllowed || !ipAllowed) {
      console.warn(`[SECURITY] Rate limit on password reset for: ${raw.toLowerCase()}`);
      return { success: false, error: "rate_limited" };
    }

    const where = accountLookupWhere(raw);
    const user = where ? await db.user.findFirst({ where }) : null;
    // Same answer whether or not the account exists.
    if (!user?.email) return { success: true };

    const token = randomUUID();
    await db.verificationToken.create({
      data: { identifier: user.email, token: hashToken(token), expires: new Date(Date.now() + 3600000) },
    });

    const byPhone = !raw.includes("@") && user.phone;
    const sent = byPhone ? await sendResetSMS(user.phone, token, user.email) : await sendResetEmail(user.email, token);
    if (!sent) console.warn("[AUTH] Password reset delivery failed for:", byPhone ? "phone" : "email");

    return { success: true };
  } catch (error) {
    console.error("Forgot password error:", error);
    return { success: false, error: "system_error" };
  }
}

async function findValidToken(email, token) {
  const stored = await db.verificationToken.findUnique({
    where: { identifier_token: { identifier: String(email || ""), token: hashToken(token) } },
  });
  return stored && stored.expires >= new Date() ? stored : null;
}

export async function validateResetToken(email, token) {
  try {
    return { valid: Boolean(await findValidToken(email, token)) };
  } catch {
    return { valid: false };
  }
}

export async function resetPassword(email, token, newPassword) {
  try {
    const ip = await getClientIP();
    const allowed = await checkRateLimit(`reset_attempt_${ip}`, 10, 15 * 60 * 1000);
    if (!allowed) return { success: false, error: "rate_limited" };
    if (!isStrongPassword(newPassword)) return { success: false, error: "password_weak" };

    const stored = await findValidToken(email, token);
    if (!stored) return { success: false, error: "token_invalid" };

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // passwordChangedAt also ends every session issued before the reset (auth-session-guard).
    await db.$transaction([
      db.user.update({
        where: { email: stored.identifier },
        data: { password: hashedPassword, passwordChangedAt: new Date() },
      }),
      db.verificationToken.deleteMany({ where: { identifier: stored.identifier } }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Reset password error:", error);
    return { success: false, error: "reset_failed" };
  }
}
