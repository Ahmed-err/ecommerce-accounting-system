"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, X, ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, Download } from "lucide-react";
import TransactionForm from "./TransactionForm";
import { deleteTransaction } from "@/app/actions/accounting";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { isSystemGeneratedTransaction } from "@/lib/accounting";

const CATEGORIES = [
  "Sales", "Salaries", "Rent", "Supplies", "Utilities",
  "Maintenance", "Marketing", "Shipping", "Taxes", "Other",
];

function formatDate(date, lang, mounted) {
  if (!mounted) return new Date(date).toISOString().split("T")[0];
  return new Date(date).toLocaleDateString(lang === 'ar' ? "ar-EG" : "en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export default function TransactionTable({ initialTransactions, total, searchParams }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  function canDeleteTransaction(tx) {
    if (!tx || !role) return false;
    if (isSystemGeneratedTransaction(tx)) return false;
    if (role === "ADMIN") return true;
    if (role === "MANAGER") return tx.type === "OUTGOING";
    return false;
  }

  function mapTxDeleteError(code) {
    switch (code) {
      case "locked_system_transaction":
        return t.accErrLockedSystemTx;
      case "manager_cannot_delete_income":
        return t.accErrManagerDeleteIncome;
      default:
        return code || t.genericError;
    }
  }

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [searchValue, setSearchValue] = useState(searchParamsHook.get("search") || "");
  const [mounted, setMounted] = useState(false);
  const searchTimeout = useRef(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const currentPage = Number(searchParamsHook.get("page")) || 1;
  const totalPages = Math.ceil(total / 10) || 1;

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchValue(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      const params = new URLSearchParams(searchParamsHook);
      if (val) params.set("search", val);
      else params.delete("search");
      params.set("page", "1");
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);
  };

  const clearSearch = () => {
    setSearchValue("");
    const params = new URLSearchParams(searchParamsHook);
    params.delete("search");
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleFilter = (key, val, defaultVal) => {
    const params = new URLSearchParams(searchParamsHook);
    if (val && val !== defaultVal) params.set(key, val);
    else params.delete(key);
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParamsHook);
    params.set("page", newPage.toString());
    router.replace(`${pathname}?${params.toString()}`);
    router.refresh();
  };

  const handleDelete = async (tx) => {
    if (!canDeleteTransaction(tx)) {
      toast.error(mapTxDeleteError("locked_system_transaction"));
      return;
    }
    if (!window.confirm(t.accountingDeleteConfirm)) return;
    const res = await deleteTransaction(tx.id);
    if (res?.success) {
      toast.success(t.toastDeleted || "Deleted");
      router.refresh();
    } else {
      toast.error(mapTxDeleteError(res?.error) || t.genericError);
    }
  };

  const downloadCSV = () => {
    const headers = [t.accountingColDate, t.accountingColDesc, t.accountingColCategory, t.accountingColRef, t.accountingColType, t.accountingColAmount];
    const rows = initialTransactions.map(tx => [
      formatDate(tx.date, lang, true),
      tx.description,
      lang === 'ar' ? (t[tx.category] || tx.category) : tx.category,
      tx.reference || "",
      tx.type,
      `${tx.type === "INCOMING" ? "" : "-"}${tx.amount}`
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openEdit = (tx) => { setEditingTransaction(tx); setIsFormOpen(true); };
  const openNew = () => { setEditingTransaction(null); setIsFormOpen(true); };

  return (
    <div className={`flex min-h-[500px] w-full flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-sm ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Filter Bar */}
      {mounted && (
        <div className="flex flex-col items-stretch justify-between gap-3 border-b border-border p-4 sm:gap-4 sm:p-6 xl:flex-row xl:items-center">
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:w-auto xl:flex-wrap">
            {/* Search */}
            <div className={`relative group h-10 w-full sm:col-span-2 xl:w-72`}>
              <Search className={`pointer-events-none absolute ${isRTL ? "right-3" : "left-3"} inset-y-0 my-auto h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-amber-600`} />
              <Input
                placeholder={t.accountingSearchPlaceholder}
                className={`h-full rounded-xl border-border bg-background ${isRTL ? "pr-10 pl-10 text-right" : "pl-10 pr-10 text-left"} text-foreground transition-all focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/40`}
                value={searchValue}
                onChange={handleSearch}
              />
              {searchValue && (
                <button
                  onClick={clearSearch}
                  className={`absolute ${isRTL ? "left-3" : "right-3"} inset-y-0 my-auto flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Type Filter */}
            <Select
              value={searchParamsHook.get("type") || "all"}
              onValueChange={(val) => handleFilter("type", val, "all")}
            >
              <SelectTrigger className={`h-10 w-full rounded-xl border-border bg-background sm:w-[140px] ${isRTL ? "text-right" : "text-left"} text-foreground`} dir={isRTL ? "rtl" : "ltr"}>
                <SelectValue placeholder={t.accountingColType} />
              </SelectTrigger>
              <SelectContent className={`rounded-xl border-border bg-popover text-popover-foreground ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
                <SelectItem value="all">{t.accountingTypeAll}</SelectItem>
                <SelectItem value="incoming">{t.accountingTypeIn}</SelectItem>
                <SelectItem value="outgoing">{t.accountingTypeOut}</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select
              value={searchParamsHook.get("category") || "all"}
              onValueChange={(val) => handleFilter("category", val, "all")}
            >
              <SelectTrigger className={`h-10 w-full rounded-xl border-border bg-background sm:w-[150px] ${isRTL ? "text-right" : "text-left"} text-foreground`} dir={isRTL ? "rtl" : "ltr"}>
                <SelectValue placeholder={t.accountingColCategory}>
                  {searchParamsHook.get("category") && searchParamsHook.get("category") !== "all"
                    ? (lang === 'ar' ? t[searchParamsHook.get("category")] || searchParamsHook.get("category") : searchParamsHook.get("category"))
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className={`rounded-xl border-border bg-popover text-popover-foreground ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
                <SelectItem value="all">{t.accountingCatAll}</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{lang === 'ar' ? (t[cat] || cat) : cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={downloadCSV}
              className="h-10 w-full rounded-xl border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground sm:w-auto"
            >
              <Download className={`${isRTL ? "ml-2" : "mr-2"} h-4 w-4`} /> {t.adminExportCSV}
            </Button>
          </div>

          <Button onClick={openNew} className="h-10 w-full shrink-0 rounded-xl bg-amber-500 px-6 font-bold text-black hover:bg-amber-600 sm:w-auto">
            <Plus className={`${isRTL ? "ml-2" : "mr-2"} h-4 w-4`} /> {t.accountingAddTransaction}
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-x-auto">
        <table className={`w-full min-w-[1000px] text-sm text-foreground ${isRTL ? "text-right" : "text-left"}`}>
          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-6 py-4 font-medium">{t.accountingColDate}</th>
              <th className="px-6 py-4 font-medium">{t.accountingColDesc}</th>
              <th className="px-6 py-4 font-medium">{t.accountingColCategory}</th>
              <th className="px-6 py-4 font-medium">{t.accountingColRef}</th>
              <th className="px-6 py-4 font-medium">{t.accountingColType}</th>
              <th className={`px-6 py-4 font-medium ${isRTL ? "text-left" : "text-right"}`}>{t.accountingColAmount}</th>
              <th className={`px-6 py-4 font-medium ${isRTL ? "text-left" : "text-right"}`}>{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {initialTransactions.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-10 text-center text-muted-foreground">
                  {t.accountingNoTransactions}
                </td>
              </tr>
            )}
            {initialTransactions.map((tx) => (
              <tr key={tx.id} className="transition-colors hover:bg-muted/40">
                <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">{formatDate(tx.date, lang, mounted)}</td>
                <td className="max-w-[300px] truncate px-6 py-4 font-medium text-foreground">{tx.description}</td>
                <td className="px-6 py-4">
                  <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{lang === 'ar' ? (t[tx.category] || tx.category) : tx.category}</span>
                </td>
                <td className="regular-nums px-6 py-4 text-xs text-muted-foreground">{tx.reference || "—"}</td>
                <td className="px-6 py-4">
                  {tx.type === "INCOMING" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <ArrowDownCircle className="h-3 w-3" /> {t.accountingTypeIn}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">
                      <ArrowUpCircle className="h-3 w-3" /> {t.accountingTypeOut}
                    </span>
                  )}
                </td>
                <td className={`regular-nums px-6 py-4 font-mono font-semibold ${isRTL ? "text-left" : "text-right"} ${tx.type === "INCOMING" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                  {tx.type === "INCOMING" ? "+" : "-"}{tx.amount.toLocaleString()} {t.currency}
                </td>
                <td className="px-6 py-4 text-left">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(tx)} className="text-muted-foreground hover:text-foreground">
                    <Edit className="h-4 w-4" />
                  </Button>
                  {canDeleteTransaction(tx) && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(tx)} className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-4 border-t border-border p-4 text-sm text-muted-foreground sm:flex-row">
        <div>
          {t.tableShowing}{" "}
          <span className="font-medium text-foreground regular-nums">{initialTransactions.length > 0 ? (currentPage - 1) * 10 + 1 : 0}</span>–
          <span className="font-medium text-foreground regular-nums">{Math.min(currentPage * 10, total)}</span> {t.tableOf}{" "}
          <span className="font-medium text-foreground regular-nums">{total}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-border bg-background text-foreground hover:bg-muted"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            {isRTL ? (
              <><ChevronRight className="h-4 w-4 ml-1" /> {t.tablePrevious}</>
            ) : (
              <><ChevronLeft className="h-4 w-4 mr-1" /> {t.tablePrevious}</>
            )}
          </Button>
          <span className="regular-nums rounded-md border border-border bg-muted/50 px-3 py-1 text-xs text-foreground">
            {t.tablePage} {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-border bg-background text-foreground hover:bg-muted"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            {isRTL ? (
              <>{t.tableNext} <ChevronLeft className="h-4 w-4 mr-1" /></>
            ) : (
              <>{t.tableNext} <ChevronRight className="h-4 w-4 ml-1" /></>
            )}
          </Button>
        </div>
      </div>

      {isFormOpen && (
        <TransactionForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          transaction={editingTransaction}
        />
      )}
    </div>
  );
}
