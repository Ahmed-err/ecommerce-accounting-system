import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { createContactMessageRecord } from "@/lib/contact";
import { sendContactAdminNotification, sendContactAutoReply } from "@/lib/senders";

const schema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(40).optional().nullable(),
  subject: z.enum(["GENERAL", "ORDER", "PRODUCT", "TECH", "OTHER"]),
  message: z.string().trim().min(20).max(5000),
  lang: z.enum(["ar", "en"]).optional(),
});

function sanitize(s) {
  return String(s || "")
    .replace(/[<>]/g, "")
    .trim();
}

export async function POST(req) {
  try {
    const ip = await getClientIP();
    const allowed = await checkRateLimit(`contact_api_${ip}`, 3, 60 * 60 * 1000, { failClosed: false });
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "rate_limit" }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse({
      ...body,
      name: sanitize(body.name),
      email: sanitize(body.email),
      phone: body.phone ? sanitize(body.phone) : "",
      message: sanitize(body.message),
    });
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "validation", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
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

    await sendContactAdminNotification({
      name: d.name,
      email: d.email,
      phone: d.phone,
      subject: subjLabel,
      message: d.message,
    }).catch(() => {});
    await sendContactAutoReply(d.email, d.lang || "en").catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/contact:", e);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
