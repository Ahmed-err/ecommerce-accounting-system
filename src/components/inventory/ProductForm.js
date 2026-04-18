"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadButton } from "@/lib/uploader";
import { createProduct, updateProduct, generateSkuSuggestion } from "@/app/actions/inventory";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { Loader2 } from "lucide-react";
import { cn, formatServerActionError } from "@/lib/utils";
import InventoryBarcode from "./InventoryBarcode";

const MAX_PRODUCT_IMAGES = 4;
const COUNTRY_OPTIONS = [
  "Egypt",
  "China",
  "Turkey",
  "Germany",
  "Italy",
  "USA",
  "South Korea",
  "Japan",
  "Taiwan",
  "Other",
];

function formatUploadError(err, fallback) {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err?.message === "string" && err.message.trim()) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return fallback;
  }
}

function pickUploadUrl(file) {
  if (!file || typeof file !== "object") return "";
  return (
    file.url ||
    file.ufsUrl ||
    file.appUrl ||
    file.serverData?.url ||
    file.serverData?.ufsUrl ||
    ""
  );
}

const emptyForm = {
  name: "",
  nameEn: "",
  nameAr: "",
  description: "",
  descriptionEn: "",
  descriptionAr: "",
  sku: "",
  barcode: "",
  unit: "pcs",
  purchasePrice: 0,
  sellingPrice: 0,
  stock: 0,
  minStock: 5,
  categoryId: "",
  supplierId: "",
  origin: "LOCAL",
  localPrice: "",
  importedPrice: "",
  countryOfOrigin: "",
  importTaxRate: "",
  images: [],
  isActive: true,
};

