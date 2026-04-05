-- AlterTable
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "bankTransferBankNameEn" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "bankTransferBankNameAr" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "bankTransferAccountNumber" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "bankTransferAccountNameEn" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "bankTransferAccountNameAr" TEXT;
