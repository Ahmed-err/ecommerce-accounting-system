"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { createAdminBroadcastNotification } from "@/lib/notifications";
import { sendPhoneVerificationOTP } from "@/lib/senders";

/**
 * Validates password strength
 * Requires: 8+ chars, 1 uppercase, 1 lowercase, 1 number
 */
function validatePassword(password) {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number.";
  }
  return null;
}

function normalizePhone(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  const normalized = raw.replace(/[^\d+]/g, "");
  if (!/^\+?\d{8,15}$/.test(normalized)) return "";
  return normalized.startsWith("+") ? normalized : `+${normalized}`;
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const otpIdentifier = (phone) => `phone_verify:${phone}`;

function withTimeout(promise, ms, label = "operation") {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

export async function sendPhoneVerificationCode(rawPhone) {
  try {
    const phone = normalizePhone(rawPhone);
    if (!phone) return { success: false, error: "Invalid phone number format." };

    const allowed = await checkRateLimit(`verify_phone_send_${phone}`, 3, 10 * 60 * 1000, { failClosed: true });
    if (!allowed) return { success: false, error: "Too many attempts. Please try later." };

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return { success: true };
    if (user.phoneVerified) return { success: true };

    const code = generateOtpCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.verificationToken.deleteMany({ where: { identifier: otpIdentifier(phone) } });
    await prisma.verificationToken.create({
      data: {
        identifier: otpIdentifier(phone),
        token: code,
        expires,
      },
    });

    const sent = await withTimeout(
      sendPhoneVerificationOTP(phone, code),
      8000,
      "sendPhoneVerificationOTP"
    );
    if (!sent) return { success: false, error: "Could not send verification SMS. Check Twilio settings." };
    return { success: true };
  } catch (error) {
    console.error("sendPhoneVerificationCode:", error);
    return { success: false, error: "Failed to send verification code." };
  }
}

export async function verifyPhoneCode(rawPhone, otpCode) {
  try {
    const phone = normalizePhone(rawPhone);
    const code = String(otpCode || "").trim();
    if (!phone || !/^\d{6}$/.test(code)) return { success: false, error: "Invalid code." };

    const allowed = await checkRateLimit(`verify_phone_check_${phone}`, 10, 15 * 60 * 1000, { failClosed: true });
    if (!allowed) return { success: false, error: "Too many attempts. Please try later." };

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return { success: false, error: "Invalid code or expired code." };

    const row = await prisma.verificationToken.findFirst({
      where: {
        identifier: otpIdentifier(phone),
        token: code,
        expires: { gt: new Date() },
      },
      orderBy: { expires: "desc" },
    });

    if (!row) return { success: false, error: "Invalid code or expired code." };

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: new Date() },
      }),
      prisma.verificationToken.deleteMany({ where: { identifier: otpIdentifier(phone) } }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("verifyPhoneCode:", error);
    return { success: false, error: "Failed to verify phone number." };
  }
}

/**
 * Handles user registration.
 * 
 * @param {FormData} formData
 */
export async function registerUser(formData) {
  try {
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    const email = formData.get("email");
    const password = formData.get("password");
    const phone = normalizePhone(formData.get("phone"));

    // 1. Validation
    if (!firstName || !lastName || !email || !password || !phone) {
      return { error: "Missing required fields (First Name, Last Name, Email, Phone, or Password)." };
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return { error: passwordError };
    }

    // Get IP and check rate limits
    const ip = await getClientIP();
    const [ipAllowed, emailAllowed] = await Promise.all([
      checkRateLimit(`register_${ip}`, 5, 15 * 60 * 1000),
      checkRateLimit(`register_${email}`, 5, 15 * 60 * 1000)
    ]);
    
    if (!ipAllowed || !emailAllowed) {
        return { error: "Too many registration attempts. Please try again later." };
    }

    // 2. Check for existing user - use generic error to prevent user enumeration
    const [existingEmail, existingPhone] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { phone } })
    ]);

    if (existingEmail || existingPhone) {
      // Generic error - don't reveal which field is taken
      return { error: "An account with this information already exists." };
    }

    // 3. Hash password with optimized salt rounds for better performance
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create User
    // Note: The 'name' field is required by Auth.js and is present in our Prisma schema.
    const createdUser = await prisma.user.create({
      data: {
        firstName: firstName,
        lastName: lastName,
        name: `${firstName} ${lastName}`,
        email: email,
        password: hashedPassword,
        phone,
        phoneVerified: null,
        role: "CUSTOMER",
      },
    });

    // 5. Ensure OTP is created/sent before returning, so verification page always works.
    const sendRes = await sendPhoneVerificationCode(phone);
    if (!sendRes.success) {
      console.warn("registerUser: user created but phone verification SMS failed");
    }

    // 6. Admin notification should not block user registration response.
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

    return { success: true, requiresPhoneVerification: true, phone };
  } catch (error) {
    console.error("Registration fatal error:", error);
    return { error: "Registration failed. Please try again later." };
  }
}
