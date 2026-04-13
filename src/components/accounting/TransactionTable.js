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
  const canDelete = session?.user?.role === "ADMIN";

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

  const handleDelete = async (id) => {
    if (window.confirm(t.accountingDeleteConfirm)) {
      const res = await deleteTransaction(id);
      if (res?.success) {
        toast.success(t.toastDeleted || "Deleted");
        router.refresh();
      } else {
        toast.error(res?.error || t.genericError || "Failed to delete");
      }
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
    <div className={`bg-gray-900 border border-white/5 rounded-2xl flex flex-col w-full h-full min-h-[500px] ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Filter Bar */}
      {mounted && (
        <div className="p-4 sm:p-6 border-b border-white/5 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-3 sm:gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:flex xl:flex-wrap gap-2 w-full xl:w-auto">
            {/* Search */}
            <div className={`relative group h-10 w-full sm:col-span-2 xl:w-72`}>
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} inset-y-0 my-auto h-4 w-4 text-gray-500 group-focus-within:text-amber-500 transition-colors pointer-events-none`} />
              <Input
                placeholder={t.accountingSearchPlaceholder}
                className={`h-full ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} bg-gray-800/50 border-white/5 text-white focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all ${isRTL ? 'text-right' : 'text-left'} rounded-xl`}
                value={searchValue}
                onChange={handleSearch}
              />
              {searchValue && (
                <button
                  onClick={clearSearch}
                  className={`absolute ${isRTL ? 'left-3' : 'right-3'} inset-y-0 my-auto flex items-center justify-center text-gray-500 hover:text-white transition-colors`}
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
              <SelectTrigger className={`h-10 w-full sm:w-[140px] bg-gray-800/50 border-white/5 text-white ${isRTL ? 'text-right' : 'text-left'} rounded-xl`} dir={isRTL ? "rtl" : "ltr"}>
                <SelectValue placeholder={t.accountingColType} />
              </SelectTrigger>
              <SelectContent className={`bg-gray-800 border-white/10 text-white ${isRTL ? 'text-right' : 'text-left'} rounded-xl`} dir={isRTL ? "rtl" : "ltr"}>
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
              <SelectTrigger className={`h-10 w-full sm:w-[150px] bg-gray-800/50 border-white/5 text-white ${isRTL ? 'text-right' : 'text-left'} rounded-xl`} dir={isRTL ? "rtl" : "ltr"}>
                <SelectValue placeholder={t.accountingColCategory}>
                  {searchParamsHook.get("category") && searchParamsHook.get("category") !== "all"
                    ? (lang === 'ar' ? t[searchParamsHook.get("category")] || searchParamsHook.get("category") : searchParamsHook.get("category"))
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className={`bg-gray-800 border-white/10 text-white ${isRTL ? 'text-right' : 'text-left'} rounded-xl`} dir={isRTL ? "rtl" : "ltr"}>
                <SelectItem value="all">{t.accountingCatAll}</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{lang === 'ar' ? (t[cat] || cat) : cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
                variant="outline" 
                onClick={downloadCSV}
                className="h-10 w-full sm:w-auto bg-gray-800/50 border-white/5 text-gray-400 hover:text-white rounded-xl"
            >
                <Download className={`${isRTL ? 'ml-2' : 'mr-2'} h-4 w-4`} /> {t.adminExportCSV}
            </Button>
          </div>

          <Button onClick={openNew} className="h-10 w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-black font-bold shrink-0 rounded-xl px-6">
            <Plus className={`${isRTL ? 'ml-2' : 'mr-2'} h-4 w-4`} /> {t.accountingAddTransaction}
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className={`w-full min-w-[1000px] ${isRTL ? 'text-right' : 'text-left'} text-sm text-gray-300`}>
          <thead className="bg-gray-800/50 text-xs uppercase text-gray-400">
            <tr>
              <th className="px-6 py-4 font-medium">{t.accountingColDate}</th>
              <th className="px-6 py-4 font-medium">{t.accountingColDesc}</th>
              <th className="px-6 py-4 font-medium">{t.accountingColCategory}</th>
              <th className="px-6 py-4 font-medium">{t.accountingColRef}</th>
              <th className="px-6 py-4 font-medium">{t.accountingColType}</th>
              <th className={`px-6 py-4 font-medium ${isRTL ? 'text-left' : 'text-right'}`}>{t.accountingColAmount}</th>
              <th className={`px-6 py-4 font-medium ${isRTL ? 'text-left' : 'text-right'}`}>{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {initialTransactions.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                  {t.accountingNoTransactions}
                </td>
              </tr>
            )}
            {initialTransactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4 text-gray-400 whitespace-nowrap">{formatDate(tx.date, lang, mounted)}</td>
                <td className="px-6 py-4 font-medium text-white max-w-[300px] truncate">{tx.description}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 bg-white/5 rounded text-xs text-gray-400">{lang === 'ar' ? (t[tx.category] || tx.category) : tx.category}</span>
                </td>
                <td className="px-6 py-4 text-gray-500 text-xs regular-nums">{tx.reference || "—"}</td>
                <td className="px-6 py-4">
                  {tx.type === "INCOMING" ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                      <ArrowDownCircle className="h-3 w-3" /> {t.accountingTypeIn}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-semibold">
                      <ArrowUpCircle className="h-3 w-3" /> {t.accountingTypeOut}
                    </span>
                  )}
                </td>
                <td className={`px-6 py-4 ${isRTL ? 'text-left' : 'text-right'} font-mono font-semibold ${tx.type === "INCOMING" ? "text-emerald-400" : "text-red-400"}`}>
                  {tx.type === "INCOMING" ? "+" : "-"}{tx.amount.toLocaleString()} {t.currency}
                </td>
                <td className="px-6 py-4 text-left">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(tx)} className="text-gray-400 hover:text-white">
                    <Edit className="h-4 w-4" />
                  </Button>
                  {canDelete && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(tx.id)} className="text-gray-400 hover:text-red-400">
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
      <div className="p-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
        <div>
          {t.tableShowing} <span className="text-white font-medium regular-nums">{initialTransactions.length > 0 ? (currentPage - 1) * 10 + 1 : 0}</span>–
          <span className="text-white font-medium regular-nums">{Math.min(currentPage * 10, total)}</span> {t.tableOf}{" "}
          <span className="text-white font-medium regular-nums">{total}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-gray-800 border-white/10 text-white hover:bg-gray-700"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            {isRTL ? (
              <><ChevronRight className="h-4 w-4 ml-1" /> {t.tablePrevious}</>
            ) : (
              <><ChevronLeft className="h-4 w-4 mr-1" /> {t.tablePrevious}</>
            )}
          </Button>
          <span className="px-3 py-1 bg-gray-800 rounded-md border border-white/10 text-white text-xs regular-nums">
            {t.tablePage} {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="bg-gray-800 border-white/10 text-white hover:bg-gray-700"
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
