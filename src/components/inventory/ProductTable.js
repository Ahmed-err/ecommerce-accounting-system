"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Layers,
  Package,
  ChevronUp,
  ChevronDown,
  Printer,
  Download,
} from "lucide-react";
import ProductForm from "./ProductForm";
import InventoryBarcode from "./InventoryBarcode";
import {
  deleteProduct,
  updateStockQuantity,
  bulkDeleteProducts,
  bulkSetCategory,
} from "@/app/actions/inventory";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { INVENTORY_PAGE_SIZE } from "@/lib/constants";
import { toast } from "sonner";

const SORT_PAIRS = {
  name: ["name_asc", "name_desc"],
  sku: ["sku_asc", "sku_desc"],
  stock: ["stock_asc", "stock_desc"],
  cost: ["cost_asc", "cost_desc"],
  sell: ["price_asc", "price_desc"],
  minStock: ["minStock_asc", "minStock_desc"],
};

function SortHeader({ label, colKey, currentSort, onToggle, isRTL }) {
  const pair = SORT_PAIRS[colKey];
  let Icon = null;
  if (pair) {
    if (currentSort === pair[0]) Icon = ChevronUp;
    else if (currentSort === pair[1]) Icon = ChevronDown;
  }
  return (
    <button
      type="button"
      onClick={() => onToggle(colKey)}
      className={cn(
        "inline-flex items-center gap-1 font-bold hover:text-amber-400",
        isRTL && "flex-row-reverse"
      )}
    >
      {label}
      {Icon && <Icon className="h-3 w-3 opacity-70" />}
    </button>
  );
}

function displayName(p, lang) {
  if (lang === "ar") return p.nameAr || p.name;
  return p.nameEn || p.name;
}

function stockStatus(p) {
  if (p.stock <= 0) return "out";
  if (p.stock <= p.minStock) return "low";
  return "ok";
}

