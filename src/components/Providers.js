"use client";

import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "next-themes";

export function Providers({ children, lang }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
        enableColorScheme
      >
        <LanguageProvider initialLang={lang}>
          {children}
        </LanguageProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
