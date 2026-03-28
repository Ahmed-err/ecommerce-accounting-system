import { prisma as db } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_URL || "https://essamnasr.com";

export default async function sitemap() {
  const products = await db.product.findMany({
    where: { isActive: true },
    select: { id: true, updatedAt: true },
  });

  const categories = await db.category.findMany({
    select: { name: true },
  });

  const staticPages = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/products`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  const productPages = products.map((p) => ({
    url: `${BASE_URL}/products/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categoryPages = categories.map((c) => ({
    url: `${BASE_URL}/products?category=${encodeURIComponent(c.name)}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...productPages, ...categoryPages];
}
