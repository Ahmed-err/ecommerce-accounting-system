"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/context/LanguageContext";

export function Providers({ children, lang, branding }) {
  return (
    <SessionProvider basePath="/api/auth">
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
        enableColorScheme
      >
        <LanguageProvider initialLang={lang} branding={branding}>
          {children}
          <Toaster richColors closeButton />
        </LanguageProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
