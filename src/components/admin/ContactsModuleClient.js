"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  loadContactMessagesAction,
  getContactMessageAction,
  replyContactMessageAction,
  deleteContactMessageAction,
} from "@/app/actions/contact-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { Trash2, Reply } from "lucide-react";

export default function ContactsModuleClient() {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState([]);
  const [sel, setSel] = useState(null);
  const [detail, setDetail] = useState(null);
  const [reply, setReply] = useState("");

  const load = useCallback(async () => {
    const r = await loadContactMessagesAction({ status, take: 100 });
    if (r.ok) setRows(r.rows);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (id) => {
    setSel(id);
    const r = await getContactMessageAction(id);
    if (r.ok && r.row) {
      setDetail(r.row);
      setReply("");
    }
  };

  const sendReply = async () => {
    const r = await replyContactMessageAction(sel, { reply });
    if (r.ok) {
      toast.success(t.toastSaved);
      setSel(null);
      setDetail(null);
      load();
    } else toast.error(t.errGeneric);
  };

  const del = async (id) => {
    if (!confirm(t.contactsConfirmDelete)) return;
    const r = await deleteContactMessageAction(id);
    if (r.ok) {
      toast.success(t.toastDeleted);
      if (sel === id) {
        setSel(null);
        setDetail(null);
      }
      load();
    } else toast.error(t.errGeneric);
  };

  const statusBadge = (s) => {
    if (s === "NEW") return <Badge className="bg-amber-600">{t.contactStatusNew}</Badge>;
    if (s === "READ") return <Badge className="bg-blue-600">{t.contactStatusRead}</Badge>;
    return <Badge className="bg-emerald-600">{t.contactStatusReplied}</Badge>;
  };

  return (
    <div className={cn("space-y-6", isRTL && "text-right")} dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-black text-foreground">{t.adminContactsTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.adminContactsSubtitle}</p>
      </div>

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
      >
        <option value="all">{t.filterAll}</option>
        <option value="NEW">{t.contactStatusNew}</option>
        <option value="READ">{t.contactStatusRead}</option>
        <option value="REPLIED">{t.contactStatusReplied}</option>
      </select>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm text-muted-foreground">
          <thead>
            <tr className="border-b border-border bg-muted/60 text-xs uppercase text-muted-foreground">
              <th className="p-3">{t.fullName}</th>
              <th className="p-3">{t.email}</th>
              <th className="p-3">{t.subject}</th>
              <th className="p-3">{t.suppliersColDate}</th>
              <th className="p-3">{t.suppliersColStatus}</th>
              <th className="p-3">{t.suppliersColActions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="cursor-pointer border-b border-border hover:bg-muted/40" onClick={() => open(r.id)}>
                <td className="p-3 text-foreground">{r.name}</td>
                <td className="p-3">{r.email}</td>
                <td className="p-3">{r.subject}</td>
                <td className="p-3">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="p-3">{statusBadge(r.status)}</td>
                <td className="p-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      del(r.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent side={isRTL ? "left" : "right"} className="w-full border-border bg-card text-foreground sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t.contactsMessageDetail}</SheetTitle>
          </SheetHeader>
          {detail && (
            <div className="mt-4 space-y-3 text-sm">
              <p>
                <strong>{t.fullName}:</strong> {detail.name}
              </p>
              <p>
                <strong>{t.email}:</strong> {detail.email}
              </p>
              {detail.phone ? (
                <p>
                  <strong>{t.employeesPhone}:</strong> {detail.phone}
                </p>
              ) : null}
              <p>
                <strong>{t.subject}:</strong> {detail.subject}
              </p>
              <p className="whitespace-pre-wrap text-muted-foreground">{detail.message}</p>
              {detail.adminReply ? (
                <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-xs">
                  <strong>{t.contactsAdminReply}</strong>
                  <p className="mt-1 whitespace-pre-wrap">{detail.adminReply}</p>
                </div>
              ) : null}
              <textarea
                className="min-h-28 w-full rounded-lg border border-border bg-background p-2 text-sm"
                placeholder={t.contactsReplyPlaceholder}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <Button className="w-full gap-2 bg-amber-500 text-black" onClick={sendReply}>
                <Reply className="h-4 w-4" />
                {t.contactsSendReply}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
