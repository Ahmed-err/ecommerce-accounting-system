"use server";

import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

export async function submitContactForm({ name, email, subject, message }) {
  try {
    if (!name || !email || !message) {
      return { success: false, error: "All fields are required." };
    }

    if (!email.includes("@")) {
      return { success: false, error: "Invalid email address." };
    }

    const ip = await getClientIP();
    const allowed = await checkRateLimit(`contact_${ip}`, 5, 60 * 60 * 1000);
    if (!allowed) {
      return { success: false, error: "Too many requests. Please try again later." };
    }

    console.log("[CONTACT FORM]", { name, email, subject, message: message.slice(0, 100) });

    return { success: true };
  } catch (error) {
    console.error("Contact form error:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
