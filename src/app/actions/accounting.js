"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAction } from "@/lib/audit";
import {
  resolveRange,
  getDashboardKpis,
  getRevenueStoreVsPosMonthly,
  getExpenseCategoryBreakdown,
  getRecentUnifiedTransactions,
  listLedgerInvoices,
  listSalesInvoices,
  countOverdueLedgerInvoices,
  getRevenueRows,
  getExpenseRows,
  getCogsForOrdersInRange,
  getPlTrend,
  getCashFlowSeries,
  getReportMonthlySummary,
  isSystemGeneratedTransaction,
} from "@/lib/accounting";
import {
  transactionMutationSchema,
  ledgerInvoiceCreateSchema,
  ledgerInvoiceIdSchema,
} from "@/lib/schemas/accounting";

async function ensureAccountingView() {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    throw new Error("Unauthorized: Accounting access denied.");
  }
  return session;
}

async function ensureAccountingAdmin() {
  const session = await ensureAccountingView();
  if (session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin only.");
  }
  return session;
}

function canRoleDeleteTransaction(role, tx) {
  if (!tx) return false;
  if (isSystemGeneratedTransaction(tx)) return false;
  if (role === "ADMIN") return true;
  if (role === "MANAGER") return tx.type === "OUTGOING";
  return false;
}

