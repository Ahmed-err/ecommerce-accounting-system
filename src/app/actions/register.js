"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { createAdminBroadcastNotification } from "@/lib/notifications";
import { isStrongPassword, normalizeEmail, phoneVariants } from "@/lib/auth-identity";

/**
 * Handles user registration. Errors are codes; the page shows them in the visitor's language.
 *
 * @param {FormData} formData
 */
export async function registerUser(formData) {
  try {
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const email = normalizeEmail(formData.get("email"));
    const password = String(formData.get("password") || "");
    const phone = phoneVariants(formData.get("phone"));

    if (!firstName || !lastName || !email || !password) return { error: "missing_fields" };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "email_invalid" };
    if (!phone) return { error: "phone_invalid" };
    if (!isStrongPassword(password)) return { error: "password_weak" };

    const ip = await getClientIP();
    const [ipAllowed, emailAllowed] = await Promise.all([
      checkRateLimit(`register_${ip}`, 5, 15 * 60 * 1000),
      checkRateLimit(`register_${email}`, 5, 15 * 60 * 1000),
    ]);
    if (!ipAllowed || !emailAllowed) return { error: "rate_limited" };

    // One account per email (any case) and per phone (any format); the message doesn't say which.
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: { equals: email, mode: "insensitive" } }, { phone: { in: phone.variants } }],
      },
      select: { id: true },
    });
    if (existing) return { error: "account_exists" };

    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email,
        password: hashedPassword,
        phone: phone.canonical,
        phoneVerified: new Date(),
        role: "CUSTOMER",
      },
    });

    createAdminBroadcastNotification({
      type: "NEW_USER",
      titleAr: "مستخدم جديد",
      titleEn: "New user registered",
      bodyAr: `تم تسجيل مستخدم جديد: ${createdUser.name || createdUser.email}`,
      bodyEn: `A new user registered: ${createdUser.name || createdUser.email}`,
      link: "/admin",
    }).catch((err) => {
      console.warn("registerUser: admin notification failed", err);
    });

    return { success: true };
  } catch (error) {
    console.error("Registration fatal error:", error);
    return { error: "register_failed" };
  }
}
