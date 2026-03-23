import { Cairo, Geist_Mono } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "باور ستور — حلول الإمدادات الكهربائية",
  description: "المتجر المتكامل لمستلزمات الكهرباء مع نظام إدارة المخزون والمحاسبة والموظفين",
};

import { Providers } from "@/components/Providers";
import { UploadthingProvider } from "@/components/UploadthingProvider";
import { CartProvider } from "@/components/store/CartProvider";

import { cookies } from "next/headers";

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <html lang={lang} dir={dir}>
      <body
        className={`${cairo.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <UploadthingProvider />
        <Providers>
          <CartProvider>
            {children}
          </CartProvider>
        </Providers>
      </body>
    </html>
  );
}

