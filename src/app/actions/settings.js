"use server";

import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrCreateStoreSettings } from "@/lib/settings";
import { sanitizeLegalHtml } from "@/lib/legal-sanitize";

async function ensureAdmin() {
  const session = await auth();
  const role = String(session?.user?.role ?? "").toUpperCase();
  if (!session?.user?.id || role !== "ADMIN") throw new Error("Unauthorized");
  return session;
}

function revalidatePublicStorefront() {
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/products", "layout");
  revalidatePath("/cart");
  revalidatePath("/checkout", "layout");
  revalidatePath("/about");
  revalidatePath("/contact");
  revalidatePath("/terms");
  revalidatePath("/privacy");
  revalidatePath("/sitemap.xml");
}

const updateStoreSchema = z.object({
  tab: z.string(),
  payload: z.any(),
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
  let homepage = { banners: [], offers: [] };
  try {
    const legalRows = await db.legalPage.findMany();
    legal = {
      terms: legalRows.find((r) => r.type === "TERMS") || null,
      privacy: legalRows.find((r) => r.type === "PRIVACY") || null,
    };
  } catch {
    /* table may not exist before migration */
  }
  try {
    const [banners, offers] = await Promise.all([
      db.banner.findMany({ orderBy: [{ order: "asc" }, { createdAt: "desc" }] }),
      db.offer.findMany({ orderBy: { createdAt: "desc" } }),
    ]);
    homepage = { banners, offers };
  } catch {
    /* optional homepage tables */
  }
  return { store, users, permissions, legal, homepage };
}

export async function getSettingsUsersPage(input = {}) {
  await ensureAdmin();
  const page = Math.max(1, Number(input.page) || 1);
  const take = Math.min(100, Math.max(5, Number(input.take) || 10));
  const search = String(input.search || "").trim();
  const role = String(input.role || "all").toUpperCase();

  const where = {
    ...(role !== "ALL" && role !== "all" ? { role } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    db.user.count({ where }),
  ]);

  return { success: true, rows, total, page, take, pages: Math.max(1, Math.ceil(total / take)) };
}

export async function getSettingsRolesPage(input = {}) {
  await ensureAdmin();
  const page = Math.max(1, Number(input.page) || 1);
  const take = Math.min(100, Math.max(5, Number(input.take) || 10));
  const search = String(input.search || "").trim();
  const role = String(input.role || "all").toUpperCase();

  const where = {
    ...(role !== "ALL" && role !== "all" ? { role } : {}),
    ...(search ? { module: { contains: search, mode: "insensitive" } } : {}),
  };

  const [rows, total] = await Promise.all([
    db.permission.findMany({
      where,
      orderBy: [{ role: "asc" }, { module: "asc" }],
      skip: (page - 1) * take,
      take,
    }),
    db.permission.count({ where }),
  ]);

  return { success: true, rows, total, page, take, pages: Math.max(1, Math.ceil(total / take)) };
}

export async function updateSettings(input) {
  try {
    await ensureAdmin();
    const parsed = updateStoreSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

    const { tab, payload } = parsed.data;
    const store = await getOrCreateStoreSettings();

  if (tab === "store") {
    const nameAr = String(payload.nameAr ?? "").trim();
    const nameEn = String(payload.nameEn ?? "").trim();
    if (!nameAr || !nameEn) {
      return { success: false, error: "Store Arabic and English names are required." };
    }
    await db.store.update({
      where: { id: store.id },
      data: {
        nameAr,
        nameEn,
        sloganAr: String(payload.sloganAr ?? "").trim() || null,
        sloganEn: String(payload.sloganEn ?? "").trim() || null,
        contactPhone: String(payload.contactPhone ?? "").trim() || null,
        contactEmail: String(payload.contactEmail ?? "").trim() || null,
        addressAr: String(payload.addressAr ?? "").trim() || null,
        addressEn: String(payload.addressEn ?? "").trim() || null,
        googleMapsLink: String(payload.googleMapsLink ?? "").trim() || null,
        whatsappUrl: String(payload.whatsappUrl ?? "").trim() || null,
        facebookUrl: String(payload.facebookUrl ?? "").trim() || null,
        instagramUrl: String(payload.instagramUrl ?? "").trim() || null,
        tiktokUrl: String(payload.tiktokUrl ?? "").trim() || null,
        defaultLanguage: payload.defaultLanguage === "en" ? "en" : "ar",
        currency: ["SDG", "EGP", "USD", "SAR"].includes(String(payload.currency || ""))
          ? String(payload.currency)
          : "SDG",
        maintenanceMode: !!payload.maintenanceMode,
      },
    });
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
    if (payload.syncPaymentMethods === true && Array.isArray(payload.methods)) {
      await db.paymentMethod.deleteMany({ where: { storeId: store.id } });
      if (payload.methods.length) {
        await db.paymentMethod.createMany({
          data: payload.methods.map((m) => ({
            storeId: store.id,
            code: String(m.code || "").trim() || "METHOD",
            labelAr: String(m.labelAr || "").trim() || String(m.code || "Method"),
            labelEn: String(m.labelEn || "").trim() || String(m.code || "Method"),
            isEnabled: !!m.isEnabled,
            apiKey: m.apiKey || null,
            apiSecret: m.apiSecret || null,
            instructionsAr: m.instructionsAr || null,
            instructionsEn: m.instructionsEn || null,
          })),
        });
      }
    }
    await db.store.update({
      where: { id: store.id },
      data: {
        invoicePrefix: payload.invoicePrefix || "INV-",
        vatEnabled: !!payload.vatEnabled,
        vatPercentage: payload.vatPercentage ? Number(payload.vatPercentage) : null,
        vatLabelAr: payload.vatLabelAr || null,
        vatLabelEn: payload.vatLabelEn || null,
        minOrderAmount: payload.minOrderAmount ? Number(payload.minOrderAmount) : null,
      },
    });
  } else if (tab === "pos") {
    await db.store.update({
      where: { id: store.id },
      data: {
        posPrinterType: payload.posPrinterType === "PDF" ? "PDF" : "THERMAL",
        posPrinterConnection: payload.posPrinterConnection === "BLUETOOTH" ? "BLUETOOTH" : "USB",
        posPrinterAutoPrint: payload.posPrinterAutoPrint !== false,
        posPrinterPaperWidth: payload.posPrinterPaperWidth === "58" ? "58" : "80",
        posReceiptFooterAr: String(payload.posReceiptFooterAr ?? "").trim() || null,
        posReceiptFooterEn: String(payload.posReceiptFooterEn ?? "").trim() || null,
        posReceiptShowLogo: payload.posReceiptShowLogo !== false,
        posReceiptShowBarcode: payload.posReceiptShowBarcode !== false,
      },
    });
    revalidatePath("/pos");
  } else if (tab === "notifications") {
    const prev = store.notificationConfig || {};
    const notificationPayload = {
      emailNewOrderAdmin:
        payload.emailNewOrderAdmin !== undefined
          ? !!payload.emailNewOrderAdmin
          : (prev.emailNewOrderAdmin ?? true),
      emailOrderStatusCustomer:
        payload.emailOrderStatusCustomer !== undefined
          ? !!payload.emailOrderStatusCustomer
          : (prev.emailOrderStatusCustomer ?? true),
      emailLowStockAdmin:
        payload.emailLowStockAdmin !== undefined
          ? !!payload.emailLowStockAdmin
          : (prev.emailLowStockAdmin ?? true),
      emailNewReturnAdmin:
        payload.emailNewReturnAdmin !== undefined
          ? !!payload.emailNewReturnAdmin
          : (prev.emailNewReturnAdmin ?? true),
      smsWhatsappEnabled:
        payload.smsWhatsappEnabled !== undefined
          ? !!payload.smsWhatsappEnabled
          : (prev.smsWhatsappEnabled ?? false),
      adminRecipients:
        payload.adminRecipients !== undefined ? payload.adminRecipients || null : prev.adminRecipients ?? null,
    };
    await db.notificationConfig.upsert({
      where: { storeId: store.id },
      update: notificationPayload,
      create: { storeId: store.id, ...notificationPayload },
    });
  } else if (tab === "seo") {
    await db.store.update({
      where: { id: store.id },
      data: {
        seoMetaTitleAr: payload.seoMetaTitleAr || null,
        seoMetaTitleEn: payload.seoMetaTitleEn || null,
        seoMetaDescriptionAr: payload.seoMetaDescriptionAr || null,
        seoMetaDescriptionEn: payload.seoMetaDescriptionEn || null,
        googleAnalyticsId: payload.googleAnalyticsId || null,
        googleSearchConsoleVerification: payload.googleSearchConsoleVerification || null,
        robotsTxt: payload.robotsTxt || null,
        seoOgImageUrl: payload.seoOgImageUrl || null,
      },
    });
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
      const role = String(payload.updateUser.role || "").toUpperCase();
      if (!["ADMIN", "MANAGER", "CASHIER", "CUSTOMER"].includes(role)) {
        return { success: false, error: "Invalid role value" };
      }
      await db.user.update({
        where: { id: payload.updateUser.id },
        data: {
          role,
          isActive:
            payload.updateUser.isActive !== undefined ? !!payload.updateUser.isActive : true,
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
  } else if (tab === "homepage") {
    const type = String(payload.type || "").toLowerCase();
    const action = String(payload.action || "").toLowerCase();
    const id = String(payload.id || "").trim();

    if (type === "banner") {
      if (action === "delete") {
        if (!id) return { success: false, error: "Missing banner id" };
        await db.banner.delete({ where: { id } });
      } else if (action === "create") {
        const titleAr = String(payload.titleAr ?? "").trim();
        const titleEn = String(payload.titleEn ?? "").trim();
        const subtitleAr = String(payload.subtitleAr ?? "").trim();
        const subtitleEn = String(payload.subtitleEn ?? "").trim();
        const image = String(payload.image ?? "").trim();
        const ctaTextAr = String(payload.ctaTextAr ?? "").trim();
        const ctaTextEn = String(payload.ctaTextEn ?? "").trim();
        const ctaLink = String(payload.ctaLink ?? "").trim() || "/products";
        if (!titleAr || !titleEn || !subtitleAr || !subtitleEn || !image || !ctaTextAr || !ctaTextEn) {
          return { success: false, error: "Please fill all required banner fields." };
        }
        await db.banner.create({
          data: {
            titleAr,
            titleEn,
            subtitleAr,
            subtitleEn,
            image,
            ctaTextAr,
            ctaTextEn,
            ctaLink,
            order: Number.isFinite(Number(payload.order)) ? Number(payload.order) : 0,
            isActive: payload.isActive !== false,
          },
        });
      } else if (action === "update") {
        if (!id) return { success: false, error: "Missing banner id" };
        const titleAr = String(payload.titleAr ?? "").trim();
        const titleEn = String(payload.titleEn ?? "").trim();
        const subtitleAr = String(payload.subtitleAr ?? "").trim();
        const subtitleEn = String(payload.subtitleEn ?? "").trim();
        const image = String(payload.image ?? "").trim();
        const ctaTextAr = String(payload.ctaTextAr ?? "").trim();
        const ctaTextEn = String(payload.ctaTextEn ?? "").trim();
        const ctaLink = String(payload.ctaLink ?? "").trim() || "/products";
        if (!titleAr || !titleEn || !subtitleAr || !subtitleEn || !image || !ctaTextAr || !ctaTextEn) {
          return { success: false, error: "Please fill all required banner fields." };
        }
        await db.banner.update({
          where: { id },
          data: {
            titleAr,
            titleEn,
            subtitleAr,
            subtitleEn,
            image,
            ctaTextAr,
            ctaTextEn,
            ctaLink,
            order: Number.isFinite(Number(payload.order)) ? Number(payload.order) : 0,
            isActive: payload.isActive !== false,
          },
        });
      }
    } else if (type === "offer") {
      if (action === "delete") {
        if (!id) return { success: false, error: "Missing offer id" };
        await db.offer.delete({ where: { id } });
      } else if (action === "create") {
        const titleAr = String(payload.titleAr ?? "").trim();
        const titleEn = String(payload.titleEn ?? "").trim();
        const subtitleAr = String(payload.subtitleAr ?? "").trim();
        const subtitleEn = String(payload.subtitleEn ?? "").trim();
        const image = String(payload.image ?? "").trim();
        const ctaTextAr = String(payload.ctaTextAr ?? "").trim();
        const ctaTextEn = String(payload.ctaTextEn ?? "").trim();
        const ctaLink = String(payload.ctaLink ?? "").trim() || "/products";
        if (!titleAr || !titleEn || !subtitleAr || !subtitleEn || !image || !ctaTextAr || !ctaTextEn) {
          return { success: false, error: "Please fill all required offer fields." };
        }
        const expiresAt =
          payload.expiresAt && String(payload.expiresAt).trim()
            ? new Date(String(payload.expiresAt))
            : null;
        await db.offer.create({
          data: {
            titleAr,
            titleEn,
            subtitleAr,
            subtitleEn,
            image,
            ctaTextAr,
            ctaTextEn,
            ctaLink,
            expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
            isActive: payload.isActive !== false,
          },
        });
      } else if (action === "update") {
        if (!id) return { success: false, error: "Missing offer id" };
        const titleAr = String(payload.titleAr ?? "").trim();
        const titleEn = String(payload.titleEn ?? "").trim();
        const subtitleAr = String(payload.subtitleAr ?? "").trim();
        const subtitleEn = String(payload.subtitleEn ?? "").trim();
        const image = String(payload.image ?? "").trim();
        const ctaTextAr = String(payload.ctaTextAr ?? "").trim();
        const ctaTextEn = String(payload.ctaTextEn ?? "").trim();
        const ctaLink = String(payload.ctaLink ?? "").trim() || "/products";
        if (!titleAr || !titleEn || !subtitleAr || !subtitleEn || !image || !ctaTextAr || !ctaTextEn) {
          return { success: false, error: "Please fill all required offer fields." };
        }
        const expiresAt =
          payload.expiresAt && String(payload.expiresAt).trim()
            ? new Date(String(payload.expiresAt))
            : null;
        await db.offer.update({
          where: { id },
          data: {
            titleAr,
            titleEn,
            subtitleAr,
            subtitleEn,
            image,
            ctaTextAr,
            ctaTextEn,
            ctaLink,
            expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
            isActive: payload.isActive !== false,
          },
        });
      }
    }
  } else {
    return { success: false, error: "Unknown settings tab." };
  }

    revalidatePublicStorefront();
    revalidatePath("/admin/settings");
    const fresh = await getAdminSettingsData();
    return { success: true, data: fresh };
  } catch (error) {
    console.error("Settings save failed:", error);
    return { success: false, error: error?.message || "Failed to save settings" };
  }
}
