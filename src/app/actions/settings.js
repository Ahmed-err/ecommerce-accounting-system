"use server";

import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrCreateStoreSettings } from "@/lib/settings";
import { sanitizeLegalHtml } from "@/lib/legal-sanitize";

async function ensureAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");
  return session;
}

const updateStoreSchema = z.object({
  tab: z.string(),
  payload: z.record(z.string(), z.unknown()),
});

export async function getAdminSettingsData() {
  await ensureAdmin();
  const store = await getOrCreateStoreSettings();
  const users = await db.user.findMany({
    select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const permissions = await db.permission.findMany({ orderBy: [{ role: "asc" }, { module: "asc" }] });
  let legal = { terms: null, privacy: null };
  try {
    const legalRows = await db.legalPage.findMany();
    legal = {
      terms: legalRows.find((r) => r.type === "TERMS") || null,
      privacy: legalRows.find((r) => r.type === "PRIVACY") || null,
    };
  } catch {
    /* table may not exist before migration */
  }
  return { store, users, permissions, legal };
}

export async function updateSettings(input) {
  await ensureAdmin();
  const parsed = updateStoreSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  const { tab, payload } = parsed.data;
  const store = await getOrCreateStoreSettings();

  if (tab === "store") {
    await db.store.update({ where: { id: store.id }, data: payload });
  } else if (tab === "shipping") {
    if (Array.isArray(payload.zones)) {
      await db.shippingZone.deleteMany({ where: { storeId: store.id } });
      if (payload.zones.length) {
        await db.shippingZone.createMany({
          data: payload.zones.map((z) => ({
            storeId: store.id,
            zoneName: z.zoneName,
            governorates: Array.isArray(z.governorates) ? z.governorates : [],
            shippingCost: Number(z.shippingCost || 0),
            freeShippingMinOrder: z.freeShippingMinOrder ? Number(z.freeShippingMinOrder) : null,
            deliveryDaysEstimate: z.deliveryDaysEstimate || "",
          })),
        });
      }
    }
    await db.store.update({
      where: { id: store.id },
      data: {
        globalFreeShippingEnabled: !!payload.globalFreeShippingEnabled,
        globalFreeShippingAmount: payload.globalFreeShippingAmount ? Number(payload.globalFreeShippingAmount) : null,
        cashOnDeliveryEnabled: !!payload.cashOnDeliveryEnabled,
        deliveryNotesAr: payload.deliveryNotesAr || null,
        deliveryNotesEn: payload.deliveryNotesEn || null,
        defaultDeliveryEstimateAr: payload.defaultDeliveryEstimateAr || null,
        defaultDeliveryEstimateEn: payload.defaultDeliveryEstimateEn || null,
      },
    });
  } else if (tab === "payment") {
    if (Array.isArray(payload.methods)) {
      await db.paymentMethod.deleteMany({ where: { storeId: store.id } });
      if (payload.methods.length) {
        await db.paymentMethod.createMany({
          data: payload.methods.map((m) => ({
            storeId: store.id,
            code: m.code,
            labelAr: m.labelAr,
            labelEn: m.labelEn,
            isEnabled: !!m.isEnabled,
            apiKey: m.apiKey || null,
            apiSecret: m.apiSecret || null,
            instructionsAr: m.instructionsAr || null,
            instructionsEn: m.instructionsEn || null,
          })),
        });
      }
    }
    await db.store.update({ where: { id: store.id }, data: { invoicePrefix: payload.invoicePrefix || "INV-", vatEnabled: !!payload.vatEnabled, vatPercentage: payload.vatPercentage ? Number(payload.vatPercentage) : null, vatLabelAr: payload.vatLabelAr || null, vatLabelEn: payload.vatLabelEn || null, minOrderAmount: payload.minOrderAmount ? Number(payload.minOrderAmount) : null } });
  } else if (tab === "notifications") {
    await db.notificationConfig.upsert({
      where: { storeId: store.id },
      update: payload,
      create: { storeId: store.id, ...payload },
    });
  } else if (tab === "seo") {
    await db.store.update({ where: { id: store.id }, data: payload });
  } else if (tab === "legal") {
    try {
    const termsAr = sanitizeLegalHtml(String(payload.termsAr ?? ""));
    const termsEn = sanitizeLegalHtml(String(payload.termsEn ?? ""));
    const privacyAr = sanitizeLegalHtml(String(payload.privacyAr ?? ""));
    const privacyEn = sanitizeLegalHtml(String(payload.privacyEn ?? ""));
    await db.legalPage.upsert({
      where: { type: "TERMS" },
      create: { type: "TERMS", contentAr: termsAr, contentEn: termsEn },
      update: { contentAr: termsAr, contentEn: termsEn },
    });
    await db.legalPage.upsert({
      where: { type: "PRIVACY" },
      create: { type: "PRIVACY", contentAr: privacyAr, contentEn: privacyEn },
      update: { contentAr: privacyAr, contentEn: privacyEn },
    });
    revalidatePath("/terms");
    revalidatePath("/privacy");
    } catch (e) {
      console.error("Legal save failed:", e);
      return { success: false, error: e?.message || "Legal save failed" };
    }
  } else if (tab === "about") {
    const y = payload.aboutFoundedYear;
    const aboutFoundedYear =
      y != null && y !== ""
        ? (() => {
            const n = parseInt(String(y), 10);
            return Number.isFinite(n) ? n : null;
          })()
        : null;
    await db.store.update({
      where: { id: store.id },
      data: {
        aboutStoryAr: payload.aboutStoryAr || null,
        aboutStoryEn: payload.aboutStoryEn || null,
        aboutMissionAr: payload.aboutMissionAr || null,
        aboutMissionEn: payload.aboutMissionEn || null,
        aboutVisionAr: payload.aboutVisionAr || null,
        aboutVisionEn: payload.aboutVisionEn || null,
        aboutImageUrl: payload.aboutImageUrl || null,
        aboutFoundedYear,
      },
    });
    revalidatePath("/about");
  } else if (tab === "users") {
    if (payload.updateUser?.id) {
      await db.user.update({
        where: { id: payload.updateUser.id },
        data: {
          role: payload.updateUser.role,
          isActive: payload.updateUser.isActive,
        },
      });
    }
  } else if (tab === "system") {
    await db.store.update({ where: { id: store.id }, data: { maintenanceMode: !!payload.maintenanceMode } });
  } else if (tab === "backup") {
    await db.store.update({
      where: { id: store.id },
      data: {
        backupSchedule: payload.backupSchedule || "OFF",
      },
    });
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  const fresh = await getAdminSettingsData();
  return { success: true, data: fresh };
}
