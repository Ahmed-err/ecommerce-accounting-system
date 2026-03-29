"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";

export async function getWishlistContainsAction(productId) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { ok: true, inWishlist: false };
    const row = await db.wishlistItem.findUnique({
      where: {
        userId_productId: { userId: session.user.id, productId },
      },
    });
    return { ok: true, inWishlist: !!row };
  } catch (e) {
    console.error("getWishlistContainsAction:", e);
    return { ok: false, inWishlist: false };
  }
}

export async function toggleWishlistProductAction(productId) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, needAuth: true };

    const existing = await db.wishlistItem.findUnique({
      where: {
        userId_productId: { userId: session.user.id, productId },
      },
    });

    if (existing) {
      await db.wishlistItem.delete({ where: { id: existing.id } });
      revalidatePath(`/products/${productId}`);
      return { ok: true, inWishlist: false };
    }

    const p = await db.product.findFirst({
      where: { id: productId, isActive: true },
    });
    if (!p) return { ok: false, error: "not_found" };

    await db.wishlistItem.create({
      data: { userId: session.user.id, productId },
    });
    revalidatePath(`/products/${productId}`);
    return { ok: true, inWishlist: true };
  } catch (e) {
    console.error("toggleWishlistProductAction:", e);
    return { ok: false, error: "server" };
  }
}
