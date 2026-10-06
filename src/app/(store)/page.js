import { getHomepageData } from "@/lib/store/homepage";
import dynamic from "next/dynamic";
import HeroSlider from "@/components/HeroSlider";
import CategoriesStrip from "@/components/CategoriesStrip";
import TrustBadges from "@/components/TrustBadges";
import PromoOffer from "@/components/PromoOffer";
import AboutTeaser from "@/components/AboutTeaser";
import ProductShowcase from "@/components/home/ProductShowcase";
import { translations } from "@/lib/translations";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";
import { cookies } from "next/headers";
import { jsonLdHtml } from "@/lib/json-ld";
import { getAbsoluteSiteUrl } from "@/lib/site-url";
import HomeHero from "@/components/home/HomeHero";

const BrandsMarquee = dynamic(() => import("@/components/home/BrandsMarquee"));
const NewsletterSection = dynamic(() => import("@/components/home/NewsletterSection"));

export default async function HomePage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const isRTL = lang === "ar";

  const { banners, categories, brands, heroProducts, productTotal, featured, featuredOffer } = await getHomepageData();
  const hasFeaturedProducts = (featured?.catalogActiveCount ?? 0) > 0;
  const branding = await getStoreBranding();
  const b = getBrandingForLang(branding, lang);

  const t = translations[lang];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: b.brandName,
    description: t.brandDesc,
    url: getAbsoluteSiteUrl(),
    address: { "@type": "PostalAddress", addressLocality: "Khartoum", addressCountry: "SD" },
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: b.brandName,
    url: getAbsoluteSiteUrl(),
    inLanguage: lang,
  };

  return (
    <div
      className={`bg-background text-foreground flex flex-col ${isRTL ? "font-arabic text-right" : "font-sans text-left"}`}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(websiteJsonLd) }} />
      
      <div id="home-main" className={`relative z-0 flex-grow ${isRTL ? "text-right" : "text-left"}`}>
        {/* 1. Hero: real products in layered depth */}
        <HomeHero products={heroProducts} total={productTotal} brands={brands} />

        {/* Banners the admin created (none = section hidden) */}
        {banners.length ? (
          <section aria-label={isRTL ? "العروض" : "Offers"}>
            <HeroSlider banners={banners} />
          </section>
        ) : null}

        {/* Categories with real product photos */}
        <CategoriesStrip categories={categories} />

        {/* 5. Product Showcase (only when there are active storefront products) */}
        {hasFeaturedProducts && (
          <section aria-label={isRTL ? "منتجات مميزة" : "Featured products"}>
            <ProductShowcase featured={featured} />
          </section>
        )}

        {/* Real brands */}
        <BrandsMarquee brands={brands} />

        {/* Trust badges */}
        <div className="border-b border-foreground/5 relative z-10" aria-label={isRTL ? "مزايا المتجر" : "Store trust badges"}>
           <TrustBadges />
        </div>

        {/* 6. Special Promo Offer */}
        {featuredOffer && (
          <section aria-label={isRTL ? "العرض الخاص" : "Special offer"}>
            <PromoOffer offer={featuredOffer} />
          </section>
        )}

        {/* 7. About Teaser */}
        <section aria-label={isRTL ? "عن المحل" : "About the store"}>
          <AboutTeaser />
        </section>

        {/* 8. Newsletter Section */}
        <section aria-label={isRTL ? "النشرة البريدية" : "Newsletter signup"}>
          <NewsletterSection />
        </section>
      </div>
      
      
    </div>
  );
}
