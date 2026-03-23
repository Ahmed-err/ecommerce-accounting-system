import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "PowerStore ERP — Electrical Supplies",
  description: "Electrical supplies store with inventory, accounting, and employee management",
};

import { Providers } from "@/components/Providers";
import { UploadthingProvider } from "@/components/UploadthingProvider";
import { CartProvider } from "@/components/store/CartProvider";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
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

