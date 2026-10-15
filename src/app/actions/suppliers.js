"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";
import { z } from "zod";
import { bookSupplierPayment } from "@/lib/ledger";
import { changeStock, notifyLowStock, StockError } from "@/lib/stock";
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

/**
 * Put a purchase's lines into stock through the stock log, and make each product's cost the
 * price just paid (owner, 2026-10-15: latest purchase price). Returns the stock changes.
 */
async function receiveLines(tx, purchase, userId) {
  const changes = [];
  for (const line of purchase.items) {
    changes.push(
      await changeStock(tx, {
        productId: line.productId,
        delta: line.quantity,
        reason: "PURCHASE",
        userId,
        supplierId: purchase.supplierId,
        purchaseId: purchase.id,
        unitCost: Number(line.unitCost),
        notes: `PO ${purchase.purchaseNumber}`,
      })
    );
    await tx.product.update({ where: { id: line.productId }, data: { purchasePrice: line.unitCost } });
  }
  return changes;
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
    // Decimals become strings so the result can cross to the browser.
    return { ok: true, data: data ? JSON.parse(JSON.stringify(data)) : null };
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
    const supplier = await db.supplier.create({
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
    return { ok: true, supplier };
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

/** Only a supplier with no purchases can be deleted; others are deactivated instead (A-36). */
export async function deleteSupplierAction(id) {
  try {
    await ensure();
    if (await supplierHasPurchases(id)) {
      return { ok: false, error: "has_purchases" };
    }
    await db.$transaction(async (tx) => {
      await tx.product.updateMany({ where: { supplierId: id }, data: { supplierId: null } });
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
    const user = await ensure();
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
      await bookSupplierPayment(tx, { purchase: p, amount: Math.min(paidAmount, total), by: user.name || user.email });
      if (receiveNow) await receiveLines(tx, { ...p, items: lines }, user.id);
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
    const user = await ensure();
    if (!purchaseId || typeof purchaseId !== "string") {
      return { ok: false, error: "validation" };
    }

    const changes = await db.$transaction(async (tx) => {
      const p = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: { items: true },
      });
      if (!p) {
        throw Object.assign(new Error("not_found"), { code: "NOT_FOUND" });
      }
      if (p.deliveryStatus === "RECEIVED" || p.deliveryStatus === "CANCELLED") return [];

      // Claim it first so two clicks can't receive twice.
      const claimed = await tx.purchase.updateMany({
        where: { id: purchaseId, deliveryStatus: p.deliveryStatus },
        data: { deliveryStatus: "RECEIVED" },
      });
      if (claimed.count === 0) return [];

      // Older purchases may already have their stock in (received before the status was set).
      const moved = await tx.stockMovement.count({
        where: { purchaseId, type: "IN", reason: "PURCHASE" },
      });
      if (moved > 0) return [];
      return receiveLines(tx, p, user.id);
    });

    await notifyLowStock(changes);
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
    const user = await ensure();
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

    await db.$transaction(async (tx) => {
      // Only if nobody else paid in the meantime, so the cash book gets one row per payment.
      const res = await tx.purchase.updateMany({
        where: { id: purchaseId, paidAmount: p.paidAmount },
        data: {
          paidAmount: next,
          paymentMethod: parsed.data.method || p.paymentMethod,
          notes:
            parsed.data.notes && p.notes
              ? `${p.notes}\n[PAYMENT] ${parsed.data.notes}`
              : parsed.data.notes || p.notes,
        },
      });
      if (res.count === 0) throw new Error("payment_changed");
      await bookSupplierPayment(tx, { purchase: p, amount, method: parsed.data.method, by: user.name || user.email });
    });
    revalidatePath("/admin/accounting");
    revalidatePath("/admin/suppliers");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** Delete a purchase entered by mistake: only while nothing was received or paid. */
export async function deletePurchaseAction(purchaseId) {
  try {
    await ensure();
    const p = await db.purchase.findUnique({ where: { id: purchaseId } });
    if (!p) return { ok: false, error: "not_found" };
    const received = p.deliveryStatus === "RECEIVED" || p.deliveryStatus === "CANCELLED";
    const moved = received ? 1 : await db.stockMovement.count({ where: { purchaseId } });
    if (received || moved > 0 || Number(p.paidAmount) > 0.005) {
      return { ok: false, error: "use_cancel" };
    }
    await db.purchase.delete({ where: { id: purchaseId } });
    revalidatePath("/admin/suppliers");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Cancel a purchase that was received or paid (admin): received stock goes back out through the
 * stock log (history kept) and anything paid is booked back as a supplier refund. Replaces the
 * old force-delete, which erased stock history and left payments in the cash book.
 */
export async function cancelPurchaseAction(purchaseId) {
  try {
    const user = await ensure();
    if (user.role !== "ADMIN") return { ok: false, error: "unauthorized" };

    const changes = await db.$transaction(async (tx) => {
      const p = await tx.purchase.findUnique({ where: { id: purchaseId }, include: { items: true } });
      if (!p) throw Object.assign(new Error("not_found"), { code: "NOT_FOUND" });
      const claimed = await tx.purchase.updateMany({
        where: { id: purchaseId, deliveryStatus: { not: "CANCELLED" } },
        data: { deliveryStatus: "CANCELLED" },
      });
      if (claimed.count === 0) throw new Error("already_cancelled");

      const out = [];
      const received = await tx.stockMovement.count({ where: { purchaseId, type: "IN", reason: "PURCHASE" } });
      if (received > 0) {
        for (const line of p.items) {
          try {
            out.push(
              await changeStock(tx, {
                productId: line.productId,
                delta: -line.quantity,
                reason: "PURCHASE_CANCEL",
                userId: user.id,
                supplierId: p.supplierId,
                purchaseId: p.id,
                notes: `PO ${p.purchaseNumber}`,
              })
            );
          } catch (e) {
            if (e instanceof StockError) throw Object.assign(new Error("stock_conflict"), { code: "STOCK_CONFLICT" });
            throw e;
          }
        }
      }

      const paid = Math.round(Number(p.paidAmount) * 100) / 100;
      if (paid > 0) {
        await tx.transaction.create({
          data: {
            type: "INCOMING",
            amount: paid,
            description: `Supplier refund - ${p.purchaseNumber} cancelled (by ${user.name || user.email})`,
            category: "Supplier refund",
            reference: p.purchaseNumber,
            source: "SUPPLIER",
            sourceId: p.id,
            date: new Date(),
          },
        });
      }
      return out;
    });

    await notifyLowStock(changes);
    revalidatePath("/admin/suppliers");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/accounting");
    return { ok: true };
  } catch (e) {
    if (e?.code === "STOCK_CONFLICT") return { ok: false, error: "stock_conflict" };
    if (e?.code === "NOT_FOUND") return { ok: false, error: "not_found" };
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
