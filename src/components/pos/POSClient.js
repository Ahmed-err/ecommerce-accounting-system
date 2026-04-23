"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Search, ShoppingCart, Trash2, Plus, Minus,
  CreditCard, Banknote, Printer, ArrowLeft,
  Package, X, CheckCircle, AlertTriangle,
  Zap, Tag, RotateCcw,
  User, Percent, Wallet, DollarSign,
  XCircle, LayoutGrid, Download, FileText, Languages,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/context/LanguageContext";
import { ThemeToggle } from "@/components/ThemeToggle";

import { createPOSOrder, getProductStock } from "@/app/actions/pos";
import { buildReceiptData } from "@/lib/receipt";
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

// ─── ProductCard ──────────────────────────────────────────────────────────────
function ProductCard({ product, onAdd, t }) {
  const outOfStock = product.stock === 0;
  const isLowStock = !outOfStock && product.stock <= product.minStock;
  
  return (
    <motion.button
      whileHover={!outOfStock ? { scale: 1.02, y: -2 } : {}}
      whileActive={!outOfStock ? { scale: 0.98 } : {}}
      onClick={() => !outOfStock && onAdd(product)}
      disabled={outOfStock}
      className={cn(
        "group relative flex flex-col bg-card/80 backdrop-blur-sm border border-border rounded-2xl overflow-hidden text-left transition-all duration-200 h-full",
        outOfStock
          ? "border-red-900/20 opacity-60 grayscale cursor-not-allowed"
          : "hover:border-amber-500/40 hover:shadow-2xl hover:shadow-amber-500/10 cursor-pointer"
      )}
    >
      <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden shrink-0">
        {product.images?.[0] ? (
          <Image 
            src={product.images[0]} 
            alt={product.name} 
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
            <Badge variant="destructive" className="bg-red-600/90 text-white border-0 font-black tracking-tighter text-[9px] uppercase backdrop-blur-sm">
              {t.outOfStock}
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
        <div className="flex justify-between items-start gap-1">
          <h3 className="text-[13px] font-bold text-foreground leading-tight line-clamp-2 flex-1">{product.name}</h3>
          <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded leading-none">
            {product.sku || (t.noSku)}
          </span>
        </div>
        
        <div className="mt-auto flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider mb-0.5">{t.price}</span>
            <span className="text-sm font-black text-amber-500 flex items-baseline gap-0.5">
              {product.sellingPrice.toLocaleString()} <span className="text-[10px] font-bold text-amber-500/60 uppercase">{t.currency}</span>
            </span>
          </div>
          <div className="text-right">
            <span className={cn(
              "text-[10px] font-black tracking-tight",
              isLowStock ? "text-amber-500" : "text-muted-foreground"
            )}>
              {product.stock} {t.left}
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
          ? <Image src={item.images[0]} alt={item.name} fill unoptimized className="object-contain p-1" />
          : <Package className="w-6 h-6 text-muted-foreground/40 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-[13px] font-bold text-foreground truncate group-hover:text-amber-500 transition-colors uppercase tracking-tight">{item.name}</h4>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-bold text-muted-foreground tabular-nums">{item.sellingPrice.toLocaleString()} {t.currency} × {item.quantity}</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <span className="font-black text-amber-500 tabular-nums">{(item.sellingPrice * item.quantity).toLocaleString()} {t.currency}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1 items-end shrink-0 ml-auto">
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
        onClick={() => onRemove(item.id)}
        className="absolute -top-1.5 -end-1.5 w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-xl"
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
      outOfStock: "نفذ",
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
      vat: "الضريبة (15%)",
      discount: "خصم",
      total: "الإجمالي النهائي",
      payAndPrint: "دفع وطباعة (F10)",
      currency: "ج.س",
      price: "السعر",
      checkoutTitle: "إتمام عملية الدفع",
      amountTendered: "المبلغ المقبوض",
      change: "المبلغ المتبقي",
      paymentMethod: "طريقة الدفع",
      cash: "نقداً",
      card: "بطاقة بنكية",
      credit: "آجل",
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
      low: "LOW",
      outOfStock: "OUT",
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
      cartTitle: "Current Transaction",
      clear: "Clear",
      cartEmpty: "Cart Empty",
      subtotal: "Subtotal",
      vat: "VAT (15%)",
      discount: "Discount",
      total: "Grand Total",
      payAndPrint: "PAY & PRINT (F10)",
      currency: "SDG",
      price: "Price",
      checkoutTitle: "Complete Transaction",
      amountTendered: "Amount Tendered",
      change: "Change",
      paymentMethod: "Payment Method",
      cash: "Cash",
      card: "Card",
      credit: "Credit",
      customer: "Customer",
      completeCheckout: "Confirm Checkout",
      processing: "Processing...",
      error: "Error",
      success: "Success",
      sync: "Syncing",
      refresh: "Refresh",
      lastSync: "Last Sync",
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
  const [printerSettings, setPrinterSettings] = useState(() => mergePrinter(initialPrinterSettings));
  const [checkoutSuccessOpen, setCheckoutSuccessOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [lastOrderId, setLastOrderId] = useState(null);
  const [printLoading, setPrintLoading] = useState(false);

  const barcodeBuffer = useRef("");
  const barcodeTimeout = useRef(null);

  // Totals
  const subtotal = useMemo(() => cart.reduce((acc, i) => acc + i.sellingPrice * i.quantity, 0), [cart]);
  const vat = subtotal * 0.15;
  const calculatedDiscount = useMemo(() => {
    if (discountType === "percent") return subtotal * (discountValue / 100);
    return parseFloat(discountValue) || 0;
  }, [subtotal, discountValue, discountType]);
  const total = Math.max(0, subtotal + vat - calculatedDiscount);
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
        setCart((cartPrev) => cartPrev.filter((i) => byId.has(i.id)));
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
    
    // Load cart from localStorage
    const savedCart = localStorage.getItem("pos_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (err) {
        console.error("Failed to load cart:", err);
      }
    }

    const interval = setInterval(syncStock, 60000); // Auto-sync every minute
    return () => clearInterval(interval);
  }, [syncStock]);

  // Save cart to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("pos_cart", JSON.stringify(cart));
    }
  }, [cart, mounted]);

  useEffect(() => {
    setPrinterSettings(mergePrinter(initialPrinterSettings));
  }, [initialPrinterSettings]);

  // State Mutators
  const addToCart = useCallback((product) => {
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
          const found = products.find((p) => (p.sku || "").toLowerCase() === sku.toLowerCase());
          if (found && found.isActive !== false && found.stock > 0) {
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
        else setSearchTerm("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [products, cart.length, isCheckoutOpen, checkoutSuccessOpen, addToCart]);

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
    products.forEach(p => { if (p.category) cats[p.category.id] = p.category.name; });
    return cats;
  }, [products, t.all]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.isActive === false) return false;
      const matchesCat = activeCategory === "ALL" || p.categoryId === activeCategory;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(term) ||
        (p.sku || "").toLowerCase().includes(term);
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
      const payloadItems = cart.map(i => ({ id: i.id, quantity: i.quantity, price: i.price }));
      const payloadDetails = {
        paymentMethod: paymentMethod === 'CASH' ? 'CASH' : (paymentMethod === 'CARD' ? 'CARD' : 'CREDIT'),
        customerName,
        customerPhone,
        discountAmount: calculatedDiscount,
        taxAmount: vat,
      };

      const res = await createPOSOrder(payloadItems, payloadDetails);
      if (res.success && !res.receipt) {
        setCart([]);
        localStorage.removeItem("pos_cart");
        setIsCheckoutOpen(false);
        setAmountTendered("");
        setDiscountValue(0);
        if (res.orderId) router.push(`/admin/orders/${res.orderId}/invoice`);
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
        setCheckoutError(res.error || t.error);
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
      <header className="h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 bg-card/70 backdrop-blur-xl border-b border-border z-30">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <Link href="/admin" className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border group-hover:bg-amber-500 group-hover:text-black transition-all">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest hidden sm:block">{t.back}</span>
          </Link>
          <div className="w-px h-6 bg-border shrink-0" />
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Zap className="w-5 h-5 text-black" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-black text-lg tracking-tighter">
                {isArabic ? (
                  <>
                    عصام الدين <span className="text-amber-500">نصر</span>
                  </>
                ) : (
                  <>
                    ESSAM EL-DIN <span className="text-amber-500">NASR</span>
                  </>
                )}
              </span>
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">{t.posTerminal}</span>
            </div>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            className="flex items-center gap-0.5 rounded-xl border border-border bg-muted/50 p-0.5"
            role="group"
            aria-label={isArabic ? "اللغة" : "Language"}
          >
            <Languages className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-70" aria-hidden />
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
                <RotateCcw className="w-4 h-4 animate-spin text-amber-500" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
            </Button>
          )}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/80 border border-border text-[10px] font-black uppercase text-muted-foreground">
             <div className={cn("w-1.5 h-1.5 rounded-full", refreshing ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
             {t.lastSync}: {mounted && lastSync ? lastSync.toLocaleTimeString([]) : "--:--:--"}
          </div>
          <Button variant="ghost" size="icon" onClick={syncStock} disabled={refreshing} className="rounded-xl border border-border hover:bg-muted text-muted-foreground">
             <RotateCcw className={cn("w-4 h-4", refreshing && "animate-spin text-amber-500")} />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-xl border border-border hover:bg-muted text-muted-foreground lg:hidden">
             <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* ── POS Layout ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LHS: Product Engine */}
        <main className="flex-1 min-h-0 flex flex-col min-w-0 bg-muted/30">
          
          {/* Search & Tabs */}
          <div className="p-4 sm:p-6 pb-0 space-y-6">
            <div className="relative group max-w-2xl">
              <div className="absolute inset-y-0 start-4 flex items-center pointer-events-none">
                <Search className={cn("w-5 h-5 transition-colors", searchTerm ? "text-amber-500" : "text-muted-foreground")} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                autoFocus
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-card border border-border focus:border-amber-500/50 rounded-2xl py-4 ps-12 pe-4 text-sm text-foreground placeholder:text-muted-foreground outline-none shadow-sm transition-all font-medium"
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
              <TabsList className="bg-transparent h-auto p-0 flex-wrap gap-2 justify-start overflow-visible">
                {Object.entries(categories).map(([id, name]) => (
                  <TabsTrigger 
                    key={id} 
                    value={id} 
                    className="h-10 px-5 rounded-xl border border-border data-[state=active]:bg-amber-500 data-[state=active]:text-black font-black text-xs uppercase tracking-tight transition-all data-[state=inactive]:hover:bg-muted data-[state=inactive]:text-muted-foreground"
                  >
                    {name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Grid Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 mt-2 relative">
            <AnimatePresence mode="popLayout">
              {filteredProducts.length > 0 ? (
                <motion.div 
                  layout
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6 gap-3 sm:gap-4"
                >
                  {filteredProducts.map(p => (
                    <ProductCard key={p.id} product={p} onAdd={addToCart} t={t} />
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="h-full flex flex-col items-center justify-center text-center text-muted-foreground opacity-40 select-none"
                >
                  <Search className="w-16 h-16 mb-4" />
                  <p className="text-xl font-bold uppercase tracking-widest">{t.noProducts}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Shortcuts Bar (Desktop only) */}
          <footer className="hidden lg:flex h-10 shrink-0 bg-card/80 border-t border-border items-center px-6 gap-6 overflow-hidden">
             <div className="flex items-center gap-4 text-[9px] font-black text-muted-foreground/70 uppercase tracking-[0.15em]">
                <div className="flex items-center gap-1.5"><kbd className="bg-muted text-muted-foreground px-1 py-0.5 rounded border border-border">F2</kbd> {t.searchPlaceholder.split(' ')[2]}</div>
                <div className="flex items-center gap-1.5"><kbd className="bg-muted text-muted-foreground px-1 py-0.5 rounded border border-border">F10</kbd> {t.payAndPrint.split(' ')[0]}</div>
                <div className="flex items-center gap-1.5"><kbd className="bg-muted text-muted-foreground px-1 py-0.5 rounded border border-border">ESC</kbd> {t.clear}</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 border-2 border-dashed border-border rounded-sm" /> {t.scanBarcode}</div>
             </div>
          </footer>
        </main>

        {/* RHS: Transaction Desk */}
        <aside className="h-[46vh] w-full border-t border-border lg:h-auto lg:w-[400px] xl:w-[440px] lg:border-t-0 lg:border-s flex flex-col shrink-0 bg-card/80 backdrop-blur-3xl shadow-none lg:shadow-xl dark:lg:shadow-[-40px_0_60px_-15px_rgba(0,0,0,0.45)] z-40">
          
          <div className="h-14 shrink-0 px-6 flex items-center justify-between border-b border-border bg-muted/50">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-amber-500" />
                {cart.length > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    className="absolute -top-2 -end-2 bg-foreground text-background text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg"
                  >
                    {cart.reduce((a,b) => a + b.quantity, 0)}
                  </motion.span>
                )}
              </div>
              <span className="text-[13px] font-black uppercase tracking-widest text-foreground">{t.cartTitle}</span>
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCart([])} className="h-8 text-[10px] font-black uppercase text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg">
                <Trash2 className="w-3.5 h-3.5 me-1" /> {t.clear}
              </Button>
            )}
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
                  <p className="font-black text-sm uppercase tracking-widest">{t.cartEmpty}</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="shrink-0 p-6 bg-muted/40 border-t border-border space-y-5">
            <div className="space-y-2 text-[13px] font-medium text-muted-foreground">
              <div className="flex justify-between items-center">
                <span>{t.subtotal}</span>
                <span className="text-foreground font-bold tabular-nums">{subtotal.toLocaleString()} {t.currency}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>{t.vat}</span>
                <span className="text-foreground font-bold tabular-nums">{vat.toLocaleString()} {t.currency}</span>
              </div>
              
              {/* Quick Discount in Cart */}
              <div className="flex items-center gap-3 pt-1">
                 <div className="relative flex-1">
                   <div className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {discountType === 'percent' ? <Percent className="w-3 h-3" /> : <Tag className="w-3 h-3" />}
                   </div>
                   <input 
                     type="number"
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

              <div className="flex justify-between font-black text-2xl pt-4 border-t border-border text-foreground tracking-tighter">
                <span className="uppercase text-lg pt-1">{t.total}</span>
                <span className="text-amber-500 tabular-nums">{total.toLocaleString()} {t.currency}</span>
              </div>
            </div>

            <Button
              size="lg"
              disabled={cart.length === 0}
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full h-16 bg-amber-500 hover:bg-amber-600 text-black font-black text-base rounded-2xl shadow-2xl shadow-amber-500/20 active:scale-[0.98] transition-all gap-3 uppercase flex items-center justify-center"
            >
              <Printer className="w-6 h-6" />
              {t.payAndPrint.split(' ')[0]}
            </Button>
          </div>
        </aside>
      </div>

      {/* ── Checkout Dialog ── */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-md bg-card border-border text-card-foreground p-0 flex flex-col h-auto !gap-0">
          <DialogHeader className="p-4 bg-muted/50 border-b border-border shrink-0">
            <DialogTitle className="text-xl font-black uppercase tracking-widest text-amber-500 flex items-center gap-3">
              <Wallet className="w-6 h-6" />
              {t.checkoutTitle}
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-4 space-y-4 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            {checkoutError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-bold animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                {checkoutError}
              </div>
            )}

            {/* Customer Details */}
            <div className="space-y-3 bg-muted/40 p-3 rounded-xl border border-border">
              <div className="flex items-center gap-3 mb-2">
                 <User className="w-4 h-4 text-amber-500" />
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
                 <DollarSign className="w-4 h-4 text-amber-500" />
                 <h4 className="text-xs font-black uppercase text-muted-foreground">{t.paymentMethod}</h4>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'CASH', label: t.cash, icon: Banknote, active: "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-xl shadow-emerald-500/5" },
                  { id: 'CARD', label: t.card, icon: CreditCard, active: "bg-blue-500/10 border-blue-500 text-blue-400 shadow-xl shadow-blue-500/5" },
                  { id: 'CREDIT', label: t.credit, icon: RotateCcw, active: "bg-amber-500/10 border-amber-500 text-amber-400 shadow-xl shadow-amber-500/5" }
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-wider",
                      paymentMethod === method.id
                        ? method.active
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
                  <label className="text-xs font-black uppercase text-muted-foreground">{t.amountTendered}</label>
                  <div className="relative">
                    <DollarSign className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
                    <Input 
                      type="number" 
                      autoFocus
                      className="bg-background border-border h-12 ps-12 text-xl font-black tabular-nums focus-visible:ring-amber-500/30"
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{t.change}</span>
                    <span className="text-2xl font-black text-foreground tabular-nums">{changeAmount.toLocaleString()} <span className="text-sm">{t.currency}</span></span>
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
                  <span className="text-sm font-bold text-muted-foreground uppercase">{t.total}</span>
                  <span className="text-2xl font-black text-amber-500 tabular-nums tracking-tighter">{total.toLocaleString()} <span className="text-sm font-bold uppercase">{t.currency}</span></span>
               </div>
               
               <Button 
                 onClick={handleCheckout} 
                 disabled={loading || (paymentMethod === 'CASH' && (parseFloat(amountTendered) || 0) < total)}
                 className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-xl shadow-xl shadow-emerald-500/20 gap-3 uppercase"
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
            <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-emerald-400">
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
                <RotateCcw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Printer className="w-4 h-4 mr-2" />
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
              <Download className="w-4 h-4 mr-2" />
              {t.downloadPdf}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-border font-bold"
              disabled={!lastOrderId}
              onClick={() => {
                setCheckoutSuccessOpen(false);
                router.push(`/admin/orders/${lastOrderId}/invoice`);
              }}
            >
              <FileText className="w-4 h-4 mr-2" />
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
