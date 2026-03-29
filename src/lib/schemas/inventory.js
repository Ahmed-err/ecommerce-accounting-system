import { z } from "zod";

const emptyToUndef = (v) => (v === "" || v === undefined ? undefined : v);

export const productMutationSchema = z.object({
  name: z.string().trim().min(1).max(500),
  nameEn: z.string().trim().max(500).optional().nullable(),
  nameAr: z.string().trim().max(500).optional().nullable(),
  description: z.string().max(10000).optional().nullable(),
  descriptionEn: z.string().max(10000).optional().nullable(),
  descriptionAr: z.string().max(10000).optional().nullable(),
  sku: z.string().trim().min(1).max(120),
  barcode: z.preprocess(emptyToUndef, z.string().trim().max(120).optional().nullable()),
  unit: z.string().trim().min(1).max(32).default("pcs"),
  purchasePrice: z.coerce.number().min(0).max(1e12),
  sellingPrice: z.coerce.number().min(0).max(1e12),
  stock: z.coerce.number().int().min(0).max(1e9),
  minStock: z.coerce.number().int().min(0).max(1e9),
  categoryId: z.string().min(1),
  supplierId: z.preprocess(emptyToUndef, z.string().min(1).optional().nullable()),
  images: z.array(z.string().max(2000)).max(8).optional(),
  isActive: z.boolean().optional(),
  compareAtPrice: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.coerce.number().min(0).max(1e12).optional().nullable()
  ),
  specs: z.any().optional().nullable(),
  highlights: z.any().optional().nullable(),
});

export const receiveStockSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(1e6),
  supplierId: z.preprocess(emptyToUndef, z.string().min(1).optional().nullable()),
  unitCost: z.coerce.number().min(0).max(1e12).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const issueStockSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(1e6),
  reason: z.string().trim().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const bulkIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
});

export const bulkCategorySchema = bulkIdsSchema.extend({
  categoryId: z.string().min(1),
});
