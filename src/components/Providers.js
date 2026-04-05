"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";

function AppToaster() {
  const { isRTL } = useLanguage();
  return (
    <Toaster
      richColors
      closeButton
      dir={isRTL ? "rtl" : "ltr"}
      position={isRTL ? "bottom-center" : "bottom-right"}
      toastOptions={{
        classNames: {
          toast: "max-w-[min(24rem,calc(100vw-1.5rem))] w-full sm:w-auto",
        },
      }}
    />
  );
}

export function Providers({ children, lang, branding }) {
  return (
    <SessionProvider basePath="/api/auth">
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange={false}
        enableColorScheme
      >
        <LanguageProvider initialLang={lang} branding={branding}>
          {children}
          <AppToaster />
        </LanguageProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
