"use client";

import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children, lang }) {
  return (
    <SessionProvider basePath="/api/auth">
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
        enableColorScheme
      >
        <LanguageProvider initialLang={lang}>
          {children}
          <Toaster richColors closeButton />
        </LanguageProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
