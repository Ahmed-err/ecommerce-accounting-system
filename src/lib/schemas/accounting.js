import { z } from "zod";

export const transactionMutationSchema = z.object({
  type: z.enum(["INCOMING", "OUTGOING"]),
  amount: z.coerce.number().positive("amount_invalid"),
  description: z.string().trim().min(1, "desc_required").max(2000, "desc_long"),
  category: z.string().trim().min(1, "cat_required").max(80, "cat_long"),
  reference: z.string().trim().max(120).optional().nullable(),
  date: z.union([z.coerce.date(), z.string().min(1)]),
  paymentMethod: z.string().trim().max(80).optional().nullable(),
  receiptUrl: z.string().max(2000).optional().nullable(),
});

export const manualExpenseSchema = transactionMutationSchema.extend({
  type: z.literal("OUTGOING"),
});

export const ledgerInvoiceCreateSchema = z.object({
  direction: z.enum(["PAYABLE", "RECEIVABLE"]),
  partyName: z.string().trim().min(1, "party_required").max(200, "party_long"),
  amount: z.coerce.number().positive("amount_invalid"),
  dueDate: z.union([z.coerce.date(), z.string()]).optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
});

export const ledgerInvoiceIdSchema = z.object({
  id: z.string().min(1),
});