export default function ProductTable({
  initialProducts,
  total,
  categories,
  suppliers = [],
  canManage = true,
  isCashier = false,
}) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const pathname = usePathname();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchValue, setSearchValue] = useState(searchParamsHook.get("search") || "");
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    setSelected(new Set());
  }, [searchParamsHook.toString()]);

  const currentPage = Number(searchParamsHook.get("page")) || 1;
  const currentSort = searchParamsHook.get("sort") || "newest";
  const totalPages = Math.ceil(total / INVENTORY_PAGE_SIZE) || 1;

  const searchTimeout = useRef(null);

  const pushParams = (mut) => {
    const params = new URLSearchParams(searchParamsHook.toString());
    mut(params);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchValue(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      pushParams((p) => {
        if (val) p.set("search", val);
        else p.delete("search");
        p.set("page", "1");
      });
    }, 300);
  };

  const handleStatusChange = (val) => {
    pushParams((p) => {
      if (val && val !== "all") p.set("status", val);
      else p.delete("status");
      p.set("page", "1");
    });
  };

  const handleCategoryChange = (val) => {
    pushParams((p) => {
      if (val && val !== "all") p.set("category", val);
      else p.delete("category");
      p.set("page", "1");
    });
  };

  const handleSupplierChange = (val) => {
    pushParams((p) => {
      if (val && val !== "all") p.set("supplier", val);
      else p.delete("supplier");
      p.set("page", "1");
    });
  };

  const toggleSort = (colKey) => {
    const pair = SORT_PAIRS[colKey];
    if (!pair) return;
    pushParams((p) => {
      const cur = p.get("sort") || "newest";
      let next = pair[0];
      if (cur === pair[0]) next = pair[1];
      else if (cur === pair[1]) {
        p.delete("sort");
        p.set("page", "1");
        return;
      }
      p.set("sort", next);
      p.set("page", "1");
    });
  };

  const resetFilters = () => {
    setSearchValue("");
    router.replace(pathname);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    pushParams((p) => p.set("page", String(newPage)));
  };

  const handleDelete = async (id) => {
    if (!canManage) return;
    if (window.confirm(t.inventoryDeleteConfirm)) {
      const res = await deleteProduct(id);
      if (!res.success) toast.error(res.error || t.genericError);
      else toast.success(lang === "ar" ? "تم الحذف" : "Deleted");
    }
  };

  const handleStockUpdate = async (id, change) => {
    if (!canManage) return;
    const res = await updateStockQuantity(id, change);
    if (!res.success) {
      toast.error(res.error || t.genericError);
    } else {
      toast.success(lang === "ar" ? "تم التحديث" : "Updated");
      router.refresh();
    }
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const openNew = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const allPageIds = useMemo(() => initialProducts.map((p) => p.id), [initialProducts]);
  const allSelected =
    initialProducts.length > 0 && allPageIds.every((id) => selected.has(id));

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const n = new Set(prev);
        allPageIds.forEach((id) => n.delete(id));
        return n;
      });
    } else {
      setSelected((prev) => {
        const n = new Set(prev);
        allPageIds.forEach((id) => n.add(id));
        return n;
      });
    }
  };

  const exportCsv = (rows) => {
    const headers = [
      "id",
      "name",
      "sku",
      "barcode",
      "category",
      "stock",
      "unit",
      "purchasePrice",
      "sellingPrice",
      "minStock",
    ];
    const lines = [
      headers.join(","),
      ...rows.map((p) =>
        headers
          .map((h) => {
            let v = p[h];
            if (h === "category") v = p.category?.name || "";
            if (typeof v === "string" && (v.includes(",") || v.includes('"')))
              v = `"${v.replace(/"/g, '""')}"`;
            return v ?? "";
          })
          .join(",")
      ),
    ];
    const blob = new Blob(["\ufeff" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `inventory-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const printBarcode = (p) => {
    const code = p.barcode || p.sku;
    if (!code) {
      toast.error(lang === "ar" ? "لا يوجد باركود" : "No barcode/SKU");
      return;
    }
    const w = window.open("", "_blank", "width=320,height=200");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>label</title></head><body style="margin:16px;font-family:sans-serif">`);
    w.document.write(`<div style="text-align:center;font-weight:bold;margin-bottom:8px">${displayName(p, lang)}</div>`);
    w.document.write(`<svg id="bc"></svg><script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>`);
    w.document.write(`<script>try{JsBarcode("#bc", ${JSON.stringify(String(code))}, {format:"CODE128", displayValue:true, height:48});}catch(e){}</script>`);
    w.document.write(`</body></html>`);
    w.document.close();
    w.onload = () => {
      w.print();
    };
  };

  const runBulkDelete = async () => {
    if (!selected.size || !canManage) return;
    if (!window.confirm(t.inventoryDeleteConfirmBulk)) return;
    const res = await bulkDeleteProducts(Array.from(selected));
    if (res.success) {
      toast.success(`${res.count}`);
      setSelected(new Set());
      router.refresh();
    } else toast.error(res.error || t.genericError);
  };

  const runBulkCategory = async () => {
    if (!selected.size || !bulkCategoryId || !canManage) return;
    const res = await bulkSetCategory(Array.from(selected), bulkCategoryId);
    if (res.success) {
      toast.success(`${res.count}`);
      setSelected(new Set());
      setBulkCategoryId("");
      router.refresh();
    } else toast.error(res.error || t.genericError);
  };

  const colCount = (canManage ? 1 : 0) + 10 + (isCashier ? 0 : 2);

  return (
    <div
      className={cn(
        "flex min-h-[500px] w-full flex-col rounded-2xl border border-white/5 bg-gray-900",
        isRTL ? "text-right" : "text-left"
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {isCashier && (
        <p className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
          {t.inventoryCashierNoPricing}
        </p>
      )}
      {mounted && (
        <div className="flex flex-col gap-3 border-b border-white/5 p-4 sm:flex-wrap sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-1 lg:flex-wrap lg:gap-2">
            <div className="relative h-10 w-full min-w-[200px] group sm:col-span-2 lg:max-w-xs">
              <Search
                className={cn(
                  "pointer-events-none absolute inset-y-0 my-auto h-4 w-4 text-gray-500 group-focus-within:text-amber-500",
                  isRTL ? "right-3" : "left-3"
                )}
              />
              <Input
                placeholder={t.inventorySearchPlaceholder}
                className={cn(
                  "h-10 bg-gray-800/50 border-white/5 text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 rounded-xl",
                  isRTL ? "pr-10 pl-10 text-right" : "pl-10 pr-10 text-left"
                )}
                value={searchValue}
                onChange={handleSearch}
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchValue("");
                    pushParams((p) => {
                      p.delete("search");
                      p.set("page", "1");
                    });
                  }}
                  className={cn(
                    "absolute inset-y-0 my-auto flex items-center text-gray-500 hover:text-white",
                    isRTL ? "left-3" : "right-3"
                  )}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Select
              value={searchParamsHook.get("status") || "all"}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger
                className="h-10 w-full bg-gray-800/50 border-white/5 text-white sm:w-[150px] rounded-xl"
                dir={isRTL ? "rtl" : "ltr"}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-gray-800 text-white rounded-xl">
                <SelectItem value="all">{t.inventoryStatusAll}</SelectItem>
                <SelectItem value="in">{t.adminInventoryInStockFilter}</SelectItem>
                <SelectItem value="low">{t.inventoryStatusLow}</SelectItem>
                <SelectItem value="out">{t.inventoryStatusOut}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={searchParamsHook.get("category") || "all"}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger
                className="h-10 w-full bg-gray-800/50 border-white/5 text-white sm:w-[160px] rounded-xl"
                dir={isRTL ? "rtl" : "ltr"}
              >
                <SelectValue placeholder={t.categoriesTab} />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-gray-800 text-white rounded-xl">
                <SelectItem value="all">{t.inventoryStatusAll}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={searchParamsHook.get("supplier") || "all"}
              onValueChange={handleSupplierChange}
            >
              <SelectTrigger
                className="h-10 w-full bg-gray-800/50 border-white/5 text-white sm:w-[160px] rounded-xl"
                dir={isRTL ? "rtl" : "ltr"}
              >
                <SelectValue placeholder={t.inventorySupplier} />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-gray-800 text-white rounded-xl">
                <SelectItem value="all">{t.inventoryAllSuppliers}</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              className="h-10 border-white/10 bg-gray-800 text-white"
              onClick={resetFilters}
            >
              {t.inventoryResetFilters}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-10 border-white/10 bg-gray-800 text-white"
              onClick={() => exportCsv(initialProducts)}
            >
              <Download className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {t.inventoryExportCsv}
            </Button>
          </div>

          {canManage && (
            <Button
              onClick={openNew}
              className="h-10 shrink-0 rounded-xl bg-amber-500 px-6 font-bold text-black hover:bg-amber-600"
            >
              <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} /> {t.inventoryAddProduct}
            </Button>
          )}
        </div>
      )}

      {canManage && selected.size > 0 && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 border-b border-white/5 bg-amber-500/10 px-4 py-2 text-sm",
            isRTL && "flex-row-reverse"
          )}
        >
          <span className="text-amber-100">{selected.size}</span>
          <Button size="sm" variant="destructive" onClick={runBulkDelete}>
            {t.inventoryBulkDelete}
          </Button>
          <Select value={bulkCategoryId || "x"} onValueChange={(v) => setBulkCategoryId(v === "x" ? "" : v)}>
            <SelectTrigger className="h-8 w-44 bg-gray-800 border-white/10 text-white text-xs">
              <SelectValue placeholder={t.inventoryBulkCategory} />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-gray-800 text-white">
              <SelectItem value="x">{t.inventoryBulkCategory}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="bg-amber-500 text-black" onClick={runBulkCategory} disabled={!bulkCategoryId}>
            {t.save}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/20 text-white"
            onClick={() => exportCsv(initialProducts.filter((p) => selected.has(p.id)))}
          >
            {t.inventoryExportSelectedCsv}
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-x-auto">
        <table
          className={cn(
            "w-full min-w-[1100px] text-sm text-gray-300",
            isRTL ? "text-right" : "text-left"
          )}
        >
          <thead className="border-b border-white/5 bg-gray-800/30 text-xs font-bold uppercase text-gray-400">
            <tr>
              {canManage && (
                <th className="w-10 px-2 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-white/20"
                  />
                </th>
              )}
              <th className="px-4 py-3">{t.inventoryColProduct}</th>
              <th className="px-4 py-3">
                <SortHeader
                  label={t.inventoryColSku}
                  colKey="sku"
                  currentSort={currentSort}
                  onToggle={toggleSort}
                  isRTL={isRTL}
                />
              </th>
              <th className="px-4 py-3">{t.inventoryColBarcode}</th>
              <th className="px-4 py-3">{t.categoriesTab}</th>
              <th className="px-4 py-3">
                <SortHeader
                  label={t.inventoryColStock}
                  colKey="stock"
                  currentSort={currentSort}
                  onToggle={toggleSort}
                  isRTL={isRTL}
                />
              </th>
              <th className="px-4 py-3">{t.inventoryColUnit}</th>
              {!isCashier && (
                <>
                  <th className="px-4 py-3">
                    <SortHeader
                      label={t.inventoryCostShort}
                      colKey="cost"
                      currentSort={currentSort}
                      onToggle={toggleSort}
                      isRTL={isRTL}
                    />
                  </th>
                  <th className="px-4 py-3">
                    <SortHeader
                      label={t.inventorySalePriceShort}
                      colKey="sell"
                      currentSort={currentSort}
                      onToggle={toggleSort}
                      isRTL={isRTL}
                    />
                  </th>
                </>
              )}
              <th className="px-4 py-3">
                <SortHeader
                  label={t.inventoryColMinStock}
                  colKey="minStock"
                  currentSort={currentSort}
                  onToggle={toggleSort}
                  isRTL={isRTL}
                />
              </th>
              <th className="px-4 py-3">{t.inventoryColStatus}</th>
              <th className={cn("px-4 py-3", isRTL ? "text-left" : "text-right")}>{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {initialProducts.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-4 text-gray-500">
                    <Package className="h-12 w-12 opacity-30" />
                    <p className="italic">{t.inventoryNoProducts}</p>
                    {canManage && (
                      <Button onClick={openNew} className="bg-amber-500 text-black">
                        {t.inventoryAddFirstProduct}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              initialProducts.map((p) => {
                const st = stockStatus(p);
                const rowLow = st === "low";
                return (
                  <tr
                    key={p.id}
                    className={cn(
                      "transition-colors group",
                      st === "out" && "bg-red-500/[0.06]",
                      rowLow && "bg-amber-500/[0.08]",
                      !rowLow && st !== "out" && "hover:bg-white/[0.015]"
                    )}
                  >
                    {canManage && (
                      <td className="px-2 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="rounded border-white/20"
                        />
                      </td>
                    )}
                    <td className="flex min-w-[220px] items-center gap-3 px-4 py-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/5 bg-gray-800 group-hover:border-amber-500/30">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-bold text-white group-hover:text-amber-400">
                          {displayName(p, lang)}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-500">
                          <Layers className="h-3 w-3" />
                          <span className="truncate">{p.name !== displayName(p, lang) ? p.name : ""}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-gray-400">
                      {p.sku}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.barcode || "—"}</td>
                    <td className="px-4 py-3 text-gray-400">{p.category?.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span
                          className={cn(
                            "regular-nums text-sm font-bold",
                            st === "out" && "text-red-400",
                            rowLow && "text-amber-400",
                            st === "ok" && "text-emerald-400"
                          )}
                        >
                          {p.stock}
                          {rowLow && <AlertTriangle className="ms-1 inline h-3 w-3 animate-pulse" />}
                        </span>
                        {canManage && (
                          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStockUpdate(p.id, -1);
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded border border-white/5 bg-gray-800 hover:bg-red-500/20"
                            >
                              −
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStockUpdate(p.id, 1);
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded border border-white/5 bg-gray-800 hover:bg-emerald-500/20"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{p.unit || "pcs"}</td>
                    {!isCashier && (
                      <>
                        <td className="regular-nums px-4 py-3 text-gray-300">
                          {p.purchasePrice != null ? `${Number(p.purchasePrice).toLocaleString()} ${t.currency}` : "—"}
                        </td>
                        <td className="regular-nums px-4 py-3 font-medium text-white">
                          {p.sellingPrice != null ? `${Number(p.sellingPrice).toLocaleString()} ${t.currency}` : "—"}
                        </td>
                      </>
                    )}
                    <td className="regular-nums px-4 py-3 text-gray-400">{p.minStock}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          st === "ok" && "bg-emerald-500/15 text-emerald-400",
                          rowLow && "bg-amber-500/15 text-amber-300",
                          st === "out" && "bg-red-500/15 text-red-400"
                        )}
                      >
                        {st === "ok" && t.inventoryStatusBadgeOk}
                        {rowLow && t.inventoryStatusBadgeLow}
                        {st === "out" && t.inventoryStatusBadgeOut}
                      </span>
                      {p.barcode || p.sku ? (
                        <div className="mt-2 max-w-[140px] rounded border border-white/10 bg-white p-1 [&_svg]:max-h-12">
                          <InventoryBarcode value={p.barcode || p.sku} />
                        </div>
                      ) : null}
                    </td>
                    <td className={cn("px-4 py-3", isRTL ? "text-left" : "text-right")}>
                      <div className={cn("flex flex-wrap gap-1", isRTL ? "justify-start" : "justify-end")}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 hover:text-white"
                          onClick={() => printBarcode(p)}
                          title={t.inventoryPrintBarcode}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-white"
                              onClick={() => openEdit(p)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-red-400"
                              onClick={() => handleDelete(p.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 border-t border-white/5 p-4 text-sm text-gray-400 sm:flex-row">
        <div>
          {t.tableShowing}{" "}
          <span className="font-medium text-white">
            {initialProducts.length > 0 ? (currentPage - 1) * INVENTORY_PAGE_SIZE + 1 : 0}
          </span>{" "}
          {t.tableTo}{" "}
          <span className="font-medium text-white">
            {Math.min(currentPage * INVENTORY_PAGE_SIZE, total)}
          </span>{" "}
          {t.tableOf} <span className="font-medium text-white">{total}</span> {t.tableResults}
        </div>
        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            {isRTL ? (
              <>
                <ChevronLeft className="ml-1 h-4 w-4 rotate-180" /> {t.tablePrevious}
              </>
            ) : (
              <>
                <ChevronLeft className="mr-1 h-4 w-4" /> {t.tablePrevious}
              </>
            )}
          </Button>
          <div className="rounded-md border border-white/10 bg-gray-800 px-4 py-1.5 font-medium text-white">
            {t.tablePage} {currentPage} {t.tableOf} {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            {isRTL ? (
              <>
                {t.tableNext} <ChevronRight className="mr-1 h-4 w-4 rotate-180" />
              </>
            ) : (
              <>
                {t.tableNext} <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {isFormOpen && (
        <ProductForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          product={editingProduct}
          categories={categories}
          suppliers={suppliers}
        />
      )}
    </div>
  );
}
