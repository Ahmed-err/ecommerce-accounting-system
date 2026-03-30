"use server";

import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { createContactMessageRecord } from "@/lib/contact";
import { sendContactAdminNotification, sendContactAutoReply } from "@/lib/senders";
import { createAdminBroadcastNotification } from "@/lib/notifications";
import { z } from "zod";

const subjects = z.enum(["GENERAL", "ORDER", "PRODUCT", "TECH", "OTHER"]);

const schema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(320),
  phone: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().max(40).optional()
  ),
  subject: subjects,
  message: z.string().trim().min(20).max(5000),
  lang: z.enum(["ar", "en"]).optional(),
});

function sanitize(s) {
  return String(s || "")
    .replace(/[<>]/g, "")
    .trim();
}

export async function submitContactForm(raw) {
  try {
    const ip = await getClientIP();
    const allowed = await checkRateLimit(`contact_${ip}`, 3, 60 * 60 * 1000, { failClosed: false });
    if (!allowed) {
      return { success: false, error: "Too many requests. Please try again later." };
    }

    const parsed = schema.safeParse({
      ...raw,
      name: sanitize(raw?.name),
      email: sanitize(raw?.email),
      phone: raw?.phone ? sanitize(raw.phone) : "",
      message: sanitize(raw?.message),
    });
    if (!parsed.success) {
      return { success: false, error: "Please check the form fields.", fields: parsed.error.flatten().fieldErrors };
    }

    const d = parsed.data;
    const labelMap = {
      GENERAL: "General",
      ORDER: "Order",
      PRODUCT: "Product",
      TECH: "Technical",
      OTHER: "Other",
    };
    const subjLabel = labelMap[d.subject] || d.subject;

    await createContactMessageRecord({
      name: d.name,
      email: d.email,
      phone: d.phone || null,
      subject: subjLabel,
      message: d.message,
    });
    await createAdminBroadcastNotification({
      type: "NEW_MESSAGE",
      titleAr: "رسالة تواصل جديدة",
      titleEn: "New contact message",
      bodyAr: `رسالة جديدة من ${d.name}.`,
      bodyEn: `New contact message from ${d.name}.`,
      link: "/admin/contacts",
    });

    await sendContactAdminNotification({
      name: d.name,
      email: d.email,
      phone: d.phone,
      subject: subjLabel,
      message: d.message,
    }).catch(() => {});
    await sendContactAutoReply(d.email, d.lang || "en").catch(() => {});

    return { success: true };
  } catch (error) {
    console.error("Contact form error:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
