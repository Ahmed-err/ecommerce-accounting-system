"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  listContactMessagesAdmin,
  getContactMessageById,
  markContactMessageRead,
  replyToContactMessage,
  deleteContactMessage,
} from "@/lib/contact";
import { sendContactReplyEmail } from "@/lib/senders";
import { z } from "zod";

async function ensure() {
  const s = await auth();
  if (!s?.user?.id || !["ADMIN", "MANAGER"].includes(s.user.role)) {
    throw new Error("Unauthorized");
  }
  return s.user;
}

export async function loadContactMessagesAction(params) {
  try {
    await ensure();
    return { ok: true, ...(await listContactMessagesAdmin(params || {})) };
  } catch (e) {
    return { ok: false, error: e.message, rows: [], total: 0 };
  }
}

export async function getContactMessageAction(id) {
  try {
    await ensure();
    const row = await getContactMessageById(id);
    if (row && row.status === "NEW") await markContactMessageRead(id);
    return { ok: true, row };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function replyContactMessageAction(id, raw) {
  try {
    await ensure();
    const schema = z.object({
      reply: z.string().trim().min(5).max(8000),
    });
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "validation" };

    const row = await getContactMessageById(id);
    if (!row) return { ok: false, error: "not_found" };

    const html = `<p>${parsed.data.reply.replace(/\n/g, "<br/>")}</p>`;
    const sent = await sendContactReplyEmail(row.email, row.subject, html);
    if (!sent) console.warn("reply email failed for", row.email);

    await replyToContactMessage(id, parsed.data.reply);
    revalidatePath("/admin/contacts");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function deleteContactMessageAction(id) {
  try {
    await ensure();
    await deleteContactMessage(id);
    revalidatePath("/admin/contacts");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
