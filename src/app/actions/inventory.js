"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCategories() {
  try {
    return await db.category.findMany({
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return [];
  }
}

export async function getProducts({ search = "", categoryId = "", status = "all", sort = "newest", page = 1, limit = 10 }) {
  try {
    const where = {
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } }
        ]
      } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(status === "out" ? { stock: 0 } : {}),
      isActive: true, // Only show active products by default
    };

    const skip = (page - 1) * limit;

    let orderBy = { createdAt: "desc" };
    let rawOrderBy = 'ORDER BY p."createdAt" DESC';

    switch (sort) {
      case "price_asc":
        orderBy = { sellingPrice: "asc" };
        rawOrderBy = 'ORDER BY p."sellingPrice" ASC';
        break;
      case "price_desc":
        orderBy = { sellingPrice: "desc" };
        rawOrderBy = 'ORDER BY p."sellingPrice" DESC';
        break;
      case "stock_asc":
        orderBy = { stock: "asc" };
        rawOrderBy = 'ORDER BY p."stock" ASC';
        break;
      case "stock_desc":
        orderBy = { stock: "desc" };
        rawOrderBy = 'ORDER BY p."stock" DESC';
        break;
      case "name_asc":
        orderBy = { name: "asc" };
        rawOrderBy = 'ORDER BY p."name" ASC';
        break;
    }

    let products;
    let total;

    if (status === "low") {
      const totalLowStock = await db.$queryRaw`SELECT COUNT(*)::int as count FROM "Product" WHERE "stock" <= "minStock" AND "isActive" = true`;
      total = Number(totalLowStock[0].count);

      let rawQuery;
      // Using manual string concatenation for ORDER BY because Prisma $queryRaw doesn't support dynamic order by in template literals well
      // But we must be careful with SQL injection. Since rawOrderBy is hardcoded in the switch above, it's safe.
      if (sort === "price_asc") {
        rawQuery = db.$queryRaw`SELECT p.*, c.name as "categoryName" FROM "Product" p LEFT JOIN "Category" c ON p."categoryId" = c.id WHERE p."stock" <= p."minStock" AND p."isActive" = true ORDER BY p."sellingPrice" ASC LIMIT ${limit} OFFSET ${skip}`;
      } else if (sort === "price_desc") {
        rawQuery = db.$queryRaw`SELECT p.*, c.name as "categoryName" FROM "Product" p LEFT JOIN "Category" c ON p."categoryId" = c.id WHERE p."stock" <= p."minStock" AND p."isActive" = true ORDER BY p."sellingPrice" DESC LIMIT ${limit} OFFSET ${skip}`;
      } else if (sort === "stock_asc") {
        rawQuery = db.$queryRaw`SELECT p.*, c.name as "categoryName" FROM "Product" p LEFT JOIN "Category" c ON p."categoryId" = c.id WHERE p."stock" <= p."minStock" AND p."isActive" = true ORDER BY p."stock" ASC LIMIT ${limit} OFFSET ${skip}`;
      } else if (sort === "stock_desc") {
        rawQuery = db.$queryRaw`SELECT p.*, c.name as "categoryName" FROM "Product" p LEFT JOIN "Category" c ON p."categoryId" = c.id WHERE p."stock" <= p."minStock" AND p."isActive" = true ORDER BY p."stock" DESC LIMIT ${limit} OFFSET ${skip}`;
      } else if (sort === "name_asc") {
        rawQuery = db.$queryRaw`SELECT p.*, c.name as "categoryName" FROM "Product" p LEFT JOIN "Category" c ON p."categoryId" = c.id WHERE p."stock" <= p."minStock" AND p."isActive" = true ORDER BY p."name" ASC LIMIT ${limit} OFFSET ${skip}`;
      } else {
        rawQuery = db.$queryRaw`SELECT p.*, c.name as "categoryName" FROM "Product" p LEFT JOIN "Category" c ON p."categoryId" = c.id WHERE p."stock" <= p."minStock" AND p."isActive" = true ORDER BY p."createdAt" DESC LIMIT ${limit} OFFSET ${skip}`;
      }
      
      products = await rawQuery;
      
      products = products.map(p => ({
        ...p,
        category: { name: p.categoryName }
      }));
    } else {
      [products, total] = await Promise.all([
        db.product.findMany({
          where,
          include: { category: true },
          orderBy,
          skip,
          take: limit,
        }),
        db.product.count({ where }),
      ]);
    }

    return { products, total };
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return { products: [], total: 0 };
  }
}

export async function createProduct(data) {
  try {
    const product = await db.product.create({
      data: {
        name: data.name,
        description: data.description,
        sku: data.sku,
        purchasePrice: parseFloat(data.purchasePrice),
        sellingPrice: parseFloat(data.sellingPrice),
        stock: parseInt(data.stock),
        minStock: parseInt(data.minStock),
        categoryId: data.categoryId,
        images: data.images || [],
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
    revalidatePath("/admin/inventory");
    return { success: true, product };
  } catch (error) {
    console.error("Failed to create product:", error);
    return { success: false, error: error.message };
  }
}

export async function updateProduct(id, data) {
  try {
    const product = await db.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        sku: data.sku,
        purchasePrice: parseFloat(data.purchasePrice),
        sellingPrice: parseFloat(data.sellingPrice),
        stock: parseInt(data.stock),
        minStock: parseInt(data.minStock),
        categoryId: data.categoryId,
        images: data.images || [],
        isActive: data.isActive,
      },
    });
    revalidatePath("/admin/inventory");
    return { success: true, product };
  } catch (error) {
    console.error("Failed to update product:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteProduct(id) {
  try {
    // Try to delete physically
    await db.product.delete({ where: { id } });
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (error) {
    // If it's used in orders, soft delete
    console.error("Physical delete failed, attempting soft delete", error);
    try {
      await db.product.update({
        where: { id },
        data: { isActive: false },
      });
      revalidatePath("/admin/inventory");
      return { success: true, softDeleted: true };
    } catch (softError) {
      return { success: false, error: softError.message };
    }
  }
}
