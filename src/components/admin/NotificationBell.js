"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

function timeAgo(value, lang) {
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (diff < 60) return lang === "ar" ? "الآن" : "now";
  if (diff < 3600) return lang === "ar" ? `منذ ${Math.floor(diff / 60)} د` : `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return lang === "ar" ? `منذ ${Math.floor(diff / 3600)} س` : `${Math.floor(diff / 3600)}h`;
  return lang === "ar" ? `منذ ${Math.floor(diff / 86400)} ي` : `${Math.floor(diff / 86400)}d`;
}

export default function NotificationBell({ customerOnly = false }) {
  const { lang, isRTL } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [unread, setUnread] = useState(0);
  const sseFailCountRef = useRef(0);
  const lastSeenRef = useRef(null);
  const timerRef = useRef(null);
  const sourceRef = useRef(null);
  const rootRef = useRef(null);

  const typeQuery = customerOnly ? "&type=ORDER_STATUS" : "";

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?limit=20${typeQuery}`, { cache: "no-store" });
      const json = await res.json();
      if (!json?.ok) return;
      setRows(json.rows || []);
      setUnread(json.unread || 0);
      if (json.rows?.[0]?.createdAt) {
        lastSeenRef.current = json.rows[0].createdAt;
      }
    } catch {}
  }, [typeQuery]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (open) fetchList();
  }, [open, fetchList]);

  useEffect(() => {
    let canceled = false;

    const startSse = () => {
      if (canceled) return;
      const lastSeen = lastSeenRef.current ? `?lastSeen=${encodeURIComponent(lastSeenRef.current)}` : "";
      const es = new EventSource(`/api/notifications/stream${lastSeen}`);
      sourceRef.current = es;

      es.addEventListener("notifications", (event) => {
        try {
          const payload = JSON.parse(event.data || "{}");
          const incoming = Array.isArray(payload.rows) ? payload.rows : [];
          if (!incoming.length) return;
          setRows((prev) => {
            const map = new Map(prev.map((r) => [r.id, r]));
            for (const n of incoming) map.set(n.id, n);
            return Array.from(map.values())
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 20);
          });
          setUnread((v) => v + incoming.filter((n) => !n.read).length);
          lastSeenRef.current = incoming[incoming.length - 1]?.createdAt || lastSeenRef.current;
          sseFailCountRef.current = 0;
        } catch {}
      });

      es.onerror = () => {
        es.close();
        sseFailCountRef.current += 1;
        const next = Math.min(5000 * sseFailCountRef.current, 30000);
        timerRef.current = setTimeout(() => {
          if (!canceled) startSse();
        }, next);
      };
    };

    startSse();
    return () => {
      canceled = true;
      if (sourceRef.current) sourceRef.current.close();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const poll = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      fetchList();
    }, 30000);
    return () => clearInterval(poll);
  }, [fetchList]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const markOne = async (id, link) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => {});
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, read: true } : r)));
    setUnread((v) => Math.max(0, v - 1));
    setOpen(false);
    if (link) router.push(link);
  };

  const markAll = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
    setRows((prev) => prev.map((r) => ({ ...r, read: true })));
    setUnread(0);
  };

  const title = useMemo(() => (lang === "ar" ? "الإشعارات" : "Notifications"), [lang]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className="relative h-10 w-10 rounded-full border border-border bg-muted text-foreground hover:bg-accent"
        aria-haspopup="menu"
        aria-expanded={open}
        type="button"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {unread > 0 ? (
          <span className={`absolute -top-1 ${isRTL ? "-left-1" : "-right-1"} h-5 min-w-5 px-1 rounded-full bg-red-500 text-foreground dark:text-white text-[10px] font-black flex items-center justify-center`}>
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div
          className={cn(
            "z-[200] max-h-[min(65vh,calc(100dvh-5rem))] rounded-2xl border border-border bg-popover/95 p-3 text-popover-foreground shadow-2xl",
            // Mobile: fixed between screen edges (no translate — fixes RTL / overflow-x-hidden clipping)
            "fixed top-16 left-3 right-3 w-auto sm:left-auto sm:right-auto",
            // Desktop: align like user account dropdown so panel stays in viewport in Arabic
            "sm:absolute sm:top-full sm:mt-2 sm:max-h-[65vh] sm:w-[min(24rem,calc(100vw-2rem))]",
            isRTL ? "sm:left-0 sm:right-auto" : "sm:right-0 sm:left-auto"
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">{title}</p>
            <Button size="sm" variant="ghost" className="h-8 px-2 text-[11px] text-muted-foreground hover:text-foreground" onClick={markAll} type="button">
              <CheckCheck className="h-4 w-4 me-1" />
              {lang === "ar" ? "تحديد الكل كمقروء" : "Mark all as read"}
            </Button>
          </div>
          <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto space-y-2 pe-1 sm:max-h-[min(65vh,32rem)]">
            {rows.length ? rows.map((n) => (
              <button
                key={n.id}
                onClick={() => markOne(n.id, n.link)}
                className={`w-full rounded-xl border p-3 transition ${isRTL ? "text-right" : "text-left"} ${n.read ? "border-border bg-muted/50" : "border-amber-500/40 bg-amber-500/10"}`}
                type="button"
              >
                <p className="text-sm font-semibold text-foreground">{lang === "ar" ? n.titleAr : n.titleEn}</p>
                <p className="mt-1 text-xs text-muted-foreground">{lang === "ar" ? n.bodyAr : n.bodyEn}</p>
                <p className="mt-1 text-[10px] text-muted-foreground/80">{timeAgo(n.createdAt, lang)}</p>
              </button>
            )) : (
              <div className="rounded-xl border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
                {lang === "ar" ? "لا توجد إشعارات" : "No notifications"}
              </div>
            )}
          </div>
          <Link
            href={customerOnly ? "/my-orders" : "/admin/notifications"}
            className="mt-2 block text-center text-xs text-amber-600 hover:text-amber-500"
          >
            {lang === "ar" ? "عرض الكل" : "View all"}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
