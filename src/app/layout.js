import { Cairo, Geist_Mono } from "next/font/google";
import "./globals.css";
import { translations } from "@/lib/translations";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang] || translations.en;
  const title = `${t.brandName} — ${t.brandTagline}`;
  const description = t.brandDesc;

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_URL || "https://essamnasr.com"),
    title: { default: title, template: `%s | ${t.brandName}` },
    description,
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: lang === "ar" ? "ar_SD" : "en_US",
      siteName: t.brandName,
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

import { Providers } from "@/components/Providers";
import { CartProvider } from "@/components/store/CartProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { cookies } from "next/headers";

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning className="bg-background overscroll-none">
      <body
        className={`${cairo.variable} ${geistMono.variable} font-sans antialiased bg-background overscroll-none`}
      >
        <Providers lang={lang}>
          <CartProvider>
            {children}
          </CartProvider>
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}