export default function ProductForm({ isOpen, onClose, product, categories, suppliers = [] }) {
  const router = useRouter();
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const isEditing = !!product;

  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        nameEn: product.nameEn || "",
        nameAr: product.nameAr || "",
        description: product.description || "",
        descriptionEn: product.descriptionEn || "",
        descriptionAr: product.descriptionAr || "",
        sku: product.sku || "",
        barcode: product.barcode || "",
        unit: product.unit || "pcs",
        purchasePrice: product.purchasePrice ?? 0,
        sellingPrice: product.sellingPrice ?? 0,
        stock: product.stock ?? 0,
        minStock: product.minStock ?? 5,
        categoryId: product.categoryId || "",
        supplierId: product.supplierId || "",
        origin: product.origin || "LOCAL",
        localPrice: product.localPrice ?? "",
        importedPrice: product.importedPrice ?? "",
        countryOfOrigin: product.countryOfOrigin || "",
        importTaxRate: product.importTaxRate ?? "",
        images: product.images || [],
        isActive: product.isActive !== false,
      });
    } else {
      setFormData({ ...emptyForm });
    }
    setError("");
  }, [product, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenSku = async () => {
    const res = await generateSkuSuggestion();
    if (res.success) {
      setFormData((prev) => ({ ...prev, sku: res.sku }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!formData.categoryId) throw new Error(t.inventorySelectCategoryError);

      const payload = {
        name: formData.name,
        nameEn: formData.nameEn || null,
        nameAr: formData.nameAr || null,
        description: formData.description || null,
        descriptionEn: formData.descriptionEn || null,
        descriptionAr: formData.descriptionAr || null,
        sku: formData.sku,
        barcode: formData.barcode || null,
        unit: formData.unit || "pcs",
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        stock: parseInt(formData.stock, 10),
        minStock: parseInt(formData.minStock, 10),
        categoryId: formData.categoryId,
        supplierId: formData.supplierId || null,
        origin: formData.origin || "LOCAL",
        localPrice: formData.localPrice === "" ? null : Number(formData.localPrice),
        importedPrice: formData.importedPrice === "" ? null : Number(formData.importedPrice),
        countryOfOrigin: formData.countryOfOrigin || null,
        importTaxRate: formData.importTaxRate === "" ? null : Number(formData.importTaxRate),
        images: formData.images || [],
        isActive: formData.isActive,
      };

      const res = isEditing
        ? await updateProduct(product.id, payload)
        : await createProduct(payload);

      if (res.success) {
        onClose();
        router.refresh();
      } else {
        setError(formatServerActionError(res.error) || t.inventorySaveError);
      }
    } catch (err) {
      setError(formatUploadError(err, t.inventorySaveError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden border-border bg-card p-0 text-card-foreground sm:w-full",
          isRTL && "text-right"
        )}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className={cn("shrink-0 border-b border-border px-6 pb-4 pt-6", isRTL ? "ps-12 pe-6" : "pe-12 ps-6")}>
          <DialogHeader className={cn("space-y-2 p-0", isRTL ? "text-end" : "text-start")}>
            <DialogTitle className="text-lg text-foreground">
              {isEditing ? t.inventoryEditProduct : t.inventoryAddNewProduct}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isEditing ? t.inventoryUpdateDetails : t.inventoryFillDetails}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-500/15 p-3 text-center text-sm text-red-700 dark:text-red-400">{error}</div>
          )}

          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.inventoryBasicInfo}
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.inventoryProductName}</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.inventoryNameEn}</label>
                <Input name="nameEn" value={formData.nameEn} onChange={handleChange} className="bg-background border-border" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.inventoryNameAr}</label>
                <Input name="nameAr" value={formData.nameAr} onChange={handleChange} className="bg-background border-border" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <label className="text-sm font-medium">{t.inventorySkuModel}</label>
                    <Input name="sku" value={formData.sku} onChange={handleChange} required className="bg-background border-border font-mono text-sm" />
                  </div>
                  <Button type="button" variant="outline" className="border-border text-foreground" onClick={handleGenSku}>
                    {t.inventoryGenSku}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.inventoryColBarcode}</label>
                <Input name="barcode" value={formData.barcode} onChange={handleChange} className="bg-background border-border font-mono text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.inventoryColUnit}</label>
                <Input name="unit" value={formData.unit} onChange={handleChange} className="bg-background border-border" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.categoriesTab}</label>
                <Select
                  value={formData.categoryId?.toString() || ""}
                  onValueChange={(v) => setFormData((p) => ({ ...p, categoryId: v }))}
                >
                  <SelectTrigger className="border-border bg-background text-foreground">
                    <SelectValue placeholder={t.inventorySelectCategory} />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover text-popover-foreground">
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.inventorySupplier}</label>
                <Select
                  value={formData.supplierId || "none"}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, supplierId: v === "none" ? "" : v }))
                  }
                >
                  <SelectTrigger className="border-border bg-background text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover text-popover-foreground">
                    <SelectItem value="none">{t.inventoryAllSuppliers}</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t.accountingDesc}</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-md border border-border bg-background p-2 text-sm text-foreground"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.inventoryDescEn}</label>
                <textarea
                  name="descriptionEn"
                  value={formData.descriptionEn}
                  onChange={handleChange}
                  rows={2}
                  className="w-full rounded-md border border-border bg-background p-2 text-sm text-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.inventoryDescAr}</label>
                <textarea
                  name="descriptionAr"
                  value={formData.descriptionAr}
                  onChange={handleChange}
                  rows={2}
                  className="w-full rounded-md border border-border bg-background p-2 text-sm text-foreground"
                />
              </div>
            </div>

            {formData.barcode || formData.sku ? (
              <div className="rounded-lg border border-border bg-background p-3" dir="ltr">
                <InventoryBarcode value={formData.barcode || formData.sku} />
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.inventoryPriceStock}
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-amber-700 dark:text-amber-400">{t.inventoryPurchasePrice}</label>
                <Input
                  type="number"
                  step="0.01"
                  name="purchasePrice"
                  value={formData.purchasePrice}
                  onChange={handleChange}
                  required
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{t.inventorySellingPrice}</label>
                <Input
                  type="number"
                  step="0.01"
                  name="sellingPrice"
                  value={formData.sellingPrice}
                  onChange={handleChange}
                  required
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.inventoryCurrentStock}</label>
                <Input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  required
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.inventoryMinStockAlert}</label>
                <Input
                  type="number"
                  name="minStock"
                  value={formData.minStock}
                  onChange={handleChange}
                  required
                  className="bg-background border-border"
                />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="rounded border-border"
              />
              {t.inventoryActive}
            </label>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.inventoryProductOriginSection}
            </h4>
            {isEditing && product?.origin && product.origin !== formData.origin ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                {t.inventoryOriginChangeWarning}
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.inventoryOriginLabel}</label>
                <Select
                  value={formData.origin}
                  onValueChange={(v) => setFormData((p) => ({ ...p, origin: v }))}
                >
                  <SelectTrigger className="border-border bg-background text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover text-popover-foreground">
                    <SelectItem value="LOCAL">{t.inventoryOriginLocal}</SelectItem>
                    <SelectItem value="IMPORTED">{t.inventoryOriginImported}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.inventoryCountryOfOrigin}</label>
                <Input
                  name="countryOfOrigin"
                  list="origin-country-list"
                  value={formData.countryOfOrigin}
                  onChange={handleChange}
                  required={formData.origin === "IMPORTED"}
                  className="bg-background border-border"
                />
                <datalist id="origin-country-list">
                  {COUNTRY_OPTIONS.map((country) => (
                    <option key={country} value={country} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.inventoryLocalPrice}</label>
                <Input
                  type="number"
                  step="0.01"
                  name="localPrice"
                  value={formData.localPrice}
                  onChange={handleChange}
                  className="bg-background border-border"
                />
              </div>
              {formData.origin === "IMPORTED" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.inventoryImportedPrice}</label>
                    <Input
                      type="number"
                      step="0.01"
                      name="importedPrice"
                      value={formData.importedPrice}
                      onChange={handleChange}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.inventoryImportTaxRate}</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      name="importTaxRate"
                      value={formData.importTaxRate}
                      onChange={handleChange}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">{t.inventoryLandedCost}</label>
                    <Input
                      readOnly
                      value={(
                        Number(formData.importedPrice || 0) *
                        (1 + Number(formData.importTaxRate || 0) / 100)
                      ).toFixed(2)}
                      className="bg-background border-border"
                    />
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.inventoryProductImages}
              </h4>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {formData.images.length}/{MAX_PRODUCT_IMAGES}
              </span>
            </div>

            {formData.images.length > 0 && (
              <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {formData.images.map((img, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                    <Image
                      src={img}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 25vw"
                      unoptimized={img.startsWith("data:") || img.startsWith("blob:")}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          images: prev.images.filter((_, index) => index !== i),
                        }))
                      }
                      className="absolute -top-1 end-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow-lg"
                    >
                      ×
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1 start-1 rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-tighter text-white">
                        {t.inventoryImagePrimary}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-6">
              {formData.images.length >= MAX_PRODUCT_IMAGES ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {lang === "ar"
                    ? `تم الوصول للحد الأقصى (${MAX_PRODUCT_IMAGES}) للصور. احذف صورة لإضافة أخرى.`
                    : `Maximum ${MAX_PRODUCT_IMAGES} images reached. Remove one to upload another.`}
                </p>
              ) : (
                <UploadButton
                  endpoint="productImage"
                  content={{
                    button: ({ ready }) => (ready ? t.inventoryUploadImages : t.saving),
                    allowedContent: t.inventoryUploadLimit,
                  }}
                  className="rounded-md bg-amber-500 px-4 py-2 font-bold text-black hover:bg-amber-600 disabled:opacity-60"
                  onClientUploadComplete={(res) => {
                    if (!res?.length) return;
                    const slotsLeft = Math.max(0, MAX_PRODUCT_IMAGES - formData.images.length);
                    const newUrls = res
                      .map((f) => pickUploadUrl(f))
                      .filter(Boolean)
                      .slice(0, slotsLeft);
                    if (newUrls.length === 0) {
                      const msg =
                        lang === "ar"
                          ? "تم الرفع لكن لم يتم استلام رابط الصورة."
                          : "Upload finished but no image URL was returned.";
                      setError(msg);
                      return;
                    }
                    setFormData((prev) => ({
                      ...prev,
                      images: [...prev.images, ...newUrls].slice(0, MAX_PRODUCT_IMAGES),
                    }));
                  }}
                  onUploadError={(err) => {
                    const base = lang === "ar" ? "فشل الرفع" : "Upload failed";
                    setError(`${base}: ${formatUploadError(err, base)}`);
                  }}
                />
              )}
            </div>
          </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-border bg-muted/40 px-6 py-4">
            <div className={cn("flex flex-wrap justify-end gap-3", isRTL && "flex-row-reverse")}>
              <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="text-foreground hover:bg-muted">
                {t.cancel}
              </Button>
              <Button type="submit" disabled={loading} className="bg-amber-500 font-semibold text-black hover:bg-amber-600">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.saving}</> : t.inventorySaveProduct}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
