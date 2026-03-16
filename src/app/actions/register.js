"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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
    if (!firstName || !lastName || !email || !password) {
      return { error: "Missing required fields (First Name, Last Name, Email, or Password)." };
    }

    if (password.length < 6) {
      return { error: "Password must be at least 6 characters long." };
    }

    // 2. Check for existing user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: "An account with this email already exists." };
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
    return { error: `Registration error: ${error.message}` };
  }
}
