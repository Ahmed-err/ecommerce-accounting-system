-- P3.5: item cost at sale time, who wrote each cash-book row, and POS pay-later debts. All nullable.
ALTER TABLE "OrderItem" ADD COLUMN "unitCost" DECIMAL(12,2);
ALTER TABLE "Transaction" ADD COLUMN "source" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "sourceId" TEXT;
CREATE INDEX "Transaction_source_sourceId_idx" ON "Transaction"("source", "sourceId");
ALTER TABLE "LedgerInvoice" ADD COLUMN "partyPhone" TEXT;
ALTER TABLE "LedgerInvoice" ADD COLUMN "orderId" TEXT;
