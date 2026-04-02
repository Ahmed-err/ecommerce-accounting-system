-- CreateEnum
CREATE TYPE "ProductOrigin" AS ENUM ('LOCAL', 'IMPORTED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "countryOfOrigin" TEXT,
ADD COLUMN     "importTaxRate" DECIMAL(5,2),
ADD COLUMN     "importedPrice" DECIMAL(12,2),
ADD COLUMN     "localPrice" DECIMAL(12,2),
ADD COLUMN     "origin" "ProductOrigin" NOT NULL DEFAULT 'LOCAL';

