"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";

const DISMISS_KEY = "pwa_install_dismissed";

export default function PWAInstallPrompt() {
  const { lang, isRTL } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    try {
      const ua = navigator.userAgent || "";
      const iOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
      setIsIOS(iOS);
      const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
      if (dismissed) return;
      const timer = setTimeout(() => setVisible(true), 30000);
      const onPrompt = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener("beforeinstallprompt", onPrompt);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", onPrompt);
      };
    } catch {}
  }, []);

  const text = useMemo(
    () =>
      lang === "ar"
        ? {
            title: "أضف التطبيق إلى الشاشة الرئيسية",
            hint: "افتح المتجر بسرعة من هاتفك.",
            install: "تثبيت",
            dismiss: "إغلاق",
            ios: "في Safari: اضغط مشاركة ثم أضف إلى الشاشة الرئيسية.",
          }
        : {
            title: "Add to Home Screen",
            hint: "Open the store faster from your phone.",
            install: "Install",
            dismiss: "Dismiss",
            ios: "In Safari: tap Share then Add to Home Screen.",
          },
    [lang]
  );

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  const install = async () => {
    try {
      if (!deferredPrompt) return dismiss();
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      dismiss();
    } catch {}
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className={`fixed bottom-4 z-[140] w-[calc(100%-2rem)] max-w-md rounded-2xl border border-amber-500/40 bg-background/95 p-4 shadow-2xl ${isRTL ? "left-4 text-right" : "right-4 text-left"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold">{text.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{isIOS ? text.ios : text.hint}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {!isIOS ? (
            <Button className="bg-amber-500 text-black hover:bg-amber-600" onClick={install}>
              {text.install}
            </Button>
          ) : null}
          <Button variant="outline" onClick={dismiss}>
            {text.dismiss}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
