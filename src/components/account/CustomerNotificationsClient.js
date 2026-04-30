"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomerNotificationsClient({
  emptyText,
  markAllText,
  loadingText,
  viewOrderText,
  lang,
  isRTL,
}) {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=100&type=ORDER_STATUS", {
        cache: "no-store",
      });
      const json = await res.json();
      if (json?.ok) setRows(json.rows || []);
    } catch {}
    finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAll = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
    setRows((prev) => prev.map((r) => ({ ...r, read: true })));
  };

  const markOneRead = async (id) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => {});
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, read: true } : r)));
  };

  return (
    <div className="space-y-4">
      <div className={`flex ${isRTL ? "flex-row-reverse" : ""} justify-end`}>
        <Button
          variant="outline"
          onClick={markAll}
          disabled={!rows.some((r) => !r.read)}
          className="border-border text-foreground hover:bg-muted"
          type="button"
        >
          <CheckCheck className="h-4 w-4 me-1" />
          {markAllText}
        </Button>
      </div>

      {!loaded ? (
        <div className="rounded-xl border border-border bg-card/30 p-6 text-center text-sm text-muted-foreground">
          {loadingText}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/30 p-12 text-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border p-4 sm:p-5 transition ${
                n.read
                  ? "border-border bg-card"
                  : "border-amber-500/40 bg-amber-500/10"
              }`}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <p className="font-semibold text-sm text-foreground sm:text-base">
                  {lang === "ar" ? n.titleAr : n.titleEn}
                </p>
                <span className="shrink-0 text-[11px] text-muted-foreground sm:text-xs">
                  {new Date(n.createdAt).toLocaleString(lang === "ar" ? "ar-SD" : "en-US")}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "ar" ? n.bodyAr : n.bodyEn}
              </p>
              {n.link ? (
                <Link
                  href={n.link}
                  onClick={() => !n.read && markOneRead(n.id)}
                  className="mt-2 inline-block text-xs text-amber-500 hover:text-amber-400"
                >
                  {viewOrderText}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
