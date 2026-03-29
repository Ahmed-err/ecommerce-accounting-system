-- AlterTable
ALTER TABLE "Product" ADD COLUMN "compareAtPrice" DECIMAL(12,2),
ADD COLUMN "specs" JSONB,
ADD COLUMN "highlights" JSONB;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN "returnPolicyAr" TEXT,
ADD COLUMN "returnPolicyEn" TEXT;

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WishlistItem_userId_productId_key" ON "WishlistItem"("userId", "productId");
CREATE INDEX "WishlistItem_userId_createdAt_idx" ON "WishlistItem"("userId", "createdAt");

ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ProductStockAlert" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductStockAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductStockAlert_productId_email_key" ON "ProductStockAlert"("productId", "email");
CREATE INDEX "ProductStockAlert_productId_idx" ON "ProductStockAlert"("productId");

ALTER TABLE "ProductStockAlert" ADD CONSTRAINT "ProductStockAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
