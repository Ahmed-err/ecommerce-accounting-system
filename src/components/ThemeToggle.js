"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

// Light is the default; "system" is not offered (ThemeProvider has enableSystem={false}).
export function nextTheme(current) {
  return current === "dark" ? "light" : "dark";
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";
  const Icon = isDark ? Moon : Sun;
  const modeLabel = isDark ? t.themeDark : t.themeLight;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-9 h-9 rounded-full text-foreground"
      onClick={() => setTheme(nextTheme(resolvedTheme))}
      title={`${t.toggleColorTheme}: ${modeLabel}`}
      aria-label={`${t.toggleColorTheme}. ${t.appearance}: ${modeLabel}`}
    >
      <Icon className="h-5 w-5" />
    </Button>
  );
}
