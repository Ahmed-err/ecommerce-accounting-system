-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "receiptUrl" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "paymentMethod" TEXT;

-- CreateEnum
CREATE TYPE "LedgerInvoiceDirection" AS ENUM ('PAYABLE', 'RECEIVABLE');

-- CreateEnum
CREATE TYPE "LedgerInvoiceStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateTable
CREATE TABLE "LedgerInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "direction" "LedgerInvoiceDirection" NOT NULL,
    "partyName" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "status" "LedgerInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LedgerInvoice_invoiceNumber_key" ON "LedgerInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "LedgerInvoice_status_dueDate_idx" ON "LedgerInvoice"("status", "dueDate");
