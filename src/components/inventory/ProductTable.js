"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import InventoryReportActions from "./InventoryReportActions";
import {
  deleteProduct,
  updateStockQuantity,
  bulkDeleteProducts,
  bulkSetCategory,
  updateProductOriginAction,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/app/actions/inventory";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { cn, formatServerActionError } from "@/lib/utils";
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

function originBadgeClass(origin) {
  return cn(
    "inline-flex max-w-full items-center rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase leading-snug tracking-wide sm:text-xs",
    origin === "IMPORTED"
      ? "border-sky-400/45 bg-sky-500/20 text-sky-700 dark:text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.08)]"
      : "border-emerald-400/45 bg-emerald-500/20 text-emerald-700 dark:text-emerald-100 shadow-[0_0_0_1px_rgba(52,211,153,0.08)]"
  );
}

export default function ProductTable({
  initialProducts,
  total,
  categories,
  suppliers = [],
  canManage = true,
  isCashier = false,
  unclassifiedCount = 0,
}) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const searchParamsKey = searchParamsHook.toString();
  const pathname = usePathname();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchValue, setSearchValue] = useState(searchParamsHook.get("search") || "");
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [hideClassifyBanner, setHideClassifyBanner] = useState(false);
  const [categoriesState, setCategoriesState] = useState(categories);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    id: "",
    name: "",
    nameAr: "",
    description: "",
    image: "",
  });
  const [categorySaving, setCategorySaving] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    setSelected(new Set());
  }, [searchParamsKey]);
  useEffect(() => {
    setCategoriesState(categories);
  }, [categories]);
  useEffect(() => {
    setHideClassifyBanner(localStorage.getItem("inventory-origin-banner-dismissed") === "1");
  }, []);

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

  const handleOriginChange = (val) => {
    pushParams((p) => {
      if (val && val !== "all") p.set("origin", val);
      else p.delete("origin");
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
    const deleteWarning =
      t.inventoryPermanentDeleteWarningSingle ||
      (lang === "ar"
        ? "هذا الحذف نهائي وسيزيل المنتج من قاعدة البيانات مع السجلات المرتبطة به (عناصر الطلبات/المشتريات/المرتجعات)."
        : "This delete is permanent and will remove the product from the database with related records (order/purchase/return line items).");
    if (window.confirm(`${t.inventoryDeleteConfirm}\n\n${deleteWarning}`)) {
      const res = await deleteProduct(id);
      if (!res.success) {
        toast.error(formatServerActionError(res.error) || t.genericError);
      }
      else toast.success(lang === "ar" ? "تم الحذف" : "Deleted");
    }
  };

  const handleStockUpdate = async (id, change) => {
    if (!canManage) return;
    const res = await updateStockQuantity(id, change);
    if (!res.success) {
      toast.error(formatServerActionError(res.error) || t.genericError);
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

  const resetCategoryForm = () => {
    setCategoryForm({ id: "", name: "", nameAr: "", description: "", image: "" });
  };

  const openCategoryCreate = () => {
    resetCategoryForm();
    setIsCategoriesOpen(true);
  };

  const openCategoryEdit = (category) => {
    setCategoryForm({
      id: category.id,
      name: category.name || "",
      nameAr: category.nameAr || "",
      description: category.description || "",
      image: category.image || "",
    });
    setIsCategoriesOpen(true);
  };

  const saveCategory = async () => {
    if (!canManage) return;
    if (!categoryForm.name.trim()) {
      toast.error(lang === "ar" ? "اسم القسم مطلوب" : "Category name is required.");
      return;
    }
    setCategorySaving(true);
    const payload = {
      name: categoryForm.name.trim(),
      nameAr: categoryForm.nameAr.trim() || null,
      description: categoryForm.description.trim() || null,
      image: categoryForm.image.trim() || null,
    };
    const res = categoryForm.id
      ? await updateCategory(categoryForm.id, payload)
      : await createCategory(payload);
    setCategorySaving(false);
    if (!res.success) {
      toast.error(formatServerActionError(res.error) || t.genericError);
      return;
    }
    toast.success(lang === "ar" ? "تم حفظ القسم" : "Category saved");
    resetCategoryForm();
    setIsCategoriesOpen(false);
    router.refresh();
  };

  const handleCategoryDelete = async (category) => {
    if (!canManage) return;
    const productCount = Number(category.productCount || 0);
    const baseConfirm =
      lang === "ar"
        ? `حذف القسم "${category.name}"؟`
        : `Delete category "${category.name}"?`;
    if (!window.confirm(baseConfirm)) return;

    let options = {};
    if (productCount > 0) {
      const forceConfirm =
        lang === "ar"
          ? `هذا القسم يحتوي على ${productCount} منتج. حذف القسم بالقوة سيحذف كل هذه المنتجات نهائيا. متابعة؟`
          : `This category has ${productCount} products. Force delete will permanently delete all of them. Continue?`;
      if (!window.confirm(forceConfirm)) return;
      options = { force: true };
    }

    const res = await deleteCategory(category.id, options);
    if (!res.success) {
      toast.error(formatServerActionError(res.error) || t.genericError);
      return;
    }
    toast.success(lang === "ar" ? "تم حذف القسم" : "Category deleted");
    router.refresh();
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
    const bulkDeleteWarning =
      t.inventoryPermanentDeleteWarningBulk ||
      (lang === "ar"
        ? "الحذف الجماعي نهائي وسيزيل المنتجات المحددة من قاعدة البيانات مع السجلات المرتبطة بها (عناصر الطلبات/المشتريات/المرتجعات)."
        : "Bulk delete is permanent and will remove selected products from the database with related records (order/purchase/return line items).");
    if (!window.confirm(`${t.inventoryDeleteConfirmBulk}\n\n${bulkDeleteWarning}`)) return;
    const res = await bulkDeleteProducts(Array.from(selected));
    if (res.success) {
      toast.success(`${res.count}`);
      setSelected(new Set());
      router.refresh();
    } else {
      toast.error(formatServerActionError(res.error) || t.genericError);
    }
  };

  const runBulkCategory = async () => {
    if (!selected.size || !bulkCategoryId || !canManage) return;
    const res = await bulkSetCategory(Array.from(selected), bulkCategoryId);
    if (res.success) {
      toast.success(`${res.count}`);
      setSelected(new Set());
      setBulkCategoryId("");
      router.refresh();
    } else {
      toast.error(formatServerActionError(res.error) || t.genericError);
    }
  };

  const colCount = (canManage ? 1 : 0) + 11 + (isCashier ? 0 : 2);

  return (
    <div
      className={cn(
        "flex min-h-[500px] w-full flex-col rounded-2xl border border-border bg-card",
        isRTL ? "text-right" : "text-left"
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {isCashier && (
        <p className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-200">
          {t.inventoryCashierNoPricing}
        </p>
      )}
      {mounted && (
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-wrap sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-1 lg:flex-wrap lg:gap-2">
            <div className="relative h-10 w-full min-w-[200px] group sm:col-span-2 lg:max-w-xs">
              <Search
                className={cn(
                  "pointer-events-none absolute inset-y-0 my-auto h-4 w-4 text-muted-foreground group-focus-within:text-amber-600",
                  isRTL ? "right-3" : "left-3"
                )}
              />
              <Input
                placeholder={t.inventorySearchPlaceholder}
                className={cn(
                  "h-10 bg-background border-border text-foreground focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 rounded-xl",
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
                    "absolute inset-y-0 my-auto flex items-center text-muted-foreground hover:text-foreground",
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
                className="h-10 w-full bg-background border-border text-foreground sm:w-[150px] rounded-xl"
                dir={isRTL ? "rtl" : "ltr"}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-popover text-popover-foreground rounded-xl">
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
                className="h-10 w-full bg-background border-border text-foreground sm:w-[160px] rounded-xl"
                dir={isRTL ? "rtl" : "ltr"}
              >
                <SelectValue placeholder={t.categoriesTab} />
              </SelectTrigger>
              <SelectContent className="border-border bg-popover text-popover-foreground rounded-xl">
                <SelectItem value="all">{t.inventoryStatusAll}</SelectItem>
                {categoriesState.map((c) => (
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
                className="h-10 w-full bg-background border-border text-foreground sm:w-[160px] rounded-xl"
                dir={isRTL ? "rtl" : "ltr"}
              >
                <SelectValue placeholder={t.inventorySupplier} />
              </SelectTrigger>
              <SelectContent className="border-border bg-popover text-popover-foreground rounded-xl">
                <SelectItem value="all">{t.inventoryAllSuppliers}</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={searchParamsHook.get("origin") || "all"}
              onValueChange={handleOriginChange}
            >
              <SelectTrigger className="h-10 w-full bg-background border-border text-foreground sm:w-[160px] rounded-xl">
                <SelectValue placeholder={t.inventoryOriginLabel} />
              </SelectTrigger>
              <SelectContent className="border-border bg-popover text-popover-foreground rounded-xl">
                <SelectItem value="all">{t.inventoryOriginAll}</SelectItem>
                <SelectItem value="LOCAL">{t.inventoryOriginLocal}</SelectItem>
                <SelectItem value="IMPORTED">{t.inventoryOriginImported}</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              className="h-10 border-border bg-card text-foreground hover:bg-muted"
              onClick={resetFilters}
            >
              {t.inventoryResetFilters}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-10 border-border bg-card text-foreground hover:bg-muted"
              onClick={() => exportCsv(initialProducts)}
            >
              <Download className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {t.inventoryExportCsv}
            </Button>
            <InventoryReportActions
              products={initialProducts}
              total={total}
              categories={categories}
              suppliers={suppliers}
              lang={lang}
              isRTL={isRTL}
              t={t}
              currency={t.currency}
              isCashier={isCashier}
              getParam={(k) => searchParamsHook.get(k)}
              currentPage={currentPage}
              totalPages={totalPages}
            />
          </div>

          {canManage && (
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 border-border bg-card text-foreground hover:bg-muted"
                onClick={openCategoryCreate}
              >
                {lang === "ar" ? "إدارة الأقسام" : "Manage Categories"}
              </Button>
              <Button
                onClick={openNew}
                className="h-10 rounded-xl bg-amber-500 px-6 font-bold text-black hover:bg-amber-600"
              >
                <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} /> {t.inventoryAddProduct}
              </Button>
            </div>
          )}
        </div>
      )}
      {canManage && !hideClassifyBanner && unclassifiedCount > 0 && (
        <div className="mx-4 mt-4 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <span className="text-amber-700 dark:text-amber-100">
            {t.inventoryUnclassifiedBanner.replace("{count}", String(unclassifiedCount))}
          </span>
          <div className="flex gap-2">
            <Button size="sm" className="bg-amber-500 text-black" onClick={() => handleOriginChange("all")}>
              {t.inventoryClassifyNow}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-amber-700 dark:text-amber-100"
              onClick={() => {
                localStorage.setItem("inventory-origin-banner-dismissed", "1");
                setHideClassifyBanner(true);
              }}
            >
              {t.dismiss}
            </Button>
          </div>
        </div>
      )}

      {canManage && selected.size > 0 && (
        <div className="flex flex-col gap-3 border-y border-amber-400/40 bg-amber-500/20 px-4 py-3 text-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <span className="shrink-0 text-base font-extrabold tracking-tight text-foreground drop-shadow-sm">
            {String(t.inventoryBulkSelectionBar || "").replace("{count}", String(selected.size))}
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              size="sm"
              type="button"
              variant="destructive"
              className="h-9 border-2 border-red-400/70 bg-red-600 px-3 font-bold text-foreground dark:text-white shadow-md hover:bg-red-500 hover:text-foreground dark:hover:text-white"
              onClick={runBulkDelete}
            >
              <Trash2 className={cn("h-4 w-4 shrink-0 opacity-95", isRTL ? "ms-1.5" : "me-1.5")} />
              {t.inventoryBulkDelete}
            </Button>
            <Select value={bulkCategoryId || "x"} onValueChange={(v) => setBulkCategoryId(v === "x" ? "" : v)}>
              <SelectTrigger
                className="h-9 min-w-[10rem] max-w-[14rem] border-2 border-border bg-card text-sm font-semibold text-foreground shadow-sm"
                dir={isRTL ? "rtl" : "ltr"}
              >
                <SelectValue placeholder={t.inventoryBulkCategory} />
              </SelectTrigger>
              <SelectContent className="border-border bg-popover text-popover-foreground">
                <SelectItem value="x">{t.inventoryBulkCategory}</SelectItem>
                {categoriesState.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              type="button"
              className="h-9 bg-amber-500 px-4 font-bold text-black shadow-sm hover:bg-amber-400"
              onClick={runBulkCategory}
              disabled={!bulkCategoryId}
            >
              {t.save}
            </Button>
            <Button
              size="sm"
              type="button"
              variant="outline"
              className="h-9 border-2 border-border bg-card font-bold text-foreground shadow-sm hover:bg-muted hover:text-foreground"
              onClick={() => exportCsv(initialProducts.filter((p) => selected.has(p.id)))}
            >
              <Download className={cn("h-4 w-4 shrink-0 opacity-95", isRTL ? "ms-2" : "me-2")} />
              {t.inventoryExportSelectedCsv}
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-x-auto">
        <table
          className={cn(
            "w-full min-w-[1100px] text-sm text-muted-foreground",
            isRTL ? "text-right" : "text-left"
          )}
        >
          <thead className="border-b border-border bg-muted/60 text-xs font-bold uppercase text-muted-foreground">
            <tr>
              {canManage && (
                <th className="w-10 px-2 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-border"
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
              <th className="min-w-[11rem] px-4 py-3">{t.inventoryOriginLabel}</th>
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
          <tbody className="divide-y divide-border">
            {initialProducts.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-4 text-muted-foreground">
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
                      !rowLow && st !== "out" && "hover:bg-muted/40"
                    )}
                  >
                    {canManage && (
                      <td className="px-2 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="rounded border-border"
                        />
                      </td>
                    )}
                    <td className="flex min-w-[220px] items-center gap-3 px-4 py-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border bg-muted group-hover:border-amber-500/30">
                        {p.images?.[0] ? (
                          <Image
                            src={p.images[0]}
                            alt=""
                            width={44}
                            height={44}
                            className="h-full w-full object-cover"
                            unoptimized={
                              p.images[0].startsWith("data:") ||
                              p.images[0].startsWith("blob:")
                            }
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-bold text-foreground group-hover:text-amber-400">
                          {displayName(p, lang)}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span
                            className={originBadgeClass(p.origin)}
                            title={
                              p.origin === "IMPORTED"
                                ? t.inventoryOriginImported
                                : t.inventoryOriginLocal
                            }
                          >
                            {p.origin === "IMPORTED"
                              ? t.inventoryOriginImportedBadge
                              : t.inventoryOriginLocalBadge}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Layers className="h-3 w-3 shrink-0" />
                          <span className="truncate">{p.name !== displayName(p, lang) ? p.name : ""}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {p.sku}
                    </td>
                    <td className="min-w-[11rem] align-top px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <span
                          className={originBadgeClass(p.origin)}
                          title={
                            p.countryOfOrigin
                              ? `${t.inventoryCountryOfOrigin}: ${p.countryOfOrigin}`
                              : p.origin === "IMPORTED"
                                ? t.inventoryOriginImported
                                : t.inventoryOriginLocal
                          }
                        >
                          {p.origin === "IMPORTED"
                            ? t.inventoryOriginImportedBadge
                            : t.inventoryOriginLocalBadge}
                        </span>
                        {p.origin === "IMPORTED" && p.countryOfOrigin ? (
                          <span className="text-[10px] text-muted-foreground">{p.countryOfOrigin}</span>
                        ) : null}
                        {canManage && (
                          <Select
                            value={p.origin || "LOCAL"}
                            onValueChange={async (val) => {
                              const res = await updateProductOriginAction({
                                productId: p.id,
                                origin: val,
                                countryOfOrigin: p.countryOfOrigin || null,
                                localPrice: p.localPrice ?? null,
                                importedPrice: p.importedPrice ?? null,
                                importTaxRate: p.importTaxRate ?? null,
                              });
                              if (!res.success) {
                                toast.error(
                                  formatServerActionError(res.error) || t.genericError
                                );
                              } else router.refresh();
                            }}
                          >
                            <SelectTrigger className="h-8 w-full min-w-[8.5rem] max-w-[11rem] border-border bg-background text-[11px] text-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-popover text-popover-foreground">
                              <SelectItem value="LOCAL">{t.inventoryOriginLocal}</SelectItem>
                              <SelectItem value="IMPORTED">{t.inventoryOriginImported}</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.barcode || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category?.name}</td>
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
                              className="flex h-6 w-6 items-center justify-center rounded border border-border bg-card hover:bg-red-500/20"
                            >
                              −
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStockUpdate(p.id, 1);
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded border border-border bg-card hover:bg-emerald-500/20"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.unit || "pcs"}</td>
                    {!isCashier && (
                      <>
                        <td className="regular-nums px-4 py-3 text-muted-foreground">
                          {p.purchasePrice != null ? `${Number(p.purchasePrice).toLocaleString()} ${t.currency}` : "—"}
                        </td>
                        <td className="regular-nums px-4 py-3 font-medium text-foreground">
                          {p.sellingPrice != null ? `${Number(p.sellingPrice).toLocaleString()} ${t.currency}` : "—"}
                        </td>
                      </>
                    )}
                    <td className="regular-nums px-4 py-3 text-muted-foreground">{p.minStock}</td>
                    <td className="px-4 py-3">
                      <div className={cn("flex flex-col gap-1.5", isRTL ? "items-end" : "items-start")}>
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
                        {p.isActive === false ? (
                          <span
                            className="rounded-full bg-zinc-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-400"
                            title={t.inventoryInactiveBadge}
                          >
                            {t.inventoryInactiveBadge}
                          </span>
                        ) : null}
                      </div>
                      {p.barcode || p.sku ? (
                        <div className="mt-2 max-w-[140px] rounded border border-border bg-card p-1 [&_svg]:max-h-12">
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
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => openEdit(p)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
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

      <div className="flex flex-col items-center justify-between gap-4 border-t border-border p-4 text-sm text-muted-foreground sm:flex-row">
        <div>
          {t.tableShowing}{" "}
          <span className="font-medium text-foreground">
            {initialProducts.length > 0 ? (currentPage - 1) * INVENTORY_PAGE_SIZE + 1 : 0}
          </span>{" "}
          {t.tableTo}{" "}
          <span className="font-medium text-foreground">
            {Math.min(currentPage * INVENTORY_PAGE_SIZE, total)}
          </span>{" "}
          {t.tableOf} <span className="font-medium text-foreground">{total}</span> {t.tableResults}
        </div>
        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <Button
            variant="outline"
            size="sm"
            className="border-border bg-card text-foreground hover:bg-muted disabled:opacity-50"
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
          <div className="rounded-md border border-border bg-card px-4 py-1.5 font-medium text-foreground">
            {t.tablePage} {currentPage} {t.tableOf} {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-border bg-card text-foreground hover:bg-muted disabled:opacity-50"
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
          categories={categoriesState}
          suppliers={suppliers}
        />
      )}

      <Dialog
        open={isCategoriesOpen}
        onOpenChange={(open) => {
          setIsCategoriesOpen(open);
          if (!open) resetCategoryForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card p-0 text-foreground">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>{lang === "ar" ? "إدارة الأقسام" : "Manage Categories"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 px-6 pt-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {lang === "ar" ? "الاسم بالإنجليزية" : "English name"} <span className="text-red-500">*</span>
              </label>
              <Input
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Lighting"
                className="border-border bg-background"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {lang === "ar" ? "الاسم بالعربية" : "Arabic name"}
              </label>
              <Input
                value={categoryForm.nameAr}
                onChange={(e) =>
                  setCategoryForm((prev) => ({ ...prev, nameAr: e.target.value }))
                }
                placeholder="مثال: الإضاءة"
                className="border-border bg-background"
                dir="rtl"
              />
            </div>
            <Input
              value={categoryForm.description}
              onChange={(e) =>
                setCategoryForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder={lang === "ar" ? "وصف (اختياري)" : "Description (optional)"}
              className="border-border bg-background"
            />
            <Input
              value={categoryForm.image}
              onChange={(e) =>
                setCategoryForm((prev) => ({ ...prev, image: e.target.value }))
              }
              placeholder={lang === "ar" ? "رابط صورة (اختياري)" : "Image URL (optional)"}
              className="border-border bg-background"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                className="bg-amber-500 text-black hover:bg-amber-600"
                onClick={saveCategory}
                disabled={categorySaving}
              >
                {categorySaving
                  ? t.saving
                  : categoryForm.id
                    ? lang === "ar"
                      ? "تحديث القسم"
                      : "Update Category"
                    : lang === "ar"
                      ? "إضافة قسم"
                      : "Add Category"}
              </Button>
              {categoryForm.id ? (
                <Button type="button" variant="ghost" onClick={resetCategoryForm}>
                  {lang === "ar" ? "إلغاء التعديل" : "Cancel edit"}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 space-y-2 px-6 pb-6">
            {categoriesState.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {lang === "ar" && category.nameAr ? category.nameAr : category.name}
                  </p>
                  {lang === "ar" && category.nameAr && (
                    <p className="truncate text-xs text-muted-foreground">{category.name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {(category.productCount || 0).toLocaleString()}{" "}
                    {lang === "ar" ? "منتج" : "products"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => openCategoryEdit(category)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => handleCategoryDelete(category)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
