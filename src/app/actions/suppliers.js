"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";
import { z } from "zod";
import {
  getSuppliersKpiOverview,
  getTopSuppliersByVolume,
  getRecentPurchases,
  getMonthlySpendingTrend,
  listSuppliersAdmin,
  getSupplierDetailAdmin,
  supplierHasPurchases,
  listPurchasesAdmin,
  getPurchaseDetailAdmin,
  reportMonthlyPurchasesSummary,
  reportSpendingBySupplier,
  reportSpendingByCategory,
  reportOutstandingPayments,
  listProductsForPurchaseSelect,
  listSuppliersForPurchaseSelect,
} from "@/lib/suppliers";

async function ensure() {
  const s = await auth();
  if (!s?.user?.id || !["ADMIN", "MANAGER"].includes(s.user.role)) {
    throw new Error("Unauthorized");
  }
  return s.user;
}

export async function loadSuppliersOverviewAction() {
  try {
    await ensure();
    const [kpis, top, recent, trend] = await Promise.all([
      getSuppliersKpiOverview(),
      getTopSuppliersByVolume(5),
      getRecentPurchases(8),
      getMonthlySpendingTrend(6),
    ]);
    return { ok: true, kpis, top, recent, trend };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e.message };
  }
}

export async function loadSuppliersTableAction(params) {
  try {
    await ensure();
    const { rows, total } = await listSuppliersAdmin(params || {});
    return { ok: true, rows, total };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function loadPurchasesTableAction(params) {
  try {
    await ensure();
    const { rows, total } = await listPurchasesAdmin(params || {});
    return { ok: true, rows, total };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function loadPurchaseFormOptionsAction() {
  try {
    await ensure();
    const [suppliers, products] = await Promise.all([
      listSuppliersForPurchaseSelect(),
      listProductsForPurchaseSelect(),
    ]);
    return { ok: true, suppliers, products };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function loadSupplierDetailAction(id) {
  try {
    await ensure();
    const data = await getSupplierDetailAdmin(id);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function loadPurchaseDetailAction(id) {
  try {
    await ensure();
    const data = await getPurchaseDetailAdmin(id);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function loadReportsAction({ from, to }) {
  try {
    await ensure();
    const fromD = new Date(from);
    const toD = new Date(to);
    const [monthly, bySupplier, byCategory, outstanding] = await Promise.all([
      reportMonthlyPurchasesSummary(fromD, toD),
      reportSpendingBySupplier(fromD, toD),
      reportSpendingByCategory(fromD, toD),
      reportOutstandingPayments(),
    ]);
    return { ok: true, monthly, bySupplier, byCategory, outstanding };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

const supplierSchema = z.object({
  name: z.string().trim().min(1).max(300),
  companyName: z.string().trim().max(300).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email().max(200).optional().nullable().or(z.literal("")),
  address: z.string().trim().max(2000).optional().nullable(),
  taxId: z.string().trim().max(120).optional().nullable(),
  paymentTerms: z.string().trim().max(80).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  category: z.string().trim().max(200).optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function createSupplierAction(raw) {
  try {
    await ensure();
    const parsed = supplierSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "validation" };
    const d = parsed.data;
    await db.supplier.create({
      data: {
        name: d.name,
        companyName: d.companyName || null,
        phone: d.phone || null,
        email: d.email || null,
        address: d.address || null,
        taxId: d.taxId || null,
        paymentTerms: d.paymentTerms || null,
        notes: d.notes || null,
        category: d.category || null,
        isActive: d.isActive !== false,
      },
    });
    revalidatePath("/admin/suppliers");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e.message };
  }
}

export async function updateSupplierAction(id, raw) {
  try {
    await ensure();
    const parsed = supplierSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "validation" };
    const d = parsed.data;
    await db.supplier.update({
      where: { id },
      data: {
        name: d.name,
        companyName: d.companyName || null,
        phone: d.phone || null,
        email: d.email || null,
        address: d.address || null,
        taxId: d.taxId || null,
        paymentTerms: d.paymentTerms || null,
        notes: d.notes || null,
        category: d.category || null,
        isActive: d.isActive !== false,
      },
    });
    revalidatePath("/admin/suppliers");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function deleteSupplierAction(id, options = {}) {
  try {
    const user = await ensure();
    const force = options?.force === true;
    if (await supplierHasPurchases(id) && !force) {
      return { ok: false, error: "has_purchases" };
    }
    if (force && user.role !== "ADMIN") {
      return { ok: false, error: "unauthorized_force" };
    }
    await db.$transaction(async (tx) => {
      if (force) {
        await tx.product.updateMany({
          where: { supplierId: id },
          data: { supplierId: null },
        });
        await tx.stockMovement.updateMany({
          where: { supplierId: id },
          data: { supplierId: null },
        });
        await tx.purchase.deleteMany({
          where: { supplierId: id },
        });
      }
      await tx.supplier.delete({ where: { id } });
    });
    revalidatePath("/admin/suppliers");
    revalidatePath("/admin/inventory");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

const purchaseItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(1e6),
  unitCost: z.coerce.number().min(0).max(1e12),
});

const createPurchaseSchema = z.object({
  supplierId: z.string().min(1),
  dueDate: z.string().optional().nullable(),
  invoiceRef: z.string().max(200).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  paymentMethod: z.string().max(80).optional().nullable(),
  paidAmount: z.coerce.number().min(0).optional().default(0),
  receiveNow: z.boolean().optional().default(false),
  items: z.array(purchaseItemSchema).min(1).max(100),
});

export async function createPurchaseAction(raw) {
  try {
    await ensure();
    const parsed = createPurchaseSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "validation" };
    const { supplierId, items, receiveNow, paidAmount, ...rest } = parsed.data;

    const sup = await db.supplier.findFirst({ where: { id: supplierId, isActive: true } });
    if (!sup) return { ok: false, error: "supplier" };

    let total = 0;
    const lines = items.map((i) => {
      const line = Math.round(i.quantity * i.unitCost * 100) / 100;
      total += line;
      return { ...i, lineTotal: line };
    });
    total = Math.round(total * 100) / 100;

    const purchaseNumber = `PO-${Date.now().toString(36).toUpperCase()}`;

    await db.$transaction(async (tx) => {
      const p = await tx.purchase.create({
        data: {
          purchaseNumber,
          supplierId,
          totalAmount: total,
          paidAmount: Math.min(paidAmount, total),
          dueDate: rest.dueDate ? new Date(rest.dueDate) : null,
          invoiceRef: rest.invoiceRef || null,
          notes: rest.notes || null,
          paymentMethod: rest.paymentMethod || null,
          deliveryStatus: receiveNow ? "RECEIVED" : "PENDING",
          items: {
            create: lines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              unitCost: l.unitCost,
              lineTotal: l.lineTotal,
            })),
          },
        },
      });
      if (receiveNow) {
        for (const line of lines) {
          await tx.product.update({
            where: { id: line.productId },
            data: { stock: { increment: line.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              type: "IN",
              quantity: line.quantity,
              productId: line.productId,
              supplierId,
              purchaseId: p.id,
              unitCost: line.unitCost,
              reason: "PURCHASE",
              notes: `PO ${purchaseNumber}`,
            },
          });
        }
      }
    });

    revalidatePath("/admin/suppliers");
    revalidatePath("/admin/inventory");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e.message };
  }
}

export async function markPurchaseReceivedAction(purchaseId) {
  try {
    await ensure();
    if (!purchaseId || typeof purchaseId !== "string") {
      return { ok: false, error: "validation" };
    }

    await db.$transaction(async (tx) => {
      const p = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: { items: true },
      });
      if (!p) {
        throw Object.assign(new Error("not_found"), { code: "NOT_FOUND" });
      }

      if (p.deliveryStatus === "RECEIVED") {
        return;
      }

      const moved = await tx.stockMovement.count({
        where: { purchaseId, type: "IN", reason: "PURCHASE" },
      });
      if (moved > 0) {
        await tx.purchase.update({
          where: { id: purchaseId },
          data: { deliveryStatus: "RECEIVED" },
        });
        return;
      }

      for (const line of p.items) {
        await tx.product.update({
          where: { id: line.productId },
          data: { stock: { increment: line.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            type: "IN",
            quantity: line.quantity,
            productId: line.productId,
            supplierId: p.supplierId,
            purchaseId: p.id,
            unitCost: line.unitCost,
            reason: "PURCHASE",
            notes: `PO ${p.purchaseNumber}`,
          },
        });
      }
      await tx.purchase.update({
        where: { id: purchaseId },
        data: { deliveryStatus: "RECEIVED" },
      });
    });

    revalidatePath("/admin/suppliers");
    revalidatePath("/admin/inventory");
    return { ok: true };
  } catch (e) {
    console.error(e);
    if (e?.code === "NOT_FOUND" || e?.message === "not_found") {
      return { ok: false, error: "not_found" };
    }
    return { ok: false, error: e.message };
  }
}

export async function recordPurchasePaymentAction(purchaseId, raw) {
  try {
    await ensure();
    const schema = z.object({
      amount: z.coerce.number().min(0.01).max(1e12),
      method: z.string().max(80).optional().nullable(),
      notes: z.string().max(2000).optional().nullable(),
    });
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "validation" };

    const p = await db.purchase.findUnique({ where: { id: purchaseId } });
    if (!p) return { ok: false, error: "not_found" };
    const total = Math.round(Number(p.totalAmount) * 100) / 100;
    const paid = Math.round(Number(p.paidAmount) * 100) / 100;
    const remaining = Math.round((total - paid) * 100) / 100;

    if (total <= 0) return { ok: false, error: "invalid_total" };
    if (remaining <= 0.005) return { ok: false, error: "fully_paid" };

    const amount = Math.round(parsed.data.amount * 100) / 100;
    if (amount > remaining + 0.0001) {
      return { ok: false, error: "amount_over_remaining", remaining };
    }

    const next = Math.min(total, Math.round((paid + amount) * 100) / 100);

    await db.purchase.update({
      where: { id: purchaseId },
      data: {
        paidAmount: next,
        paymentMethod: parsed.data.method || p.paymentMethod,
        notes:
          parsed.data.notes && p.notes
            ? `${p.notes}\n[PAYMENT] ${parsed.data.notes}`
            : parsed.data.notes || p.notes,
      },
    });
    revalidatePath("/admin/suppliers");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function deletePurchaseAction(purchaseId, options = {}) {
  try {
    const user = await ensure();
    const force = options?.force === true;
    if (force && user.role !== "ADMIN") {
      return { ok: false, error: "unauthorized_force" };
    }

    const p = await db.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: true },
    });
    if (!p) return { ok: false, error: "not_found" };
    if (!force && p.deliveryStatus !== "PENDING") {
      return { ok: false, error: "blocked" };
    }
    if (!force && Number(p.paidAmount) > 0.005) {
      return { ok: false, error: "has_payment" };
    }
    const movements = await db.stockMovement.findMany({
      where: { purchaseId, type: "IN", reason: "PURCHASE" },
      select: { id: true, productId: true, quantity: true },
    });
    if (!force && movements.length > 0) {
      return { ok: false, error: "has_movements" };
    }

    await db.$transaction(async (tx) => {
      if (force && movements.length > 0) {
        const movedByProduct = movements.reduce((acc, m) => {
          acc[m.productId] = (acc[m.productId] || 0) + Number(m.quantity || 0);
          return acc;
        }, {});
        for (const [productId, movedQty] of Object.entries(movedByProduct)) {
          if (movedQty <= 0) continue;
          const updated = await tx.product.updateMany({
            where: { id: productId, stock: { gte: movedQty } },
            data: { stock: { decrement: movedQty } },
          });
          if (updated.count === 0) {
            throw Object.assign(new Error("stock_conflict"), { code: "STOCK_CONFLICT" });
          }
        }
        await tx.stockMovement.deleteMany({ where: { purchaseId } });
      }

      await tx.purchase.delete({ where: { id: purchaseId } });
    });
    revalidatePath("/admin/suppliers");
    revalidatePath("/admin/inventory");
    return { ok: true };
  } catch (e) {
    if (e?.code === "STOCK_CONFLICT" || e?.message === "stock_conflict") {
      return { ok: false, error: "stock_conflict" };
    }
    return { ok: false, error: e.message };
  }
}

export async function updatePurchaseMetaAction(purchaseId, raw) {
  try {
    await ensure();
    const p = await db.purchase.findUnique({ where: { id: purchaseId } });
    if (!p || p.deliveryStatus === "RECEIVED") return { ok: false, error: "blocked" };
    const schema = z.object({
      dueDate: z.string().optional().nullable(),
      invoiceRef: z.string().max(200).optional().nullable(),
      notes: z.string().max(5000).optional().nullable(),
    });
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "validation" };
    await db.purchase.update({
      where: { id: purchaseId },
      data: {
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        invoiceRef: parsed.data.invoiceRef || null,
        notes: parsed.data.notes || null,
      },
    });
    revalidatePath("/admin/suppliers");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function setPurchaseDeliveryStatusAction(purchaseId, status) {
  try {
    await ensure();
    if (!["PENDING", "PARTIAL"].includes(status)) return { ok: false, error: "validation" };
    const p = await db.purchase.findUnique({ where: { id: purchaseId } });
    if (!p) return { ok: false, error: "not_found" };
    if (p.deliveryStatus === "RECEIVED") return { ok: false, error: "blocked" };
    await db.purchase.update({
      where: { id: purchaseId },
      data: { deliveryStatus: status },
    });
    revalidatePath("/admin/suppliers");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function buildPurchasePdfBuffer(purchase) {
  const PDFDocument = (await import("pdfkit")).default;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text(`Purchase Order ${purchase.purchaseNumber}`, { underline: true });
    doc.moveDown();
    doc.fontSize(11).text(`Supplier: ${purchase.supplier?.name || ""}`);
    doc.text(`Date: ${purchase.createdAt?.toISOString?.().slice(0, 10) || ""}`);
    doc.text(`Invoice ref: ${purchase.invoiceRef || "—"}`);
    doc.moveDown();
    doc.fontSize(12).text("Items", { underline: true });
    purchase.items?.forEach((it, i) => {
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
      }
      doc.fontSize(10).text(
        `${i + 1}. ${it.product?.name || it.productId} × ${it.quantity} @ ${Number(it.unitCost).toLocaleString()} = ${Number(it.lineTotal).toLocaleString()}`
      );
    });
    doc.moveDown();
    doc.fontSize(12).text(`Total: ${Number(purchase.totalAmount).toLocaleString()}`);
    doc.text(`Paid: ${Number(purchase.paidAmount).toLocaleString()}`);
    doc.end();
  });
}

export async function exportPurchasePdfAction(purchaseId) {
  try {
    await ensure();
    const p = await getPurchaseDetailAdmin(purchaseId);
    if (!p) return { ok: false, error: "not_found" };
    const buf = await buildPurchasePdfBuffer(p);
    const safeName = String(p.purchaseNumber || "purchase").replace(/[/\\?%*:|"<>]/g, "-");
    return { ok: true, base64: buf.toString("base64"), filename: `${safeName}.pdf` };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e.message };
  }
}
