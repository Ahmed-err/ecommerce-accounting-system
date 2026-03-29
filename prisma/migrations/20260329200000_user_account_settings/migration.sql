-- AlterTable: User — account & preferences
ALTER TABLE "User" ADD COLUMN "gender" TEXT;
ALTER TABLE "User" ADD COLUMN "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "prefLanguage" TEXT DEFAULT 'ar';
ALTER TABLE "User" ADD COLUMN "prefTheme" TEXT DEFAULT 'system';
ALTER TABLE "User" ADD COLUMN "prefCurrency" TEXT;
ALTER TABLE "User" ADD COLUMN "newsletterSubscribed" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "notifyOrderStatusEmail" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "notifyPromoEmail" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "notifyNewArrivalsEmail" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "notifyWhatsapp" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "marketingUnsubscribed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "accountDeletedAt" TIMESTAMP(3);

-- AlterTable: UserAddress — extended fields
ALTER TABLE "UserAddress" ADD COLUMN "governorate" TEXT;
ALTER TABLE "UserAddress" ADD COLUMN "street" TEXT;
ALTER TABLE "UserAddress" ADD COLUMN "building" TEXT;
ALTER TABLE "UserAddress" ADD COLUMN "floor" TEXT;
ALTER TABLE "UserAddress" ADD COLUMN "notes" TEXT;
