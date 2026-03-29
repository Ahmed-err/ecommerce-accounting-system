-- CreateTable Store
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "sloganAr" TEXT,
    "sloganEn" TEXT,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "addressAr" TEXT,
    "addressEn" TEXT,
    "googleMapsLink" TEXT,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "whatsappUrl" TEXT,
    "tiktokUrl" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'SDG',
    "currencySymbolPosition" TEXT NOT NULL DEFAULT 'END',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'ar',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "businessHoursJson" JSONB,
    "globalFreeShippingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "globalFreeShippingAmount" DECIMAL(12,2),
    "cashOnDeliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "deliveryNotesAr" TEXT,
    "deliveryNotesEn" TEXT,
    "defaultDeliveryEstimateAr" TEXT,
    "defaultDeliveryEstimateEn" TEXT,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV-',
    "vatEnabled" BOOLEAN NOT NULL DEFAULT false,
    "vatPercentage" DECIMAL(5,2),
    "vatLabelAr" TEXT,
    "vatLabelEn" TEXT,
    "minOrderAmount" DECIMAL(12,2),
    "seoMetaTitleAr" TEXT,
    "seoMetaTitleEn" TEXT,
    "seoMetaDescriptionAr" TEXT,
    "seoMetaDescriptionEn" TEXT,
    "seoOgImageUrl" TEXT,
    "googleAnalyticsId" TEXT,
    "googleSearchConsoleVerification" TEXT,
    "robotsTxt" TEXT,
    "backupSchedule" TEXT NOT NULL DEFAULT 'OFF',
    "backupLastStatus" TEXT,
    "backupLastAt" TIMESTAMP(3),
    "appVersion" TEXT DEFAULT '0.1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable ShippingZone
CREATE TABLE "ShippingZone" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "zoneName" TEXT NOT NULL,
    "governorates" TEXT[],
    "shippingCost" DECIMAL(12,2) NOT NULL,
    "freeShippingMinOrder" DECIMAL(12,2),
    "deliveryDaysEstimate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ShippingZone" ADD CONSTRAINT "ShippingZone_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable PaymentMethod
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "instructionsAr" TEXT,
    "instructionsEn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentMethod_storeId_code_key" ON "PaymentMethod"("storeId", "code");
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable NotificationConfig
CREATE TABLE "NotificationConfig" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "emailNewOrderAdmin" BOOLEAN NOT NULL DEFAULT true,
    "emailOrderStatusCustomer" BOOLEAN NOT NULL DEFAULT true,
    "emailLowStockAdmin" BOOLEAN NOT NULL DEFAULT true,
    "emailNewReturnAdmin" BOOLEAN NOT NULL DEFAULT true,
    "smsWhatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "adminRecipients" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationConfig_storeId_key" ON "NotificationConfig"("storeId");
ALTER TABLE "NotificationConfig" ADD CONSTRAINT "NotificationConfig_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable Permission
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "module" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Permission_role_module_key" ON "Permission"("role", "module");
