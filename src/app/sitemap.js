import { prisma as db } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_URL || "https://essamnasr.com";
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
  } catch (error) {
    console.error("sitemap db error:", error);
  }

  const locales = ["ar", "en"];
  const paths = ["/", "/about", "/contact", "/shop", "/products", "/login", "/register", "/terms", "/privacy"];
  const staticPages = locales.flatMap((locale) =>
    paths.map((path) => ({
      url: `${BASE_URL}/${locale}${path === "/" ? "" : path}`,
      lastModified: new Date(),
      changeFrequency: path === "/" ? "daily" : "monthly",
      priority: path === "/" ? 1.0 : path === "/shop" || path === "/products" ? 0.8 : 0.5,
    }))
  );

  const productPages = locales.flatMap((locale) =>
    products.map((p) => ({
      url: `${BASE_URL}/${locale}/shop/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }))
  );

  const categoryPages = locales.flatMap((locale) =>
    categories.map((c) => ({
      url: `${BASE_URL}/${locale}/shop?category=${encodeURIComponent(c.name)}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }))
  );

  return [...staticPages, ...productPages, ...categoryPages];
}
