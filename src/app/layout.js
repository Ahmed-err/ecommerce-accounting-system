import { Cairo, Geist_Mono } from "next/font/google";
import "./globals.css";
import { translations } from "@/lib/translations";
import PWAInstallPrompt from "@/components/store/PWAInstallPrompt";
import ServiceWorkerRegistration from "@/components/store/ServiceWorkerRegistration";
import { Providers } from "@/components/Providers";
import { CartProvider } from "@/components/store/CartProvider";
import { cookies } from "next/headers";
import { validateEnv } from "@/lib/env";
import { getAbsoluteSiteUrl } from "@/lib/site-url";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";
import { normalizeAppLang } from "@/lib/i18n-lang";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f59e0b",
};

export async function generateMetadata() {
  validateEnv();
  const cookieStore = await cookies();
  const lang = normalizeAppLang(cookieStore.get("lang")?.value);
  const t = translations[lang] || translations.ar;
  const branding = await getStoreBranding();
  const b = getBrandingForLang(branding, lang);
  const title = `${b.brandName} — ${b.brandTagline}`;
  const description = t.brandDesc;

  return {
    metadataBase: new URL(`${getAbsoluteSiteUrl()}/`),
    title: { default: title, template: `%s | ${b.brandName}` },
    description,
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: lang === "ar" ? "ar_SD" : "en_US",
      siteName: b.brandName,
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
    manifest: "/manifest.json",
    icons: {
      apple: "/icons/icon-192.svg",
      icon: [
        { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
        { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
      ],
    },
    other: {
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "default",
    },
  };
}

export default async function RootLayout({ children }) {
  validateEnv();
  const cookieStore = await cookies();
  const lang = normalizeAppLang(cookieStore.get("lang")?.value);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const branding = await getStoreBranding();

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning className="bg-background overflow-x-hidden">
      <body
        className={`${cairo.variable} ${geistMono.variable} font-sans antialiased bg-background min-w-0 overflow-x-hidden min-h-dvh`}
      >
        <Providers lang={lang} branding={branding}>
          <CartProvider>
            {children}
            <ServiceWorkerRegistration />
            <PWAInstallPrompt />
          </CartProvider>
        </Providers>
      </body>
    </html>
  );
}

