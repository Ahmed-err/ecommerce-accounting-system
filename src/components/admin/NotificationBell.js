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

const SCOPE_QS = (customerOnly) => (customerOnly ? "&type=ORDER_STATUS&customerOnly=1" : "");

export default function NotificationBell({ customerOnly = false }) {
  const { lang, isRTL } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const rootRef = useRef(null);
  const mountedRef = useRef(true);

  const scopeQuery = SCOPE_QS(customerOnly);

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?limit=20${scopeQuery}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      if (!mountedRef.current) return;
      if (!json?.ok) return;
      const list = Array.isArray(json.rows) ? json.rows : [];
      setRows(list);
      setUnread(Number.isFinite(json.unread) ? json.unread : 0);
    } catch {
      /* network — ignore, polling will retry */
    } finally {
      if (mountedRef.current) setLoaded(true);
    }
  }, [scopeQuery]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Initial load + reload when scope changes (admin vs storefront bell).
  useEffect(() => {
    setLoaded(false);
    setRows([]);
    setUnread(0);
    fetchList();
  }, [fetchList]);

  // Refresh when the dropdown opens so the user always sees the latest state.
  useEffect(() => {
    if (open) fetchList();
  }, [open, fetchList]);

  // Polling only while the tab is visible (staff every 2 min, customers every 5 min), plus on
  // tab/network return. A held-open stream kept the database awake for every signed-in visitor,
  // and a 30 s staff poll on an admin screen left open still kept Neon from ever suspending.
  useEffect(() => {
    const poll = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchList();
    }, customerOnly ? 5 * 60 * 1000 : 2 * 60 * 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") fetchList();
    };
    const onOnline = () => fetchList();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onVisible);

    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onVisible);
    };
  }, [fetchList, customerOnly]);

  // Outside click / escape handling.
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
    let wasUnread = false;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (!r.read) wasUnread = true;
        return { ...r, read: true };
      })
    );
    if (wasUnread) setUnread((v) => Math.max(0, v - 1));
    setOpen(false);
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    } catch {
      /* ignore */
    }
    if (link) router.push(link);
  };

  const markAll = async () => {
    if (!rows.some((r) => !r.read) && unread === 0) return;
    setRows((prev) => prev.map((r) => ({ ...r, read: true })));
    setUnread(0);
    try {
      await fetch(`/api/notifications/read-all${customerOnly ? "?customerOnly=1" : ""}`, {
        method: "POST",
      });
    } catch {
      /* ignore — next poll will reconcile */
    }
    fetchList();
  };

  const title = useMemo(() => (lang === "ar" ? "الإشعارات" : "Notifications"), [lang]);
  const hasUnread = rows.some((r) => !r.read) || unread > 0;

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className="relative h-10 w-10 rounded-full border border-border bg-muted text-foreground hover:bg-accent"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={title}
        type="button"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {unread > 0 ? (
          <span
            className={cn(
              "absolute -top-1 h-5 min-w-5 px-1 rounded-full bg-red-500 text-foreground dark:text-white text-[10px] font-black flex items-center justify-center",
              isRTL ? "-left-1" : "-right-1"
            )}
            aria-live="polite"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div
          className={cn(
            "z-[200] rounded-2xl border border-border bg-popover/95 p-3 text-popover-foreground shadow-2xl",
            "fixed top-16 left-3 right-3 w-auto max-h-[calc(100dvh-5rem)]",
            "sm:absolute sm:top-full sm:left-auto sm:right-auto sm:mt-2 sm:max-h-[min(65vh,32rem)] sm:w-[min(24rem,calc(100vw-2rem))]",
            isRTL ? "sm:left-0 sm:right-auto" : "sm:right-0 sm:left-auto"
          )}
          role="menu"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">{title}</p>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={markAll}
              disabled={!hasUnread}
              type="button"
            >
              <CheckCheck className="h-4 w-4 me-1" />
              {lang === "ar" ? "تحديد الكل كمقروء" : "Mark all as read"}
            </Button>
          </div>
          <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto space-y-2 pe-1 sm:max-h-[min(60vh,28rem)]">
            {!loaded ? (
              <div className="rounded-xl border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
                {lang === "ar" ? "جارٍ التحميل..." : "Loading..."}
              </div>
            ) : rows.length ? (
              rows.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markOne(n.id, n.link)}
                  className={cn(
                    "w-full rounded-xl border p-3 transition",
                    isRTL ? "text-right" : "text-left",
                    n.read
                      ? "border-border bg-muted/50"
                      : "border-amber-500/40 bg-amber-500/10"
                  )}
                  type="button"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {lang === "ar" ? n.titleAr : n.titleEn}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {lang === "ar" ? n.bodyAr : n.bodyEn}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground/80">
                    {timeAgo(n.createdAt, lang)}
                  </p>
                </button>
              ))
            ) : (
              <div className="rounded-xl border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
                {lang === "ar" ? "لا توجد إشعارات" : "No notifications"}
              </div>
            )}
          </div>
          <Link
            href={customerOnly ? "/account/notifications" : "/admin/notifications"}
            onClick={() => setOpen(false)}
            className="mt-2 block text-center text-xs text-accent-text hover:text-accent-text"
          >
            {lang === "ar" ? "عرض الكل" : "View all"}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
