"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, X, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import TransactionForm from "./TransactionForm";
import { deleteTransaction } from "@/app/actions/accounting";

const CATEGORIES = [
  "مبيعات", "رواتب", "إيجار", "مستلزمات", "مرافق",
  "صيانة", "تسويق", "شحن", "ضرائب", "أخرى",
];

function formatDate(date) {
  return new Date(date).toLocaleDateString("ar-SA", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export default function TransactionTable({ initialTransactions, total, searchParams }) {
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const pathname = usePathname();

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
    if (window.confirm("هل أنت متأكد من حذف هذه المعاملة؟")) {
      await deleteTransaction(id);
    }
  };

  const openEdit = (tx) => { setEditingTransaction(tx); setIsFormOpen(true); };
  const openNew = () => { setEditingTransaction(null); setIsFormOpen(true); };

  return (
    <div className="bg-gray-900 border border-white/5 rounded-xl flex flex-col w-full h-full min-h-[500px] text-right" dir="rtl">
      {/* Filter Bar */}
      {mounted && (
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {/* Search */}
            <div className="relative group h-8 w-full md:w-64">
              <Search className="absolute right-3 inset-y-0 my-auto h-4 w-4 text-gray-400 group-focus-within:text-amber-500 transition-colors pointer-events-none" />
              <Input
                placeholder="البحث في المعاملات..."
                className="h-full pr-10 pl-10 bg-gray-800 border-white/10 text-white focus:border-amber-500/50 transition-all text-right"
                value={searchValue}
                onChange={handleSearch}
              />
              {searchValue && (
                <button
                  onClick={clearSearch}
                  className="absolute left-3 inset-y-0 my-auto flex items-center justify-center text-gray-500 hover:text-white transition-colors"
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
              <SelectTrigger className="w-[150px] bg-gray-800 border-white/10 text-white text-right" dir="rtl">
                <SelectValue placeholder="النوع" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/10 text-white text-right" dir="rtl">
                <SelectItem value="all">كل الأنواع</SelectItem>
                <SelectItem value="incoming">وارد</SelectItem>
                <SelectItem value="outgoing">صادر</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select
              value={searchParamsHook.get("category") || "all"}
              onValueChange={(val) => handleFilter("category", val, "all")}
            >
              <SelectTrigger className="w-[160px] bg-gray-800 border-white/10 text-white text-right" dir="rtl">
                <SelectValue placeholder="الفئة">
                  {searchParamsHook.get("category") && searchParamsHook.get("category") !== "all"
                    ? searchParamsHook.get("category")
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/10 text-white text-right" dir="rtl">
                <SelectItem value="all">كل الفئات</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold shrink-0">
            <Plus className="ml-2 h-4 w-4" /> إضافة معاملة
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full min-w-[1000px] text-right text-sm text-gray-300">
          <thead className="bg-gray-800/50 text-xs uppercase text-gray-400">
            <tr>
              <th className="px-6 py-4 font-medium">التاريخ</th>
              <th className="px-6 py-4 font-medium">الوصف</th>
              <th className="px-6 py-4 font-medium">الفئة</th>
              <th className="px-6 py-4 font-medium">المرجع</th>
              <th className="px-6 py-4 font-medium">النوع</th>
              <th className="px-6 py-4 font-medium text-left">المبلغ</th>
              <th className="px-6 py-4 font-medium text-left">العمليات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {initialTransactions.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                  لم يتم العثور على معاملات.
                </td>
              </tr>
            )}
            {initialTransactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4 text-gray-400 whitespace-nowrap">{formatDate(tx.date)}</td>
                <td className="px-6 py-4 font-medium text-white max-w-[300px] truncate">{tx.description}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 bg-white/5 rounded text-xs text-gray-400">{tx.category}</span>
                </td>
                <td className="px-6 py-4 text-gray-500 text-xs regular-nums">{tx.reference || "—"}</td>
                <td className="px-6 py-4">
                  {tx.type === "INCOMING" ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                      <ArrowDownCircle className="h-3 w-3" /> وارد
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-semibold">
                      <ArrowUpCircle className="h-3 w-3" /> صادر
                    </span>
                  )}
                </td>
                <td className={`px-6 py-4 text-left font-mono font-semibold ${tx.type === "INCOMING" ? "text-emerald-400" : "text-red-400"}`}>
                  {tx.type === "INCOMING" ? "+" : "-"}{tx.amount.toLocaleString()} ج.س
                </td>
                <td className="px-6 py-4 text-left">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(tx)} className="text-gray-400 hover:text-white">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(tx.id)} className="text-gray-400 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm text-gray-400">
        <div>
          عرض <span className="text-white font-medium regular-nums">{initialTransactions.length > 0 ? (currentPage - 1) * 10 + 1 : 0}</span>–
          <span className="text-white font-medium regular-nums">{Math.min(currentPage * 10, total)}</span> من أصل{" "}
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
            السابق
          </Button>
          <span className="px-3 py-1 bg-gray-800 rounded-md border border-white/10 text-white text-xs regular-nums">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="bg-gray-800 border-white/10 text-white hover:bg-gray-700"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            التالي
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
