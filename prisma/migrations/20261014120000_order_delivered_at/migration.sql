-- Delivery date for the return window (P3.3). Nullable: older delivered orders fall back to updatedAt.
ALTER TABLE "Order" ADD COLUMN "deliveredAt" TIMESTAMP(3);
