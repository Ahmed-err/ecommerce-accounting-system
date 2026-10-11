import { prisma as db } from "@/lib/prisma";
import { getAbsoluteSiteUrl } from "@/lib/site-url";

export const revalidate = 3600;

export default async function sitemap() {
  const base = getAbsoluteSiteUrl();
  let products = [];
  let categories = [];
  try {
    [products, categories] = await Promise.all([
      db.product.findMany({ where: { isActive: true }, select: { id: true, updatedAt: true } }),
      // Only categories with something on sale; links use the id, like the site's own links.
      db.category.findMany({
        where: { products: { some: { isActive: true } } },
        select: { id: true, updatedAt: true },
      }),
    ]);
  } catch {
    // Build/ISR without DB: static URLs only
  }

  const staticPages = [
    { path: "/", changeFrequency: "daily", priority: 1.0 },
    { path: "/products", changeFrequency: "daily", priority: 0.8 },
    { path: "/about", changeFrequency: "monthly", priority: 0.5 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  ].map(({ path, ...rest }) => ({ url: `${base}${path}`, ...rest }));

  return [
    ...staticPages,
    ...categories.map((c) => ({
      url: `${base}/products?category=${encodeURIComponent(c.id)}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${base}/products/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    })),
  ];
}
