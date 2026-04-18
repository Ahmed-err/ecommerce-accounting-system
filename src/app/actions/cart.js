"use server";

import { prisma } from "@/lib/prisma";

/**
 * Validates cart items against current database stock
 * Returns array of items with stock issues
 */
export async function validateCartStock(cartItems) {
  try {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return { valid: true, issues: [] };
    }

    // Normalize and hard-validate cart shape to prevent quantity abuse.
    // Attacker can tamper with localStorage; server must be strict.
    const normalized = new Map(); // productId -> { id, name, quantity }
    for (const rawItem of cartItems) {
      const id =
        typeof rawItem?.id === "string" && rawItem.id.trim()
          ? rawItem.id.trim()
          : null;
      const name = typeof rawItem?.name === "string" ? rawItem.name : "Unknown";
      const qty =
        typeof rawItem?.quantity === "number"
          ? rawItem.quantity
          : Number(rawItem?.quantity);

      if (!id || !id.trim()) {
        return {
          valid: false,
          issues: [
            { type: "invalid_product", id: null, name, requested: qty },
          ],
        };
      }

      if (!Number.isInteger(qty) || qty <= 0 || qty > 1000) {
        return {
          valid: false,
          issues: [
            {
              id,
              name,
              type: "invalid_quantity",
              requested: qty,
            },
          ],
        };
      }

      const prev = normalized.get(id);
      normalized.set(id, {
        id,
        name,
        quantity: prev ? prev.quantity + qty : qty,
      });
    }

    const issues = [];

    for (const item of normalized.values()) {
      const product = await prisma.product.findUnique({
        where: { id: item.id },
        select: { id: true, name: true, stock: true, isActive: true },
      });

      if (!product) {
        issues.push({
          id: item.id,
          name: item.name,
          type: "not_found",
          available: null,
          requested: item.quantity,
        });
      } else if (!product.isActive) {
        issues.push({
          id: item.id,
          name: item.name,
          type: "inactive",
          available: product.stock,
          requested: item.quantity,
        });
      } else if (product.stock < item.quantity) {
        issues.push({
          id: item.id,
          name: product.name,
          type: "insufficient_stock",
          available: product.stock,
          requested: item.quantity,
        });
      }
    }

    return { 
      valid: issues.length === 0, 
      issues 
    };
  } catch (error) {
    console.error("Stock validation error:", error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Validation failed.";
    return { valid: false, issues: [], error: message || "Validation failed." };
  }
}
