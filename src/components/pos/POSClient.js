"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Search, ShoppingCart, Trash2, Plus, Minus,
  CreditCard, Banknote, Printer, ArrowLeft,
  Package, X, CheckCircle, AlertTriangle,
  Tag, RotateCcw, Landmark, ChevronUp,
  User, Percent, Wallet, DollarSign,
  XCircle, Download, FileText, Languages,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useLanguage, useT } from "@/context/LanguageContext";
import { ThemeToggle } from "@/components/ThemeToggle";

import { createPOSOrder, getProductStock } from "@/app/actions/pos";
import { buildReceiptData } from "@/lib/receipt";
import { CASHIER_MAX_DISCOUNT_PERCENT, previewSale } from "@/lib/pos-pricing";
import { translateCategory } from "@/lib/i18n/translate-category";
import BrandLockup from "@/components/brand/BrandLockup";
import PrinterStatus from "@/components/pos/PrinterStatus";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Western digits in both languages, as in the rest of the admin.
const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const displayName = (p, isArabic) => (isArabic ? p.nameAr || p.name : p.nameEn || p.name);
const sellable = (p) => p.isActive !== false && p.stock > 0 && Number(p.sellingPrice) > 0;

// ─── ProductCard ──────────────────────────────────────────────────────────────
function ProductCard({ product, onAdd, t, isArabic }) {
  const noPrice = !(Number(product.sellingPrice) > 0);
  const outOfStock = product.stock <= 0 || noPrice;
  const isLowStock = !outOfStock && product.stock <= product.minStock;
  const name = displayName(product, isArabic);
  
  return (
    <motion.button
      whileHover={!outOfStock ? { scale: 1.02, y: -2 } : {}}
      whileActive={!outOfStock ? { scale: 0.98 } : {}}
      onClick={() => !outOfStock && onAdd(product)}
      disabled={outOfStock}
      className={cn(
        "group relative flex flex-col bg-card/80 backdrop-blur-sm border border-border rounded-2xl overflow-hidden text-start transition-all duration-200 h-full",
        outOfStock
          ? "opacity-60 grayscale cursor-not-allowed"
          : "hover:border-amber-500/40 hover:shadow-2xl cursor-pointer"
      )}
    >
      <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden shrink-0">
        {product.images?.[0] ? (
          <Image 
            src={product.images[0]} 
            alt={name} 
            fill 
            unoptimized 
            className="object-contain p-1.5 transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-background">
            <Package className="w-8 h-8 text-muted-foreground/40" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 start-2 flex flex-col gap-1 z-10">
          {outOfStock ? (
            <Badge className="bg-red-600/90 text-white border-0 font-black tracking-tighter text-[9px] uppercase backdrop-blur-sm">
              {noPrice ? t.noPrice : t.outOfStock}
            </Badge>
          ) : isLowStock ? (
            <Badge variant="warning" className="bg-amber-500 text-black border-0 font-black tracking-tighter text-[9px] uppercase backdrop-blur-sm">
              {t.low}
            </Badge>
          ) : null}
        </div>

        {/* Action Overlay */}
        {!outOfStock && (
          <div className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/10 transition-colors flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-amber-500 text-black flex items-center justify-center opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-xl">
              <Plus className="w-6 h-6" />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex flex-col items-start gap-1 sm:flex-row sm:justify-between">
          <h3 className="text-[13px] font-bold text-foreground leading-tight line-clamp-2 flex-1">{name}</h3>
          <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded leading-none">
            {product.sku || (t.noSku)}
          </span>
        </div>
        
        <div className="mt-auto flex items-end justify-between">
          <span className="text-sm font-black text-accent-text flex items-baseline gap-0.5 tabular-nums">
            {noPrice ? "—" : fmt(product.sellingPrice)} <span className="text-[10px] font-bold text-accent-text">{t.currency}</span>
          </span>
          <div className="text-end">
            <span className={cn(
              "text-[10px] font-black tracking-tight",
              isLowStock ? "text-accent-text" : "text-muted-foreground"
            )}>
              {fmt(product.stock)} {t.left}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ─── CartItem ─────────────────────────────────────────────────────────────────
function CartItem({ item, onUpdateQty, onRemove, t, isArabic }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: isArabic ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 group hover:border-amber-500/20 transition-all relative"
    >
      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0 border border-border shadow-inner">
        {item.images?.[0]
          ? <Image src={item.images[0]} alt={displayName(item, isArabic)} fill unoptimized className="object-contain p-1" />
          : <Package className="w-6 h-6 text-muted-foreground/40 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-[13px] font-bold text-foreground truncate group-hover:text-accent-text transition-colors">{displayName(item, isArabic)}</h4>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-bold text-muted-foreground tabular-nums">{fmt(item.sellingPrice)} × {item.quantity}</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <span className="font-black text-accent-text tabular-nums">{fmt(item.sellingPrice * item.quantity)} {t.currency}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1 items-end shrink-0 ms-auto">
        <div className="flex items-center bg-muted/90 rounded-lg p-0.5 border border-border shadow-lg">
          <button
            type="button"
            onClick={() => onUpdateQty(item.id, -1)}
            className="w-7 h-7 flex items-center justify-center bg-secondary hover:bg-secondary/80 rounded-md transition-colors text-secondary-foreground active:scale-90"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-9 text-center text-sm font-black text-foreground tabular-nums select-none">{item.quantity}</span>
          <button
            type="button"
            onClick={() => onUpdateQty(item.id, 1)}
            className="w-7 h-7 flex items-center justify-center bg-secondary hover:bg-secondary/80 rounded-md transition-colors text-secondary-foreground active:scale-90"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        aria-label={t.remove}
        className="absolute -top-1.5 -end-1.5 w-6 h-6 flex items-center justify-center bg-red-600 text-white rounded-full opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 transition-all shadow-xl"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

function mergePrinter(initial) {
  const base = {
    printerType: "THERMAL",
    printerConnection: "USB",
    autoPrint: true,
    paperWidth: "80",
    receiptFooterAr: "",
    receiptFooterEn: "",
    showLogo: true,
    showBarcode: true,
    vatLabelAr: "",
    vatLabelEn: "",
    vatPercentage: null,
    vatEnabled: false,
    nameAr: "",
    nameEn: "",
    addressAr: "",
    addressEn: "",
    logoUrl: "",
    contactPhone: "",
    currency: "SDG",
  };
  return { ...base, ...(initial && typeof initial === "object" ? initial : {}) };
}

// ─── Main POS Client ──────────────────────────────────────────────────────────
export default function POSClient({ initialProducts, initialPrinterSettings }) {
  const router = useRouter();
  const { data: session } = useSession();
  const searchInputRef = useRef(null);
  const { lang, setLang, isRTL } = useLanguage();
  const isArabic = lang === "ar";
  
  const translations = {
    ar: {
      low: "منخفض",
      outOfStock: "نفد",
      noPrice: "بدون سعر",
      remove: "حذف",
      pay: "دفع",
      kbSearch: "بحث",
      kbClose: "إغلاق",
      viewCart: "السلة",
      discountLimit: `أقصى خصم للكاشير ${CASHIER_MAX_DISCOUNT_PERCENT}% — اطلب من المدير`,
      discountBad: "قيمة الخصم غير صحيحة",
      err_EMPTY: "السلة فارغة",
      err_BAD_PAYMENT: "اختر طريقة دفع",
      err_UNAVAILABLE: "منتج في السلة لم يعد متاحاً. حدّث الصفحة.",
      err_NO_STOCK: "الكمية غير متوفرة: {name}",
      err_ZERO_PRICE: "لا يمكن بيع منتج بدون سعر: {name}",
      err_BAD_QTY: "كمية غير صحيحة",
      err_BAD_DISCOUNT: "قيمة الخصم غير صحيحة",
      err_DISCOUNT_LIMIT: `أقصى خصم للكاشير ${CASHIER_MAX_DISCOUNT_PERCENT}% — اطلب من المدير`,
      left: "متبقي",
      noSku: "بدون باركود",
      maxReached: "تم الوصول للحد الأقصى للمخزون",
      walkIn: "عميل مباشر",
      posTerminal: "نقطة بيع",
      back: "رجوع",
      scanBarcode: "مسح الباركود",
      searchPlaceholder: "امسح الباركود (F2) أو ابحث...",
      all: "الكل",
      noProducts: "لا توجد نتائج",
      cartTitle: "عملية البيع",
      clear: "تفريغ",
      cartEmpty: "السلة فارغة",
      subtotal: "الإجمالي الفرعي",
      discount: "خصم",
      total: "الإجمالي النهائي",
      currency: "ج.س",
      checkoutTitle: "إتمام عملية الدفع",
      amountTendered: "المبلغ المقبوض",
      change: "الباقي للعميل",
      paymentMethod: "طريقة الدفع",
      cash: "نقداً",
      card: "بطاقة",
      bank: "بنكك",
      customer: "العميل",
      completeCheckout: "تأكيد الدفع",
      processing: "جاري المعالجة...",
      error: "خطأ",
      success: "تم بنجاح",
      sync: "مزامنة",
      refresh: "تحديث",
      lastSync: "آخر تحديث",
      discountFixed: "ج.س",
      discountPercent: "%",
      printReceipt: "طباعة الإيصال",
      downloadPdf: "تنزيل PDF",
      openInvoice: "فتح الفاتورة",
      doneSuccess: "تم",
      checkoutDoneTitle: "اكتمل الدفع",
      reprintLast: "إعادة طباعة آخر إيصال",
      printerSetup: "إعداد الطابعة",
      printerBrowserNote:
        "تعمل Web USB / Serial / Bluetooth بشكل أفضل في Chrome أو Edge. المتصفحات الأخرى تستخدم نافذة الطباعة / PDF.",
      paperWidth: "عرض الورق",
      fromStoreSettings: "من إعدادات المتجر",
      connectUsbSerial: "ربط USB (تسلسلي)",
      connectWebUsb: "ربط WebUSB",
      connectBluetooth: "ربط بلوتوث",
      testPrint: "طباعة تجريبية",
      close: "إغلاق",
      noPrinterConnected: "لا توجد طابعة متصلة",
      printTimeout: "انتهت مهلة الطباعة",
      printerOffline: "الطابعة غير متصلة",
      thermalFallback: "الطابعة الحرارية غير متاحة — تم فتح الطباعة / PDF",
      printOpened: "الإيصال جاهز للطباعة أو الحفظ كـ PDF",
      printSuccess: "تم الإرسال للطابعة",
      downloadPdfHint: "استخدم طباعة المتصفح واختر حفظ كـ PDF",
      printFailed: "فشلت الطباعة",
    },
    en: {
      low: "Low",
      outOfStock: "Out of stock",
      noPrice: "No price",
      remove: "Remove",
      pay: "Pay",
      kbSearch: "Search",
      kbClose: "Close",
      viewCart: "Cart",
      discountLimit: `Cashier discount limit is ${CASHIER_MAX_DISCOUNT_PERCENT}% — ask a manager`,
      discountBad: "Invalid discount",
      err_EMPTY: "The cart is empty",
      err_BAD_PAYMENT: "Choose a payment method",
      err_UNAVAILABLE: "A product in the cart is no longer available. Refresh the page.",
      err_NO_STOCK: "Not enough stock: {name}",
      err_ZERO_PRICE: "Can't sell a product without a price: {name}",
      err_BAD_QTY: "Invalid quantity",
      err_BAD_DISCOUNT: "Invalid discount",
      err_DISCOUNT_LIMIT: `Cashier discount limit is ${CASHIER_MAX_DISCOUNT_PERCENT}% — ask a manager`,
      left: "left",
      noSku: "No SKU",
      maxReached: "Max stock reached",
      walkIn: "Walk-in Customer",
      posTerminal: "POS Terminal",
      back: "Back",
      scanBarcode: "Scan barcode",
      searchPlaceholder: "Scan (F2) or search...",
      all: "All",
      noProducts: "No results",
      cartTitle: "Current sale",
      clear: "Clear",
      cartEmpty: "Cart is empty",
      subtotal: "Subtotal",
      discount: "Discount",
      total: "Total",
      currency: "SDG",
      checkoutTitle: "Payment",
      amountTendered: "Amount Tendered",
      change: "Change",
      paymentMethod: "Payment Method",
      cash: "Cash",
      card: "Card",
      bank: "Bankak",
      customer: "Customer",
      completeCheckout: "Confirm payment",
      processing: "Processing...",
      error: "Error",
      success: "Success",
      sync: "Syncing",
      refresh: "Refresh",
      lastSync: "Last sync",
      discountFixed: "SDG",
      discountPercent: "%",
      printReceipt: "Print receipt",
      downloadPdf: "Download PDF",
      openInvoice: "Open invoice",
      doneSuccess: "Done",
      checkoutDoneTitle: "Checkout complete",
      reprintLast: "Reprint last receipt",
      printerSetup: "Printer setup",
      printerBrowserNote:
        "Web USB / Serial / Bluetooth work best in Chrome or Edge. Other browsers use the print dialog / PDF.",
      paperWidth: "Paper width",
      fromStoreSettings: "from store settings",
      connectUsbSerial: "Connect USB (Serial)",
      connectWebUsb: "Connect WebUSB printer",
      connectBluetooth: "Connect Bluetooth",
      testPrint: "Test print",
      close: "Close",
      noPrinterConnected: "No printer connected",
      printTimeout: "Print timed out",
      printerOffline: "Printer offline",
      thermalFallback: "Thermal printer unavailable — opened print / PDF",
      printOpened: "Receipt ready to print or save as PDF",
      printSuccess: "Sent to printer",
      downloadPdfHint: "Use the browser print dialog and choose Save as PDF",
      printFailed: "Print failed",
    }
  };

  const t = translations[lang] || translations.en;
  const dict = useT();
  const role = session?.user?.role;

  const printMessages = useMemo(
    () => ({
      noPrinterConnected: t.noPrinterConnected,
      printTimeout: t.printTimeout,
      printerOffline: t.printerOffline,
      thermalFallback: t.thermalFallback,
      printOpened: t.printOpened,
      printSuccess: t.printSuccess,
      downloadPdfHint: t.downloadPdfHint,
      printFailed: t.printFailed,
      printerSetup: t.printerSetup,
      printerBrowserNote: t.printerBrowserNote,
      paperWidth: t.paperWidth,
      fromStoreSettings: t.fromStoreSettings,
      connectUsbSerial: t.connectUsbSerial,
      connectWebUsb: t.connectWebUsb,
      connectBluetooth: t.connectBluetooth,
      testPrint: t.testPrint,
      close: t.close,
    }),
    [t]
  );

  const [products, setProducts] = useState(initialProducts);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Checkout State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountTendered, setAmountTendered] = useState("");
  const [customerName, setCustomerName] = useState(t.walkIn);
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState("fixed"); // 'fixed' or 'percent'
  const [checkoutError, setCheckoutError] = useState("");
  const [cartOpen, setCartOpen] = useState(false); // phone only
  const [printerSettings, setPrinterSettings] = useState(() => mergePrinter(initialPrinterSettings));
  const [checkoutSuccessOpen, setCheckoutSuccessOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [lastOrderId, setLastOrderId] = useState(null);
  const [printLoading, setPrintLoading] = useState(false);

  const barcodeBuffer = useRef("");
  const barcodeTimeout = useRef(null);

  // Totals
  // Same rules as the server (no tax, cashier discount cap); the server recalculates on save.
  const { subtotal, total, error: discountError } = useMemo(
    () =>
      previewSale({
        lines: cart.map((i) => ({ price: i.sellingPrice, quantity: i.quantity })),
        role,
        discountType,
        discountValue,
      }),
    [cart, role, discountType, discountValue]
  );
  const itemCount = cart.reduce((a, b) => a + b.quantity, 0);
  const changeAmount = useMemo(() => {
    const tendered = parseFloat(amountTendered) || 0;
    return tendered > total ? tendered - total : 0;
  }, [amountTendered, total]);

  // Sync products stock
  const syncStock = useCallback(async () => {
    setRefreshing(true);
    try {
      const stockData = await getProductStock();
      if (stockData?.length > 0) {
        const byId = new Map(stockData.map((s) => [s.id, s]));
        setProducts((prev) =>
          prev
            .filter((p) => byId.has(p.id))
            .map((p) => {
              const u = byId.get(p.id);
              return { ...p, stock: u.stock, sellingPrice: u.sellingPrice, isActive: u.isActive };
            })
        );
        setCart((cartPrev) =>
          cartPrev
            .filter((i) => byId.has(i.id))
            .map((i) => {
              const u = byId.get(i.id);
              return { ...i, stock: u.stock, sellingPrice: u.sellingPrice, quantity: Math.min(i.quantity, u.stock) };
            })
            .filter(sellable)
        );
        setLastSync(new Date());
      }
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    setLastSync(new Date());
    
    // Restore the saved cart against current prices and stock.
    try {
      const saved = JSON.parse(localStorage.getItem("pos_cart") || "[]");
      const byId = new Map(initialProducts.map((p) => [p.id, p]));
      setCart(
        (Array.isArray(saved) ? saved : [])
          .filter((i) => byId.has(i?.id))
          .map((i) => {
            const p = byId.get(i.id);
            return { ...p, quantity: Math.min(Number(i.quantity) || 1, p.stock) };
          })
          .filter(sellable)
      );
    } catch (err) {
      console.error("Failed to load cart:", err);
    }

    const interval = setInterval(syncStock, 60000); // Auto-sync every minute
    return () => clearInterval(interval);
  }, [syncStock, initialProducts]);

  // Save cart to localStorage
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem("pos_cart", JSON.stringify(cart.map(({ id, quantity }) => ({ id, quantity }))));
      } catch {}
    }
  }, [cart, mounted]);

  useEffect(() => {
    setPrinterSettings(mergePrinter(initialPrinterSettings));
  }, [initialPrinterSettings]);

  // State Mutators
  const addToCart = useCallback((product) => {
    if (!sellable(product)) return;
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1, price: product.sellingPrice }];
    });
    setSearchTerm("");
  }, []);

  // Keyboard Shortcuts & Barcode Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Barcode detection (simple heuristic: rapid keystrokes ending with Enter)
      if (document.activeElement?.tagName !== "INPUT") {
        if (/^[a-zA-Z0-9]$/.test(e.key)) {
          barcodeBuffer.current += e.key;
          if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
          barcodeTimeout.current = setTimeout(() => { barcodeBuffer.current = ""; }, 100);
        } else if (e.key === "Enter" && barcodeBuffer.current.length > 3) {
          const sku = barcodeBuffer.current;
          const code = sku.toLowerCase();
          const found = products.find(
            (p) => (p.sku || "").toLowerCase() === code || (p.barcode || "").toLowerCase() === code
          );
          if (found && sellable(found)) {
            addToCart(found);
            barcodeBuffer.current = "";
          }
        }
      }

      // Hotkeys
      if (e.key === "F2") { e.preventDefault(); searchInputRef.current?.focus(); }
      if (e.key === "F10") { e.preventDefault(); if (cart.length > 0) setIsCheckoutOpen(true); }
      if (e.key === "Escape") {
        e.preventDefault();
        if (checkoutSuccessOpen) setCheckoutSuccessOpen(false);
        else if (isCheckoutOpen) setIsCheckoutOpen(false);
        else if (cartOpen) setCartOpen(false);
        else setSearchTerm("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [products, cart.length, isCheckoutOpen, checkoutSuccessOpen, cartOpen, addToCart]);

  const updateQuantity = useCallback((productId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.id !== productId) return i;
      const newQ = i.quantity + delta;
      return newQ > 0 && newQ <= i.stock ? { ...i, quantity: newQ } : i;
    }));
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart(prev => prev.filter(i => i.id !== productId));
  }, []);

  // Filter Logic
  const categories = useMemo(() => {
    const cats = { "ALL": t.all };
    products.forEach(p => {
      if (p.category) cats[p.category.id] = translateCategory(p.category.name, dict, p.category.nameAr);
    });
    return cats;
  }, [products, t.all, dict]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.isActive === false) return false;
      const matchesCat = activeCategory === "ALL" || p.categoryId === activeCategory;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        [p.name, p.nameAr, p.nameEn, p.sku, p.barcode].some((v) => (v || "").toLowerCase().includes(term));
      return matchesCat && matchesSearch;
    });
  }, [products, searchTerm, activeCategory]);

  const handlePrintLastReceipt = useCallback(async () => {
    if (!lastReceipt) return;
    setPrintLoading(true);
    try {
      const { printReceipt } = await import("@/lib/print-service");
      await printReceipt(lastReceipt, mergePrinter(printerSettings), printMessages, {});
    } catch (err) {
      console.error("POS print:", err);
    } finally {
      setPrintLoading(false);
    }
  }, [lastReceipt, printerSettings, printMessages]);

  const handleDownloadReceiptPdf = useCallback(async () => {
    if (!lastReceipt) return;
    try {
      const { downloadReceiptPdf } = await import("@/lib/print-service");
      await downloadReceiptPdf(lastReceipt, printMessages, mergePrinter(printerSettings));
    } catch (err) {
      console.error("POS PDF:", err);
    }
  }, [lastReceipt, printMessages, printerSettings]);

  const handleCheckout = async () => {
    setLoading(true);
    setCheckoutError("");
    const subAtCheckout = subtotal;
    const tenderedNum = paymentMethod === "CASH" ? parseFloat(amountTendered) || 0 : null;
    const changeAtCheckout = paymentMethod === "CASH" ? changeAmount : null;
    try {
      const payloadItems = cart.map(i => ({ id: i.id, quantity: i.quantity }));
      const payloadDetails = {
        paymentMethod,
        customerName,
        customerPhone,
        discountType,
        discountValue,
      };

      const res = await createPOSOrder(payloadItems, payloadDetails);
      if (res.success && !res.receipt) {
        setCart([]);
        localStorage.removeItem("pos_cart");
        setIsCheckoutOpen(false);
        setAmountTendered("");
        setDiscountValue(0);
        if (res.orderId) router.push(`/orders/${res.orderId}/invoice`);
        return;
      }
      if (res.success && res.receipt) {
        const store = mergePrinter(printerSettings);
        const receiptData = buildReceiptData({
          receiptFromServer: res.receipt,
          store,
          cashier: { name: session?.user?.name, email: session?.user?.email },
          lang: isArabic ? "ar" : "en",
          subtotalBeforeDiscount: subAtCheckout,
          discountType,
          amountTendered: paymentMethod === "CASH" ? tenderedNum : null,
          change: paymentMethod === "CASH" ? changeAtCheckout : null,
        });
        setLastReceipt(receiptData);
        setLastOrderId(res.orderId);
        setCart([]);
        localStorage.removeItem("pos_cart");
        setIsCheckoutOpen(false);
        setAmountTendered("");
        setDiscountValue(0);
        setCartOpen(false);
        setCheckoutSuccessOpen(true);

        if (store.autoPrint) {
          queueMicrotask(async () => {
            try {
              const { printReceipt } = await import("@/lib/print-service");
              await printReceipt(receiptData, store, printMessages, { quietToast: true });
            } catch (err) {
              console.error("POS auto-print:", err);
            }
          });
        }
      } else {
        const msg = res.code && t[`err_${res.code}`];
        setCheckoutError(msg ? msg.replace("{name}", res.detail || "") : res.error || t.error);
      }
    } catch (err) {
      setCheckoutError(err.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col h-screen bg-background text-foreground overflow-hidden", isRTL ? "rtl" : "ltr")}>
      {/* ── Header ── */}
      <header className="h-16 shrink-0 flex items-center justify-between gap-2 px-3 sm:px-6 bg-card/70 backdrop-blur-xl border-b border-border z-30">
        <div className="flex items-center gap-2 sm:gap-6 min-w-0">
          <Link href="/admin" className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border group-hover:bg-amber-500 group-hover:text-black transition-all">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest hidden sm:block">{t.back}</span>
          </Link>
          <div className="w-px h-6 bg-border shrink-0 hidden sm:block" />
          <div className="flex items-center gap-2 min-w-0">
            <BrandLockup variant="mark" size={32} className="sm:hidden" />
            <BrandLockup className="hidden sm:inline-flex" />
            <span className="hidden md:inline rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
              {t.posTerminal}
            </span>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div
            className="flex items-center gap-0.5 rounded-xl border border-border bg-muted/50 p-0.5"
            role="group"
            aria-label={isArabic ? "اللغة" : "Language"}
          >
            <Languages className="hidden sm:block h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-70" aria-hidden />
            <button
              type="button"
              onClick={() => setLang("ar")}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase transition-colors",
                lang === "ar" ? "bg-amber-500 text-black shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              عربي
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase transition-colors",
                lang === "en" ? "bg-amber-500 text-black shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              EN
            </button>
          </div>
          <ThemeToggle />
          <PrinterStatus
            printerSettings={mergePrinter(printerSettings)}
            lang={lang}
            cashierName={session?.user?.name || session?.user?.email || ""}
            messages={printMessages}
          />
          {lastReceipt && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={printLoading}
              onClick={handlePrintLastReceipt}
              className="rounded-xl border border-border hover:bg-muted text-muted-foreground"
              title={t.reprintLast}
            >
              {printLoading ? (
                <RotateCcw className="w-4 h-4 animate-spin text-accent-text" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
            </Button>
          )}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/80 border border-border text-[10px] font-black uppercase text-muted-foreground">
             <div className={cn("w-1.5 h-1.5 rounded-full", refreshing ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
             {t.lastSync}: <span dir="ltr" className="tabular-nums">{mounted && lastSync ? lastSync.toLocaleTimeString("en-GB") : "--:--:--"}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={syncStock} disabled={refreshing} aria-label={t.refresh} title={t.refresh} className="rounded-xl border border-border hover:bg-muted text-muted-foreground">
             <RotateCcw className={cn("w-4 h-4", refreshing && "animate-spin text-accent-text")} />
          </Button>
        </div>
      </header>

      {/* ── POS Layout ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LHS: Product Engine */}
        <main className="flex-1 min-h-0 flex flex-col min-w-0 bg-muted/30">
          
          {/* Search & Tabs */}
          <div className="p-3 sm:p-6 pb-0 space-y-3 sm:space-y-5">
            <div className="relative group max-w-2xl">
              <div className="absolute inset-y-0 start-4 flex items-center pointer-events-none">
                <Search className={cn("w-5 h-5 transition-colors", searchTerm ? "text-accent-text" : "text-muted-foreground")} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                autoFocus
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  // Scanners type into the focused search box and end with Enter.
                  if (e.key !== "Enter" || !searchTerm.trim()) return;
                  const code = searchTerm.trim().toLowerCase();
                  const exact = products.find(
                    (p) => (p.sku || "").toLowerCase() === code || (p.barcode || "").toLowerCase() === code
                  );
                  const hit = exact || (filteredProducts.length === 1 ? filteredProducts[0] : null);
                  if (hit && sellable(hit)) {
                    e.preventDefault();
                    addToCart(hit);
                  }
                }}
                className="w-full bg-card border border-border focus:border-amber-500/50 rounded-2xl py-3 sm:py-4 ps-12 pe-4 text-sm text-foreground placeholder:text-muted-foreground outline-none shadow-sm transition-all font-medium"
              />
              <div className="absolute end-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="hidden md:flex text-[10px] font-black text-muted-foreground border border-border rounded px-1.5 py-0.5 uppercase">F2</span>
                {searchTerm && (
                  <button type="button" onClick={() => {setSearchTerm(""); searchInputRef.current?.focus();}} className="text-muted-foreground hover:text-foreground p-1">
                    <XCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <Tabs defaultValue="ALL" className="w-full" onValueChange={setActiveCategory}>
              <TabsList className="bg-transparent h-auto p-0 w-full flex-nowrap lg:flex-wrap gap-2 justify-start overflow-x-auto lg:overflow-visible pb-1 no-scrollbar">
                {Object.entries(categories).map(([id, name]) => (
                  <TabsTrigger 
                    key={id} 
                    value={id} 
                    className="h-9 sm:h-10 px-4 sm:px-5 shrink-0 flex-none rounded-xl border border-border data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold text-xs transition-all data-[state=inactive]:hover:bg-muted data-[state=inactive]:text-muted-foreground"
                  >
                    {name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Grid Area */}
          <div className="flex-1 overflow-y-auto p-3 pb-24 sm:p-6 lg:pb-6 mt-1 relative">
            <AnimatePresence mode="popLayout">
              {filteredProducts.length > 0 ? (
                <motion.div 
                  layout
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6 gap-3 sm:gap-4"
                >
                  {filteredProducts.map(p => (
                    <ProductCard key={p.id} product={p} onAdd={addToCart} t={t} isArabic={isArabic} />
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="h-full flex flex-col items-center justify-center text-center text-muted-foreground opacity-40 select-none"
                >
                  <Search className="w-16 h-16 mb-4" />
                  <p className="text-xl font-bold">{t.noProducts}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Shortcuts Bar (Desktop only) */}
          <footer className="hidden lg:flex h-10 shrink-0 bg-card/80 border-t border-border items-center px-6 gap-6 overflow-hidden">
             <div className="flex items-center gap-4 text-[11px] font-bold text-muted-foreground">
                <div className="flex items-center gap-1.5"><kbd className="bg-muted text-muted-foreground px-1 py-0.5 rounded border border-border">F2</kbd> {t.kbSearch}</div>
                <div className="flex items-center gap-1.5"><kbd className="bg-muted text-muted-foreground px-1 py-0.5 rounded border border-border">F10</kbd> {t.pay}</div>
                <div className="flex items-center gap-1.5"><kbd className="bg-muted text-muted-foreground px-1 py-0.5 rounded border border-border">ESC</kbd> {t.kbClose}</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 border-2 border-dashed border-border rounded-sm" /> {t.scanBarcode}</div>
             </div>
          </footer>
        </main>

        {/* RHS: Transaction Desk */}
        {/* Phone: cart bar; the cart opens as a sheet */}
        {cart.length > 0 && !cartOpen && (
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="lg:hidden fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-3 rounded-2xl bg-amber-500 px-4 py-3 text-black shadow-2xl"
          >
            <span className="flex items-center gap-2 font-bold">
              <ShoppingCart className="w-5 h-5" />
              {t.viewCart} · <span className="tabular-nums">{fmt(itemCount)}</span>
            </span>
            <span className="flex items-center gap-1 font-black tabular-nums">
              {fmt(total)} {t.currency}
              <ChevronUp className="w-4 h-4" />
            </span>
          </button>
        )}

        <aside className={cn(
          "w-full flex-col bg-card lg:bg-card/80 lg:backdrop-blur-3xl lg:flex lg:static lg:h-auto lg:w-[400px] xl:w-[440px] lg:border-s border-border shrink-0 shadow-none lg:shadow-xl dark:lg:shadow-[-40px_0_60px_-15px_rgba(0,0,0,0.45)]",
          cartOpen ? "flex fixed inset-x-0 bottom-0 top-16 z-50 border-t" : "hidden"
        )}>
          
          <div className="h-14 shrink-0 px-6 flex items-center justify-between border-b border-border bg-muted/50">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-accent-text" />
                {cart.length > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    className="absolute -top-2 -end-2 bg-foreground text-background text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </div>
              <span className="text-sm font-black text-foreground">{t.cartTitle}</span>
            </div>
            <div className="flex items-center gap-1">
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => { setCart([]); setCartOpen(false); }} className="h-8 text-xs font-bold text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5 me-1" /> {t.clear}
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setCartOpen(false)} aria-label={t.close} className="lg:hidden h-8 w-8 rounded-lg">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 custom-scrollbar">
            <AnimatePresence>
              {cart.length > 0 ? (
                cart.map(item => (
                  <CartItem 
                    key={item.id} 
                    item={item} 
                    onUpdateQty={updateQuantity} 
                    onRemove={removeFromCart} 
                    t={t} 
                    isArabic={isArabic} 
                  />
                ))
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center opacity-10 grayscale py-20 pointer-events-none">
                  <ShoppingCart className="w-20 h-20 mb-4" />
                  <p className="font-black text-sm">{t.cartEmpty}</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="shrink-0 p-4 sm:p-6 bg-muted/40 border-t border-border space-y-4 sm:space-y-5">
            <div className="space-y-2 text-[13px] font-medium text-muted-foreground">
              <div className="flex justify-between items-center">
                <span>{t.subtotal}</span>
                <span className="text-foreground font-bold tabular-nums">{fmt(subtotal)} {t.currency}</span>
              </div>
              
              {/* Quick Discount in Cart */}
              <div className="flex items-center gap-3 pt-1">
                 <div className="relative flex-1">
                   <div className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {discountType === 'percent' ? <Percent className="w-3 h-3" /> : <Tag className="w-3 h-3" />}
                   </div>
                   <input 
                     type="number"
                     min="0"
                     inputMode="decimal"
                     aria-label={t.discount}
                     aria-invalid={!!discountError}
                     placeholder={t.discount}
                     className="w-full bg-card border border-border rounded-lg py-2 ps-9 pe-3 text-xs text-foreground focus:border-amber-500/30 outline-none font-bold"
                     value={discountValue || ""}
                     onChange={(e) => setDiscountValue(e.target.value)}
                   />
                 </div>
                 <div className="flex bg-muted/80 rounded-lg p-0.5 border border-border">
                    <button 
                      type="button"
                      onClick={() => setDiscountType('percent')} 
                      className={cn("px-3 py-1.5 rounded-md text-[10px] font-black transition-all", discountType === 'percent' ? "bg-amber-500 text-black shadow-lg" : "text-muted-foreground hover:text-foreground")}
                    >%</button>
                    <button 
                      type="button"
                      onClick={() => setDiscountType('fixed')} 
                      className={cn("px-3 py-1.5 rounded-md text-[10px] font-black transition-all", discountType === 'fixed' ? "bg-amber-500 text-black shadow-lg" : "text-muted-foreground hover:text-foreground")}
                    >{t.discountFixed}</button>
                 </div>
              </div>
              {discountError && (
                <p role="alert" className="text-xs font-bold text-red-700 dark:text-red-400">
                  {discountError === "DISCOUNT_LIMIT" ? t.discountLimit : t.discountBad}
                </p>
              )}

              <div className="flex justify-between font-black text-2xl pt-4 border-t border-border text-foreground tracking-tighter">
                <span className="text-lg pt-1">{t.total}</span>
                <span className="text-accent-text tabular-nums">{fmt(total)} {t.currency}</span>
              </div>
            </div>

            <Button
              size="lg"
              disabled={cart.length === 0 || !!discountError}
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full h-14 sm:h-16 bg-amber-500 hover:bg-amber-600 text-black font-black text-base rounded-2xl shadow-2xl active:scale-[0.98] transition-all gap-3 flex items-center justify-center"
            >
              <Wallet className="w-6 h-6" />
              {t.pay}
              <kbd className="hidden lg:inline rounded border border-black/20 px-1.5 text-[10px] font-bold">F10</kbd>
            </Button>
          </div>
        </aside>
      </div>

      {/* ── Checkout Dialog ── */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-md bg-card border-border text-card-foreground p-0 flex flex-col h-auto !gap-0">
          <DialogHeader className="p-4 bg-muted/50 border-b border-border shrink-0">
            <DialogTitle className="text-xl font-black text-accent-text flex items-center gap-3">
              <Wallet className="w-6 h-6" />
              {t.checkoutTitle}
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-4 space-y-4 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            {checkoutError && (
              <div role="alert" className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400 text-sm font-bold animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                {checkoutError}
              </div>
            )}

            {/* Customer Details */}
            <div className="space-y-3 bg-muted/40 p-3 rounded-xl border border-border">
              <div className="flex items-center gap-3 mb-2">
                 <User className="w-4 h-4 text-accent-text" />
                 <h4 className="text-xs font-black uppercase text-muted-foreground">{t.customer}</h4>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Input 
                  placeholder={t.walkIn} 
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="bg-background border-border focus-visible:ring-amber-500/30 font-bold"
                />
                <Input 
                  placeholder={isArabic ? "رقم الهاتف" : "Phone number"} 
                  value={customerPhone} 
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="bg-background border-border focus-visible:ring-amber-500/30 font-mono"
                />
              </div>
            </div>

            {/* Payment Panel */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 mb-2">
                 <DollarSign className="w-4 h-4 text-accent-text" />
                 <h4 className="text-xs font-black uppercase text-muted-foreground">{t.paymentMethod}</h4>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'CASH', label: t.cash, icon: Banknote },
                  { id: 'CARD', label: t.card, icon: CreditCard },
                  { id: 'BANK_TRANSFER', label: t.bank, icon: Landmark },
                ].map(method => (
                  <button
                    type="button"
                    key={method.id}
                    aria-pressed={paymentMethod === method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all font-bold text-xs",
                      paymentMethod === method.id
                        ? "bg-amber-500/10 border-amber-500 text-foreground"
                        : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <method.icon className="w-5 h-5 mb-1" />
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Calculator */}
            {paymentMethod === 'CASH' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-4 border-t border-border"
              >
                <div className="space-y-2">
                  <label htmlFor="pos-tendered" className="text-xs font-black text-muted-foreground">{t.amountTendered}</label>
                  <div className="relative">
                    <DollarSign className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-text" />
                    <Input 
                      id="pos-tendered"
                      type="number" 
                      min="0"
                      inputMode="decimal"
                      autoFocus
                      className="bg-background border-border h-12 ps-12 text-xl font-black tabular-nums focus-visible:ring-amber-500/30"
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">{t.change}</span>
                    <span className="text-2xl font-black text-foreground tabular-nums">{fmt(changeAmount)} <span className="text-sm">{t.currency}</span></span>
                  </div>
                  <XCircle 
                    className={cn("w-10 h-10 transition-opacity", parseFloat(amountTendered) < total ? "text-red-500 opacity-100" : "opacity-0")} 
                  />
                </div>
              </motion.div>
            )}
          </div>

          <div className="p-4 bg-muted/50 border-t border-border space-y-3 shrink-0">
               <div className="flex justify-between items-baseline p-4 rounded-xl bg-muted/40 border border-border">
                  <span className="text-sm font-bold text-muted-foreground">{t.total}</span>
                  <span className="text-2xl font-black text-accent-text tabular-nums tracking-tighter">{fmt(total)} <span className="text-sm font-bold">{t.currency}</span></span>
               </div>
               
               <Button 
                 onClick={handleCheckout} 
                 disabled={loading || !!discountError || (paymentMethod === 'CASH' && (parseFloat(amountTendered) || 0) < total)}
                 className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-xl shadow-xl shadow-emerald-500/20 gap-3"
               >
                 {loading ? <RotateCcw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                 {loading ? t.processing : t.completeCheckout}
               </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={checkoutSuccessOpen} onOpenChange={setCheckoutSuccessOpen}>
        <DialogContent className="max-w-md bg-card border-border text-card-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="w-6 h-6" />
              {t.checkoutDoneTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              {isArabic ? "رقم الفاتورة:" : "Invoice:"}{" "}
              <span className="font-mono font-bold text-foreground">{lastReceipt?.invoiceNumber}</span>
            </p>
            <p className="text-xs text-muted-foreground/80">{t.success}</p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              className="w-full bg-amber-500 font-black text-black hover:bg-amber-400"
              disabled={printLoading || !lastReceipt}
              onClick={handlePrintLastReceipt}
            >
              {printLoading ? (
                <RotateCcw className="w-4 h-4 animate-spin me-2" />
              ) : (
                <Printer className="w-4 h-4 me-2" />
              )}
              {t.printReceipt}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full font-bold"
              disabled={!lastReceipt}
              onClick={handleDownloadReceiptPdf}
            >
              <Download className="w-4 h-4 me-2" />
              {t.downloadPdf}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-border font-bold"
              disabled={!lastOrderId}
              onClick={() => {
                setCheckoutSuccessOpen(false);
                router.push(`/orders/${lastOrderId}/invoice`);
              }}
            >
              <FileText className="w-4 h-4 me-2" />
              {t.openInvoice}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setCheckoutSuccessOpen(false)}
            >
              {t.doneSuccess}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* ── Custom Scrollbar Styles ── */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .no-scrollbar { scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: color-mix(in oklch, var(--primary) 35%, var(--border));
        }
      `}</style>
    </div>
  );
}
