import { prisma as db } from "@/lib/prisma";

const DEFAULT_HOURS = {
  sunday: { open: true, from: "09:00", to: "17:00" },
  monday: { open: true, from: "09:00", to: "17:00" },
  tuesday: { open: true, from: "09:00", to: "17:00" },
  wednesday: { open: true, from: "09:00", to: "17:00" },
  thursday: { open: true, from: "09:00", to: "17:00" },
  friday: { open: false, from: "09:00", to: "17:00" },
  saturday: { open: true, from: "09:00", to: "17:00" },
};

export async function getOrCreateStoreSettings() {
  const existing = await db.store.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      shippingZones: { orderBy: { createdAt: "asc" } },
      paymentMethods: { orderBy: { createdAt: "asc" } },
      notificationConfig: true,
    },
  });

  if (existing) return existing;

  const created = await db.store.create({
    data: {
      nameAr: "أعمال عصام الدين نصر للأدوات الكهربائية",
      nameEn: "Essam El-Din Nasr Electrical Tools",
      businessHoursJson: DEFAULT_HOURS,
      paymentMethods: {
        create: [
          { code: "CASH_ON_DELIVERY", labelAr: "الدفع عند الاستلام", labelEn: "Cash on Delivery", isEnabled: true },
          { code: "ONLINE_GATEWAY", labelAr: "الدفع الإلكتروني", labelEn: "Online Gateway", isEnabled: false },
        ],
      },
      notificationConfig: { create: {} },
    },
    include: {
      shippingZones: true,
      paymentMethods: true,
      notificationConfig: true,
    },
  });

  return created;
}
