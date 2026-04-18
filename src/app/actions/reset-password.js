"use server";

import { prisma as db } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendResetEmail, sendResetSMS } from "@/lib/senders";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

export async function requestPasswordReset(email) {
  try {
    // Get IP for additional rate limiting
    const ip = await getClientIP();
    const rateKey = email.toLowerCase().trim();
    
    // Use database-backed rate limiter
    const [emailAllowed, ipAllowed] = await Promise.all([
      checkRateLimit(`reset_${rateKey}`, 5, 15 * 60 * 1000),
      checkRateLimit(`reset_ip_${ip}`, 10, 15 * 60 * 1000)
    ]);
    
    if (!emailAllowed || !ipAllowed) {
       console.warn(`[SECURITY] Rate Limit trigger on password reset for: ${rateKey}`);
       return { success: false, error: "Too many requests. Try again in 15 minutes." };
    }

    const isPhone = /^[0-9+\-()\s]+$/.test(email);
    
    const user = await db.user.findFirst({
        where: {
            OR: [
                { email },
                { phone: email }
            ]
        }
    });

    if (!user) {
      // Don't reveal if user exists for security
      return { success: true }; 
    }

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await db.verificationToken.upsert({
      where: { identifier_token: { identifier: user.email, token: token } },
      update: { token, expires },
      create: {
        identifier: user.email,
        token,
        expires,
      },
    });

    let sent = false;
    
    if (isPhone && user.phone) {
       sent = await sendResetSMS(user.phone, token);
    } else {
       sent = await sendResetEmail(user.email, token);
    }

    if (!sent) {
        console.warn("[AUTH] Password reset delivery failed for:", isPhone ? "phone" : "email");
    }

    return { success: true };
  } catch (error) {
    console.error("Forgot password error:", error);
    return { success: false, error: "System error occurred." };
  }
}

export async function validateResetToken(email, token) {
   try {
     const storedToken = await db.verificationToken.findUnique({
       where: { identifier_token: { identifier: email, token: token } }
     });

     if (!storedToken || storedToken.expires < new Date()) {
       return { valid: false };
     }

     return { valid: true };
   } catch (error) {
     return { valid: false };
   }
}

function validatePassword(password) {
  if (password.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  return null;
}

export async function resetPassword(email, token, newPassword) {
  try {
    const ip = await getClientIP();
    const resetAttemptAllowed = await checkRateLimit(`reset_attempt_${ip}`, 10, 15 * 60 * 1000);
    if (!resetAttemptAllowed) {
      return { success: false, error: "Too many attempts. Try again in 15 minutes." };
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return { success: false, error: passwordError };
    }

    const storedToken = await db.verificationToken.findUnique({
      where: { identifier_token: { identifier: email, token: token } }
    });

    if (!storedToken || storedToken.expires < new Date()) {
      return { success: false, error: "Invalid or expired token." };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.$transaction([
      db.user.update({
        where: { email },
        data: { 
          password: hashedPassword,
          passwordChangedAt: new Date()
        }
      }),
      db.verificationToken.delete({
        where: { identifier_token: { identifier: email, token: token } }
      })
    ]);

    return { success: true };
  } catch (error) {
    console.error("Reset password error:", error);
    return { success: false, error: "Failed to reset password." };
  }
}
