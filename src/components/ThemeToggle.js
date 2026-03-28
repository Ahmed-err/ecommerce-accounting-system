"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  useEffect(() => {
    setMounted(true);
  }, []);

  const cycle = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full" aria-hidden />;
  }

  const Icon =
    theme === "system"
      ? Monitor
      : theme === "light"
        ? Sun
        : Moon;

  const modeLabel =
    theme === "system"
      ? t.themeSystem
      : theme === "light"
        ? t.themeLight
        : t.themeDark;

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "w-9 h-9 rounded-full text-foreground",
        theme === "system" && resolvedTheme === "dark" && "text-amber-400",
        theme === "system" && resolvedTheme === "light" && "text-amber-600"
      )}
      onClick={cycle}
      title={`${t.toggleColorTheme}: ${modeLabel}`}
      aria-label={`${t.toggleColorTheme}. ${t.appearance}: ${modeLabel}`}
    >
      <Icon className="h-5 w-5" />
    </Button>
  );
}
