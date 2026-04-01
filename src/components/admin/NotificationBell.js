"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";

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
  const [failCount, setFailCount] = useState(0);
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
          setFailCount(0);
        } catch {}
      });

      es.onerror = () => {
        es.close();
        const next = Math.min(5000 * Math.max(failCount + 1, 1), 30000);
        setFailCount((v) => v + 1);
        timerRef.current = setTimeout(startSse, next);
      };
    };

    startSse();
    return () => {
      canceled = true;
      if (sourceRef.current) sourceRef.current.close();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [failCount]);

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
        className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-white relative"
        aria-haspopup="menu"
        aria-expanded={open}
        type="button"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className={`absolute -top-1 ${isRTL ? "-left-1" : "-right-1"} h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center`}>
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div
          className={`fixed inset-x-2 top-16 z-[200] mt-0 w-auto rounded-2xl border border-white/10 bg-gray-900/95 p-3 shadow-2xl sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:w-96 ${
            isRTL ? "sm:left-0" : "sm:right-0"
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-white">{title}</p>
            <Button size="sm" variant="ghost" className="h-8 px-2 text-[11px] text-gray-300" onClick={markAll} type="button">
              <CheckCheck className="h-4 w-4 me-1" />
              {lang === "ar" ? "تحديد الكل كمقروء" : "Mark all as read"}
            </Button>
          </div>
          <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto space-y-2 pr-1 sm:max-h-[65vh]">
            {rows.length ? rows.map((n) => (
              <button
                key={n.id}
                onClick={() => markOne(n.id, n.link)}
                className={`w-full rounded-xl border p-3 transition ${isRTL ? "text-right" : "text-left"} ${n.read ? "border-white/5 bg-white/[0.02]" : "border-amber-500/30 bg-amber-500/10"}`}
                type="button"
              >
                <p className="text-sm font-semibold text-white">{lang === "ar" ? n.titleAr : n.titleEn}</p>
                <p className="mt-1 text-xs text-gray-300">{lang === "ar" ? n.bodyAr : n.bodyEn}</p>
                <p className="mt-1 text-[10px] text-gray-500">{timeAgo(n.createdAt, lang)}</p>
              </button>
            )) : (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-gray-400">
                {lang === "ar" ? "لا توجد إشعارات" : "No notifications"}
              </div>
            )}
          </div>
          <Link href="/admin/notifications" className="mt-2 block text-center text-xs text-amber-400 hover:text-amber-300">
            {lang === "ar" ? "عرض الكل" : "View all"}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
