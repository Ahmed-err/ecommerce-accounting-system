"use server";

import { prisma as db } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const MAX_ADDRESSES = 5;

const addressSchema = z.object({
  label: z.string().max(40).optional().nullable(),
  fullName: z.string().min(1).max(120),
  phone: z.string().min(6).max(30),
  governorate: z.string().max(120).optional().nullable(),
  city: z.string().min(1).max(120),
  street: z.string().max(200).optional().nullable(),
  addressLine: z.string().max(500).optional().nullable(),
  building: z.string().max(80).optional().nullable(),
  floor: z.string().max(40).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  setDefault: z.boolean().optional(),
});

async function getUserId() {
  const session = await auth();
  return session?.user?.id || null;
}

function buildAddressLine({ street, building, floor, notes }) {
  const parts = [street, building, floor].filter(Boolean);
  let line = parts.join(", ");
  if (notes?.trim()) line = line ? `${line} — ${notes.trim()}` : notes.trim();
  return line;
}

export async function listUserAddresses() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: true, addresses: [] };
    }

    const addresses = await db.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });

    return { success: true, addresses };
  } catch (e) {
    console.error("listUserAddresses:", e);
    return { success: false, addresses: [], error: e.message };
  }
}

export async function createUserAddress(data) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const parsed = addressSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message };
    }

    const count = await db.userAddress.count({ where: { userId } });
    if (count >= MAX_ADDRESSES) {
      return { success: false, error: "address_limit" };
    }

    const p = parsed.data;
    const streetLine = (p.street?.trim() || p.addressLine?.trim() || "").trim();
    if (!streetLine) {
      return { success: false, error: "Street or address line required" };
    }
    const addressLineComputed = buildAddressLine({
      street: streetLine,
      building: p.building || "",
      floor: p.floor || "",
      notes: p.notes || "",
    });

    if (p.setDefault) {
      await db.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const created = await db.userAddress.create({
      data: {
        userId,
        label: p.label?.trim() || null,
        fullName: p.fullName.trim(),
        phone: p.phone.replace(/\s/g, ""),
        addressLine: addressLineComputed,
        city: p.city.trim(),
        governorate: p.governorate?.trim() || null,
        street: streetLine,
        building: p.building?.trim() || null,
        floor: p.floor?.trim() || null,
        notes: p.notes?.trim() || null,
        isDefault: !!p.setDefault,
      },
    });

    revalidatePath("/account/settings");
    revalidatePath("/checkout");
    return { success: true, address: created };
  } catch (e) {
    console.error("createUserAddress:", e);
    return { success: false, error: e.message };
  }
}

export async function updateUserAddress(addressId, data) {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const existing = await db.userAddress.findFirst({ where: { id: addressId, userId } });
    if (!existing) return { success: false, error: "Not found" };

    const parsed = addressSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message };
    }

    const p = parsed.data;
    const streetLine = (
      p.street?.trim() ||
      p.addressLine?.trim() ||
      existing.street ||
      existing.addressLine ||
      ""
    ).trim();
    if (!streetLine) {
      return { success: false, error: "Street or address line required" };
    }
    const addressLineComputed = buildAddressLine({
      street: streetLine,
      building: p.building || "",
      floor: p.floor || "",
      notes: p.notes || "",
    });

    if (p.setDefault) {
      await db.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const updated = await db.userAddress.update({
      where: { id: addressId },
      data: {
        label: p.label?.trim() || null,
        fullName: p.fullName.trim(),
        phone: p.phone.replace(/\s/g, ""),
        addressLine: addressLineComputed,
        city: p.city.trim(),
        governorate: p.governorate?.trim() || null,
        street: streetLine,
        building: p.building?.trim() || null,
        floor: p.floor?.trim() || null,
        notes: p.notes?.trim() || null,
        ...(p.setDefault !== undefined ? { isDefault: !!p.setDefault } : {}),
      },
    });

    revalidatePath("/account/settings");
    revalidatePath("/checkout");
    return { success: true, address: updated };
  } catch (e) {
    console.error("updateUserAddress:", e);
    return { success: false, error: e.message };
  }
}

export async function deleteUserAddress(addressId) {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const existing = await db.userAddress.findFirst({ where: { id: addressId, userId } });
    if (!existing) return { success: false, error: "Not found" };

    await db.userAddress.delete({ where: { id: addressId } });

    if (existing.isDefault) {
      const next = await db.userAddress.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
      if (next) {
        await db.userAddress.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }

    revalidatePath("/account/settings");
    revalidatePath("/checkout");
    return { success: true };
  } catch (e) {
    console.error("deleteUserAddress:", e);
    return { success: false, error: e.message };
  }
}

export async function setDefaultUserAddress(addressId) {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const existing = await db.userAddress.findFirst({ where: { id: addressId, userId } });
    if (!existing) return { success: false, error: "Not found" };

    await db.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
    await db.userAddress.update({ where: { id: addressId }, data: { isDefault: true } });

    revalidatePath("/account/settings");
    revalidatePath("/checkout");
    return { success: true };
  } catch (e) {
    console.error("setDefaultUserAddress:", e);
    return { success: false, error: e.message };
  }
}
