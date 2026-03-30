import { prisma as db } from "@/lib/prisma";

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_URL || "https://essamnasr.com").replace(
  /\/$/,
  ""
);
export const revalidate = 3600;

export default async function sitemap() {
  let products = [];
  let categories = [];
  try {
    [products, categories] = await Promise.all([
      db.product.findMany({
        where: { isActive: true },
        select: { id: true, updatedAt: true },
      }),
      db.category.findMany({
        select: { name: true },
      }),
    ]);
  } catch {
    // Build/ISR without DB: static URLs only
  }

  const paths = ["/", "/about", "/contact", "/products", "/login", "/register", "/terms", "/privacy"];
  const staticPages = paths.map((path) => ({
    url: path === "/" ? `${BASE_URL}/` : `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" ? "daily" : "monthly",
    priority: path === "/" ? 1.0 : path === "/products" ? 0.8 : 0.5,
  }));

  const productPages = products.map((p) => ({
    url: `${BASE_URL}/products/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const categoryPages = categories.map((c) => ({
    url: `${BASE_URL}/products?category=${encodeURIComponent(c.name)}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...productPages, ...categoryPages];
}
