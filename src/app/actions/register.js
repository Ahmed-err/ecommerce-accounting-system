"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

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
    const phone = formData.get("phone");

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

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create User
    // Note: The 'name' field is required by Auth.js and is present in our Prisma schema.
    await prisma.user.create({
      data: {
        firstName: firstName,
        lastName: lastName,
        name: `${firstName} ${lastName}`,
        email: email,
        password: hashedPassword,
        phone: phone || null,
        role: "CUSTOMER",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Registration fatal error:", error);
    return { error: "Registration failed. Please try again later." };
  }
}