function parseDateInput(v) {
  if (!v) return new Date();
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export async function getAccountingPermissions() {
  try {
    const session = await ensureAccountingView();
    const canDelete =
      session.user.role === "ADMIN" ||
      (session.user.role === "MANAGER");
    return {
      ok: true,
      role: session.user.role,
      canDelete,
      canBulkDelete: canDelete,
      canMarkLedgerPaid: session.user.role === "ADMIN",
      canExportAll: true,
    };
  } catch {
    return { ok: false, role: null, canDelete: false, canBulkDelete: false, canMarkLedgerPaid: false, canExportAll: false };
  }
}

export async function getSummary() {
  try {
    await ensureAccountingView();
    const [incoming, outgoing, recentTransactions] = await Promise.all([
      db.transaction.aggregate({
        where: { type: "INCOMING" },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: { type: "OUTGOING" },
        _sum: { amount: true },
      }),
      db.transaction.findMany({
        take: 5,
        orderBy: { date: "desc" },
      }),
    ]);

    const totalIn = Number(incoming._sum.amount || 0);
    const totalOut = Number(outgoing._sum.amount || 0);

    return {
      totalIn,
      totalOut,
      netProfit: totalIn - totalOut,
      recentTransactions,
    };
  } catch (error) {
    console.error("Failed to get accounting summary:", error);
    return { totalIn: 0, totalOut: 0, netProfit: 0, recentTransactions: [] };
  }
}

export async function getTransactions({
  search = "",
  type = "all",
  category = "",
  page = 1,
  limit = 10,
} = {}) {
  try {
    await ensureAccountingView();
    const where = {
      ...(search
        ? {
            OR: [
              { description: { contains: search, mode: "insensitive" } },
              { reference: { contains: search, mode: "insensitive" } },
              { category: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(type && type !== "all" ? { type: type.toUpperCase() } : {}),
      ...(category && category !== "all"
        ? { category: { equals: category, mode: "insensitive" } }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      db.transaction.count({ where }),
    ]);

    return { transactions, total };
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return { transactions: [], total: 0 };
  }
}

export async function getCategories() {
  try {
    await ensureAccountingView();
    const rows = await db.transaction.findMany({
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    return rows.map((r) => r.category).filter(Boolean);
  } catch (error) {
    console.error("Failed to fetch transaction categories:", error);
    return [];
  }
}

export async function createTransaction(data) {
  try {
    const session = await ensureAccountingView();
    if (session.user.role === "MANAGER" && data?.type === "INCOMING") {
      return { success: false, error: "Unauthorized: Managers cannot add income entries." };
    }
    const parsed = transactionMutationSchema.safeParse(data);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "validation_failed";
      return { success: false, error: msg };
    }
    const p = parsed.data;
    const transaction = await db.transaction.create({
      data: {
        type: p.type,
        amount: p.amount,
        description: p.description,
        category: p.category,
        reference: p.reference || null,
        date: parseDateInput(p.date),
        paymentMethod: p.paymentMethod || null,
        receiptUrl: p.receiptUrl || null,
      },
    });

    await logAction("CREATE_TRANSACTION", {
      transactionId: transaction.id,
      amount: transaction.amount,
      type: transaction.type,
    });

    revalidatePath("/admin/accounting");
    return { success: true, transaction };
  } catch (error) {
    console.error("Failed to create transaction:", error);
    return { success: false, error: error.message };
  }
}

export async function updateTransaction(id, data) {
  try {
    const session = await ensureAccountingView();
    const existing = await db.transaction.findUnique({ where: { id } });
    if (existing && isSystemGeneratedTransaction(existing)) {
      return { success: false, error: "locked_system_transaction" };
    }
    if (session.user.role === "MANAGER" && data?.type === "INCOMING") {
      return { success: false, error: "Unauthorized" };
    }
    const parsed = transactionMutationSchema.safeParse(data);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "validation_failed";
      return { success: false, error: msg };
    }
    const p = parsed.data;
    const transaction = await db.transaction.update({
      where: { id },
      data: {
        type: p.type,
        amount: p.amount,
        description: p.description,
        category: p.category,
        reference: p.reference || null,
        date: parseDateInput(p.date),
        paymentMethod: p.paymentMethod || null,
        receiptUrl: p.receiptUrl || null,
      },
    });

    await logAction("UPDATE_TRANSACTION", { transactionId: id, amount: transaction.amount });

    revalidatePath("/admin/accounting");
    return { success: true, transaction };
  } catch (error) {
    console.error("Failed to update transaction:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteTransaction(id) {
  try {
    const session = await ensureAccountingView();
    const existing = await db.transaction.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "not_found" };
    }
    if (!canRoleDeleteTransaction(session.user.role, existing)) {
      if (isSystemGeneratedTransaction(existing)) {
        return { success: false, error: "locked_system_transaction" };
      }
      if (session.user.role === "MANAGER" && existing.type === "INCOMING") {
        return { success: false, error: "manager_cannot_delete_income" };
      }
      return { success: false, error: "Unauthorized" };
    }
    await db.transaction.delete({ where: { id } });

    await logAction("DELETE_TRANSACTION", { transactionId: id });

    revalidatePath("/admin/accounting");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    return { success: false, error: error.message };
  }
}

export async function bulkDeleteTransactions(ids) {
  try {
    const session = await ensureAccountingView();
    if (!Array.isArray(ids) || ids.length === 0) {
      return { success: false, error: "no_ids" };
    }
    const rows = await db.transaction.findMany({ where: { id: { in: ids } } });
    const deletable = rows.filter((r) => canRoleDeleteTransaction(session.user.role, r)).map((r) => r.id);
    if (deletable.length === 0) {
      return { success: false, error: "nothing_deletable" };
    }
    await db.transaction.deleteMany({ where: { id: { in: deletable } } });
    await logAction("BULK_DELETE_TRANSACTIONS", { count: deletable.length });
    revalidatePath("/admin/accounting");
    return { success: true, deleted: deletable.length, skipped: ids.length - deletable.length };
  } catch (error) {
    console.error("Bulk delete failed:", error);
    return { success: false, error: error.message };
  }
}

function nextLedgerNumber() {
  return `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export async function createLedgerInvoice(raw) {
  try {
    await ensureAccountingView();
    const parsed = ledgerInvoiceCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "validation_failed" };
    }
    const p = parsed.data;
    const invoice = await db.ledgerInvoice.create({
      data: {
        invoiceNumber: nextLedgerNumber(),
        direction: p.direction,
        partyName: p.partyName,
        amount: p.amount,
        dueDate: p.dueDate ? parseDateInput(p.dueDate) : null,
        notes: p.notes || null,
        status: "PENDING",
      },
    });
    await logAction("CREATE_LEDGER_INVOICE", { id: invoice.id });
    revalidatePath("/admin/accounting");
    return { success: true, invoice };
  } catch (error) {
    console.error("createLedgerInvoice:", error);
    return { success: false, error: error.message };
  }
}

export async function markLedgerInvoicePaid(raw) {
  try {
    await ensureAccountingView();
    const parsed = ledgerInvoiceIdSchema.safeParse(raw);
    if (!parsed.success) return { success: false, error: "validation_failed" };
    const now = new Date();
    const invoice = await db.ledgerInvoice.update({
      where: { id: parsed.data.id },
      data: { status: "PAID", paidAt: now },
    });
    await logAction("MARK_LEDGER_PAID", { id: invoice.id });
    revalidatePath("/admin/accounting");
    return { success: true, invoice };
  } catch (error) {
    console.error("markLedgerInvoicePaid:", error);
    return { success: false, error: error.message };
  }
}

export async function getAccountingTabData(tab, query = {}) {
  try {
    await ensureAccountingView();
    const preset = query.rangePreset || "month";
    const { start, end } = resolveRange(preset, query.customFrom, query.customTo);
    const overdue = await countOverdueLedgerInvoices();

    switch (tab) {
      case "dashboard": {
        const [kpis, stacked, pie, recent] = await Promise.all([
          getDashboardKpis({ start, end }),
          getRevenueStoreVsPosMonthly({ start, end }),
          getExpenseCategoryBreakdown({ start, end }),
          getRecentUnifiedTransactions(10, { start, end }),
        ]);
        return {
          ok: true,
          tab,
          range: { start: start.toISOString(), end: end.toISOString(), preset },
          kpis,
          stacked,
          pie,
          recent,
          overdueCount: overdue,
        };
      }
      case "revenues": {
        const [rev, exp] = await Promise.all([
          getRevenueRows({
            start,
            end,
            source: query.source || "all",
            paymentMethod: query.paymentMethod || "all",
          }),
          getExpenseRows({
            start,
            end,
            category: query.expenseCategory || "all",
            paymentMethod: query.expensePaymentMethod || "all",
          }),
        ]);
        return {
          ok: true,
          tab,
          range: { start: start.toISOString(), end: end.toISOString(), preset },
          revenues: rev,
          expenses: exp,
          overdueCount: overdue,
        };
      }
      case "pl": {
        const gran = query.plGranularity || "monthly";
        const [statement, trend] = await Promise.all([
          getCogsForOrdersInRange({ start, end }),
          getPlTrend({ start, end, granularity: gran }),
        ]);
        return {
          ok: true,
          tab,
          range: { start: start.toISOString(), end: end.toISOString(), preset },
          statement,
          trend,
          granularity: gran,
          overdueCount: overdue,
        };
      }
      case "cashflow": {
        const series = await getCashFlowSeries({ start, end });
        return {
          ok: true,
          tab,
          range: { start: start.toISOString(), end: end.toISOString(), preset },
          ...series,
          overdueCount: overdue,
        };
      }
      case "invoices": {
        const [ledger, sales] = await Promise.all([
          listLedgerInvoices({
            status: query.invoiceStatus || "all",
            direction: query.invoiceDirection || "all",
            start,
            end,
          }),
          listSalesInvoices({
            start,
            end,
            statusFilter: query.invoiceStatus || "all",
          }),
        ]);
        return {
          ok: true,
          tab,
          range: { start: start.toISOString(), end: end.toISOString(), preset },
          ledger,
          sales,
          overdueCount: overdue,
        };
      }
      case "expenses": {
        const [exp, pie] = await Promise.all([
          getExpenseRows({
            start,
            end,
            category: query.category || "all",
            paymentMethod: query.paymentMethod || "all",
          }),
          getExpenseCategoryBreakdown({ start, end }),
        ]);
        return {
          ok: true,
          tab,
          range: { start: start.toISOString(), end: end.toISOString(), preset },
          expenses: exp,
          pie,
          overdueCount: overdue,
        };
      }
      case "reports": {
        const report = await getReportMonthlySummary({ start, end });
        return {
          ok: true,
          tab,
          range: { start: start.toISOString(), end: end.toISOString(), preset },
          report,
          overdueCount: overdue,
        };
      }
      default:
        return { ok: false, error: "unknown_tab" };
    }
  } catch (error) {
    console.error("getAccountingTabData:", error);
    return { ok: false, error: error.message };
  }
}
