"use server";

import { z } from "zod";
import { prisma as db } from "@/lib/prisma";

const schema = z.object({
  productId: z.string().min(1),
  email: z.string().trim().email().max(320),
});

export async function requestProductStockAlertAction(raw) {
  try {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "invalid_email" };

    const { productId, email } = parsed.data;
    const normalized = email.toLowerCase();

    const p = await db.product.findFirst({
      where: { id: productId, isActive: true },
    });
    if (!p) return { ok: false, error: "not_found" };
    if (p.stock > 0) return { ok: false, error: "in_stock" };

    await db.productStockAlert.upsert({
      where: {
        productId_email: { productId, email: normalized },
      },
      create: { productId, email: normalized },
      update: {},
    });

    return { ok: true };
  } catch (e) {
    console.error("requestProductStockAlertAction:", e);
    return { ok: false, error: "server" };
  }
}
