"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAction } from "@/lib/audit";

async function ensureAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Only Admins can access accounting data.");
  }
}

export async function getSummary() {
  try {
    await ensureAdmin();
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

    const totalIn = incoming._sum.amount || 0;
    const totalOut = outgoing._sum.amount || 0;

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
    await ensureAdmin();
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
      ...(category && category !== "all" ? { category: { equals: category, mode: "insensitive" } } : {}),
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
    await ensureAdmin();
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
    await ensureAdmin();
    const transaction = await db.transaction.create({
      data: {
        type: data.type,
        amount: parseFloat(data.amount),
        description: data.description,
        category: data.category,
        reference: data.reference || null,
        date: data.date ? new Date(data.date) : new Date(),
      },
    });
    
    await logAction("CREATE_TRANSACTION", { transactionId: transaction.id, amount: transaction.amount, type: transaction.type });
    
    revalidatePath("/admin/accounting");
    return { success: true, transaction };
  } catch (error) {
    console.error("Failed to create transaction:", error);
    return { success: false, error: error.message };
  }
}

export async function updateTransaction(id, data) {
  try {
    await ensureAdmin();
    const transaction = await db.transaction.update({
      where: { id },
      data: {
        type: data.type,
        amount: parseFloat(data.amount),
        description: data.description,
        category: data.category,
        reference: data.reference || null,
        date: data.date ? new Date(data.date) : new Date(),
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
    await ensureAdmin();
    await db.transaction.delete({ where: { id } });
    
    await logAction("DELETE_TRANSACTION", { transactionId: id });
    
    revalidatePath("/admin/accounting");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    return { success: false, error: error.message };
  }
}
