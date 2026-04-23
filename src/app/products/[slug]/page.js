import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductDetailClient from "@/components/store/ProductDetailClient";
import { cookies, headers } from "next/headers";
import { translations } from "@/lib/translations";
import { getProductReviewSummary, listApprovedReviews } from "@/lib/reviews";
import {
  getStorefrontProductBySlug,
  getRelatedStoreProducts,
  getTopProductSlugsForStatic,
} from "@/lib/store/products";
import { getOrCreateStoreSettings } from "@/lib/settings";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const rows = await getTopProductSlugsForStatic(100);
    return rows.map((r) => ({ slug: r.id }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getStorefrontProductBySlug(slug);
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  const branding = await getStoreBranding();
  const b = getBrandingForLang(branding, lang);

  if (!product) {
    return { title: lang === "ar" ? "المنتج غير موجود" : "Product Not Found" };
  }

  const displayName =
    lang === "ar" ? product.nameAr || product.name : product.nameEn || product.name;
  const displayDesc =
    lang === "ar"
      ? product.descriptionAr || product.description || ""
      : product.descriptionEn || product.description || "";

  const summary = await getProductReviewSummary(product.id).catch(() => ({ total: 0, average: 0 }));
  const description =
    displayDesc?.slice(0, 160) ||
    (lang === "ar" ? `اشتري ${displayName} من ${b.brandName}.` : `Buy ${displayName} from ${b.brandName}.`);

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "http";
  const base =
    process.env.AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (host ? `${proto}://${host}` : "");

  return {
    title: `${displayName} | ${b.brandName}`,
    description,
    alternates: base ? { canonical: `${base.replace(/\/$/, "")}/products/${slug}` } : undefined,
    openGraph: {
      title: displayName,
      description,
      images: product.images?.[0] ? [{ url: product.images[0], alt: displayName }] : [],
    },
    ...(summary.total > 0
      ? {
          other: {
            "rating-value": String(summary.average.toFixed(1)),
            "rating-count": String(summary.total),
          },
        }
      : {}),
  };
}

export default async function ProductDetailPage({ params }) {
  const { slug } = await params;
  const product = await getStorefrontProductBySlug(slug).catch(() => null);
  if (!product) notFound();

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";

  const [summary, reviewRows, relatedProducts, store, session] = await Promise.all([
    getProductReviewSummary(product.id).catch(() => ({ total: 0, average: 0 })),
    listApprovedReviews({ productId: product.id, page: 1, limit: 5 }).catch(() => ({ rows: [] })),
    getRelatedStoreProducts(product.categoryId, product.id, 8).catch(() => []),
    getOrCreateStoreSettings().catch(() => ({})),
    auth().catch(() => null),
  ]);

  let wishlistInitial = false;
  if (session?.user?.id) {
    try {
      const w = await db.wishlistItem.findUnique({
        where: {
          userId_productId: { userId: session.user.id, productId: product.id },
        },
      });
      wishlistInitial = !!w;
    } catch {
      wishlistInitial = false;
    }
  }

  const displayName =
    lang === "ar" ? product.nameAr || product.name : product.nameEn || product.name;
  const displayDescLong =
    lang === "ar"
      ? product.descriptionAr || product.description || ""
      : product.descriptionEn || product.description || "";

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "http";
  const base =
    process.env.AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (host ? `${proto}://${host}` : "");
  const canonical = base ? `${base.replace(/\/$/, "")}/products/${slug}` : "";

  const storeName = lang === "ar" ? store.nameAr : store.nameEn;
  const availability =
    product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: displayName,
    sku: product.sku,
    image: product.images || [],
    description: displayDescLong || product.description || "",
    brand: { "@type": "Brand", name: storeName },
    offers: {
      "@type": "Offer",
      url: canonical || undefined,
      priceCurrency: store.currency || "SDG",
      price: String(product.sellingPrice),
      availability,
    },
    aggregateRating:
      summary.total > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(summary.average.toFixed(1)),
            reviewCount: summary.total,
          }
        : undefined,
    review: (reviewRows.rows || []).slice(0, 5).map((r) => ({
      "@type": "Review",
      reviewRating: { "@type": "Rating", ratingValue: r.rating },
      author: { "@type": "Person", name: r.reviewerName },
      reviewBody: r.body,
    })),
  };

  const storeBrief = {
    deliveryNotesAr: store.deliveryNotesAr,
    deliveryNotesEn: store.deliveryNotesEn,
    defaultDeliveryEstimateAr: store.defaultDeliveryEstimateAr,
    defaultDeliveryEstimateEn: store.defaultDeliveryEstimateEn,
    returnPolicyAr: store.returnPolicyAr,
    returnPolicyEn: store.returnPolicyEn,
    currency: store.currency,
    shippingZones: (store.shippingZones || []).map((z) => ({
      zoneName: z.zoneName,
      deliveryDaysEstimate: z.deliveryDaysEstimate,
      shippingCost: Number(z.shippingCost),
    })),
  };

  return (
    <main
      className={`min-h-screen bg-background pb-24 lg:pb-10 ${lang === "ar" ? "text-right" : "text-left"}`}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <ProductDetailClient
          product={product}
          relatedProducts={relatedProducts}
          storeBrief={storeBrief}
          reviewSummary={summary}
          wishlistInitial={wishlistInitial}
        />
      </div>
      <Footer />
    </main>
  );
}
