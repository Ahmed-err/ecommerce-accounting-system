"use server";

import { prisma as db } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export async function subscribeToNewsletter(email) {
  try {
    // 1. Basic validation
    if (!email || !email.includes("@")) {
      return { success: false, error: "Invalid email address." };
    }

    const sanitizedEmail = email.trim().toLowerCase();

    const canRequest = await checkRateLimit(`newsletter_${sanitizedEmail}`, 3, 60 * 60 * 1000);
    if (!canRequest) {
      return { success: false, error: "Too many requests. Please try again later." };
    }

    // 4. Save
    await db.newsletter.upsert({
      where: { email: sanitizedEmail },
      update: {},
      create: { email: sanitizedEmail },
    });

    return { success: true };
  } catch (error) {
    console.error("Newsletter subscription failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
