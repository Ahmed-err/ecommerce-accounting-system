"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTransaction, updateTransaction } from "@/app/actions/accounting";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { useSession } from "next-auth/react";
import { UploadButton } from "@/lib/uploader";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const PRESET_CATEGORIES = [
  "Sales", "Salaries", "Rent", "Supplies", "Utilities",
  "Maintenance", "Marketing", "Shipping", "Taxes", "Refund", "Other",
];

const today = () => new Date().toISOString().split("T")[0];

export default function TransactionForm({ isOpen, onClose, transaction }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const isEditing = !!transaction;
  const { data: session } = useSession();
  const managerNoIncome = session?.user?.role === "MANAGER";

  const [formData, setFormData] = useState({
    type: "INCOMING",
    amount: "",
    description: "",
    category: "",
    reference: "",
    date: today(),
    paymentMethod: "",
    receiptUrl: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (transaction) {
      const amt = typeof transaction.amount?.toNumber === "function" ? transaction.amount.toNumber() : Number(transaction.amount);
      setFormData({
        type: transaction.type,
        amount: String(amt),
        description: transaction.description,
        category: transaction.category,
        reference: transaction.reference || "",
        date: new Date(transaction.date).toISOString().split("T")[0],
        paymentMethod: transaction.paymentMethod || "",
        receiptUrl: transaction.receiptUrl || "",
      });
    } else {
      setFormData({
        type: managerNoIncome ? "OUTGOING" : "INCOMING",
        amount: "",
        description: "",
        category: "",
        reference: "",
        date: today(),
        paymentMethod: "",
        receiptUrl: "",
      });
    }
    setError("");
  }, [transaction, isOpen, managerNoIncome]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!formData.amount || parseFloat(formData.amount) <= 0) throw new Error(lang === 'ar' ? "يرجى إدخال مبلغ صحيح" : "Please enter a valid amount.");
      if (!formData.description.trim()) throw new Error(lang === 'ar' ? "الوصف مطلوب" : "Description is required.");
      if (!formData.category) throw new Error(lang === 'ar' ? "يرجى اختيار فئة" : "Please select a category.");

      const payload = {
        ...formData,
        receiptUrl: formData.receiptUrl || null,
        paymentMethod: formData.paymentMethod || null,
      };

      const res = isEditing
        ? await updateTransaction(transaction.id, payload)
        : await createTransaction(payload);

      if (res.success) {
        onClose();
      } else {
        const msg = res.error || (lang === "ar" ? "فشل حفظ المعاملة" : "Failed to save transaction.");
        setError(msg);
        if (msg.includes("Unauthorized") || msg.includes("locked")) {
          toast.error(lang === "ar" ? "غير مسموح" : msg);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isIncoming = formData.type === "INCOMING";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side={isRTL ? "right" : "left"} className={`w-full overflow-y-auto border-border bg-card pb-24 text-card-foreground sm:max-w-lg ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
        <SheetHeader>
          <SheetTitle className={isRTL ? "text-right" : "text-left"}>
            {isEditing ? t.accountingEditTransactionHeader : t.accountingAddNewTransactionHeader}
          </SheetTitle>
          <SheetDescription className={isRTL ? "text-right" : "text-left"}>
            {isEditing ? t.accountingUpdateDetails : t.accountingFillDetails}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 px-2 pb-6">
          {error && (
            <div className="rounded-md bg-red-500/15 p-3 text-sm text-red-700 dark:text-red-400">{error}</div>
          )}

          {/* Type Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t.accountingType}</label>
            <div className={`flex overflow-hidden rounded-xl border border-border ${isRTL ? "flex-row-reverse" : "flex-row"}`}>
              <button
                type="button"
                disabled={managerNoIncome}
                onClick={() => setFormData((p) => ({ ...p, type: "INCOMING" }))}
                className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                  isIncoming ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                } ${managerNoIncome ? "cursor-not-allowed opacity-40" : ""}`}
              >
                {isRTL ? "إيراد ↑" : "↑ Incoming"}
              </button>
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, type: "OUTGOING" }))}
                className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                  !isIncoming ? "bg-red-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {isRTL ? "مصروف ↓" : "↓ Outgoing"}
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t.accountingAmount} ({t.currency})</label>
            <Input
              type="number"
              name="amount"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
              required
              className={`border-border bg-background text-lg text-foreground ${isRTL ? "text-right" : "text-left"}`}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t.accountingDesc}</label>
            <Input
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder={lang === 'ar' ? "مثال: دفع إيجار المحل" : "e.g. Monthly rent payment"}
              required
              className={`border-border bg-background text-foreground ${isRTL ? "text-right" : "text-left"}`}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t.accountingCategory}</label>
            <Select
              value={formData.category}
              onValueChange={(val) => setFormData((p) => ({ ...p, category: val }))}
            >
              <SelectTrigger className={`border-border bg-background text-foreground ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
                <SelectValue placeholder={t.accountingSelectCategory}>
                  {formData.category || undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className={`border-border bg-popover text-popover-foreground ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
                {PRESET_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t.accountingRef} <span className="text-xs text-muted-foreground">{t.optional}</span>
            </label>
            <Input
              name="reference"
              value={formData.reference}
              onChange={handleChange}
              placeholder="INV-2024-001"
              className={`border-border bg-background text-foreground ${isRTL ? "text-right" : "text-left"}`}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t.accountingDate}</label>
            <Input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className={`border-border bg-background text-foreground ${isRTL ? "text-right" : "text-left"}`}
            />
          </div>

          {!isIncoming && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t.accFilterPayment}</label>
                <Select
                  value={formData.paymentMethod || "CASH"}
                  onValueChange={(val) => setFormData((p) => ({ ...p, paymentMethod: val }))}
                >
                  <SelectTrigger className={`border-border bg-background text-foreground ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover text-popover-foreground">
                    <SelectItem value="CASH">{lang === "ar" ? "نقداً" : "Cash"}</SelectItem>
                    <SelectItem value="BANK_TRANSFER">{lang === "ar" ? "تحويل بنكي" : "Bank Transfer"}</SelectItem>
                    <SelectItem value="CARD">{lang === "ar" ? "بطاقة" : "Card"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t.accReceipt}</label>
                <div className="rounded-xl border border-dashed border-border p-4">
                  <UploadButton
                    endpoint="expenseReceipt"
                    content={{
                      button: ({ ready }) => (ready ? t.accReceipt : t.saving),
                      allowedContent: "Image max 4MB",
                    }}
                    className="rounded-md bg-amber-500 px-4 py-2 font-bold text-black hover:bg-amber-600 disabled:opacity-60"
                    onClientUploadComplete={(res) => {
                      if (res?.[0]?.url) setFormData((p) => ({ ...p, receiptUrl: res[0].url }));
                    }}
                    onUploadError={(err) => toast.error(err.message)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="hover:bg-muted">
              {t.cancel}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={`font-semibold text-white ${
                isIncoming
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.saving}</> : t.accountingSaveTransaction}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
