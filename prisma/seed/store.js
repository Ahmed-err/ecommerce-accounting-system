import { SHIPPING_ZONES } from "./catalog-data.js";

export async function seedStore(prisma) {
  await prisma.store.create({
    data: {
      nameAr: "أعمال عصام الدين نصر للأدوات الكهربائية",
      nameEn: "Essam El-Din Nasr Electrical Tools",
      contactPhone: "+249900000000",
      contactEmail: "info@example.com",
      addressAr: "الخرطوم، السوق العربي",
      addressEn: "Khartoum, Souq Al-Arabi",
      currency: "SDG",
      bankTransferBankNameEn: "Bank of Khartoum",
      bankTransferBankNameAr: "بنك الخرطوم",
      bankTransferAccountNumber: "0000000000",
      bankTransferAccountNameEn: "Essam El-Din Nasr Electrical Tools",
      bankTransferAccountNameAr: "أعمال عصام الدين نصر للأدوات الكهربائية",
      bankTransferProofWhatsapp: "+249900000000",
      shippingZones: { create: SHIPPING_ZONES },
      paymentMethods: {
        create: [
          { code: "CASH_ON_DELIVERY", labelAr: "الدفع عند الاستلام", labelEn: "Cash on Delivery", isEnabled: true },
          {
            code: "BANK_TRANSFER",
            labelAr: "تحويل بنكي",
            labelEn: "Bank Transfer",
            isEnabled: true,
            instructionsAr: "حوّل المبلغ إلى الحساب الموضح وأرسل صورة الإشعار.",
            instructionsEn: "Transfer the total to the account shown and send the receipt.",
          },
        ],
      },
      notificationConfig: { create: {} },
    },
  });
  console.log(`   ✓ store settings, ${SHIPPING_ZONES.length} shipping zones, 2 payment methods`);
}
