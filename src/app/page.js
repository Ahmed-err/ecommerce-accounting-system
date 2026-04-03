import { getHomepageData } from "@/lib/store/homepage";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSlider from "@/components/HeroSlider";
import CategoriesStrip from "@/components/CategoriesStrip";
import TrustBadges from "@/components/TrustBadges";
import PromoOffer from "@/components/PromoOffer";
import AboutTeaser from "@/components/AboutTeaser";
import ProductShowcase from "@/components/home/ProductShowcase";
import { translations } from "@/lib/translations";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";
import { cookies } from "next/headers";

const BrandsMarquee = dynamic(() => import("@/components/home/BrandsMarquee"));
const NewsletterSection = dynamic(() => import("@/components/home/NewsletterSection"));

export const revalidate = 300;

export default async function HomePage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const isRTL = lang === "ar";

  const { banners, categories, featured, featuredOffer } = await getHomepageData();
  const hasFeaturedProducts = (featured?.catalogActiveCount ?? 0) > 0;
  const branding = await getStoreBranding();
  const b = getBrandingForLang(branding, lang);

  const t = translations[lang];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: b.brandName,
    description: t.brandDesc,
    url: process.env.NEXT_PUBLIC_URL || "https://essamnasr.com",
    address: { "@type": "PostalAddress", addressLocality: "Khartoum", addressCountry: "SD" },
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: b.brandName,
    url: process.env.NEXT_PUBLIC_URL || "https://essamnasr.com",
    inLanguage: lang,
  };

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`min-h-screen bg-background text-foreground flex flex-col ${isRTL ? "font-arabic text-right" : "font-sans text-left"}`}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <a
        href="#home-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 z-[9999] bg-amber-500 text-black px-4 py-2 rounded-lg font-bold shadow-lg ring-2 ring-amber-600/30"
      >
        {isRTL ? "تجاوز إلى المحتوى الرئيسي" : "Skip to main content"}
      </a>
      <Navbar />
      
      <main id="home-main" className={`relative z-0 flex-grow ${isRTL ? "text-right" : "text-left"}`}>
        {/* 1. Hero Slider */}
        <section aria-label={isRTL ? "العروض الرئيسية" : "Hero banners"}>
          <HeroSlider banners={banners} />
        </section>

        {/* 2. Trust Badges */}
        <div className="border-b border-foreground/5 relative z-10" aria-label={isRTL ? "مزايا المتجر" : "Store trust badges"}>
           <TrustBadges />
        </div>

        {/* 3. Brands Marquee */}
        <BrandsMarquee />

        {/* 4. Categories Strip */}
        <section aria-label={isRTL ? "فئات المنتجات" : "Product categories"}>
          <CategoriesStrip categories={categories} />
        </section>

        {/* 5. Product Showcase (only when there are active storefront products) */}
        {hasFeaturedProducts && (
          <section aria-label={isRTL ? "منتجات مميزة" : "Featured products"}>
            <ProductShowcase featured={featured} />
          </section>
        )}

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
      </main>
      
      <Footer />
      
      {/* Decorative Blur Elements — subtle in light, richer in dark */}
      <div className="fixed top-0 -left-1/4 w-1/2 h-1/2 bg-amber-500/[0.06] dark:bg-amber-500/10 blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 -right-1/4 w-1/2 h-1/2 bg-orange-500/[0.05] dark:bg-orange-600/10 blur-[120px] pointer-events-none -z-10" />
    </div>
  );
}
