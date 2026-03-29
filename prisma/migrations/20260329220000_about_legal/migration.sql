-- CreateEnum
CREATE TYPE "LegalPageType" AS ENUM ('TERMS', 'PRIVACY');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "aboutStoryAr" TEXT,
ADD COLUMN IF NOT EXISTS "aboutStoryEn" TEXT,
ADD COLUMN IF NOT EXISTS "aboutMissionAr" TEXT,
ADD COLUMN IF NOT EXISTS "aboutMissionEn" TEXT,
ADD COLUMN IF NOT EXISTS "aboutVisionAr" TEXT,
ADD COLUMN IF NOT EXISTS "aboutVisionEn" TEXT,
ADD COLUMN IF NOT EXISTS "aboutImageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "aboutFoundedYear" INTEGER;

-- CreateTable
CREATE TABLE "AboutFeature" (
    "id" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descAr" TEXT NOT NULL,
    "descEn" TEXT NOT NULL,
    "iconKey" TEXT NOT NULL DEFAULT 'Shield',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AboutFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "positionAr" TEXT NOT NULL,
    "positionEn" TEXT NOT NULL,
    "photo" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalPage" (
    "id" TEXT NOT NULL,
    "type" "LegalPageType" NOT NULL,
    "contentAr" TEXT NOT NULL,
    "contentEn" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegalPage_type_key" ON "LegalPage"("type");
