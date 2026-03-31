"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Search, ShoppingCart, Trash2, Plus, Minus,
  CreditCard, Banknote, Printer, ArrowLeft,
  Package, X, CheckCircle, AlertTriangle,
  ChevronDown, Zap, Tag, RotateCcw,
  User, Percent, Wallet, DollarSign,
  Keyboard, ScanLine, XCircle, LayoutGrid
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";

import { createPOSOrder, getProductStock } from "@/app/actions/pos";
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
        "group relative flex flex-col bg-gray-900/50 backdrop-blur-sm border rounded-2xl overflow-hidden text-left transition-all duration-200 h-full",
        outOfStock
          ? "border-red-900/20 opacity-60 grayscale cursor-not-allowed"
          : "border-white/5 hover:border-amber-500/40 hover:shadow-2xl hover:shadow-amber-500/10 cursor-pointer"
      )}
    >
      <div className="relative w-full aspect-[4/3] bg-gray-950 overflow-hidden shrink-0">
        {product.images?.[0] ? (
          <Image 
            src={product.images[0]} 
            alt={product.name} 
            fill 
            unoptimized 
            className="object-cover transition-transform duration-500 group-hover:scale-110" 
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-950">
            <Package className="w-8 h-8 text-gray-800" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
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
          <h3 className="text-[13px] font-bold text-white leading-tight line-clamp-2 flex-1">{product.name}</h3>
          <span className="text-[10px] font-mono font-bold text-gray-500 bg-black/40 px-1.5 py-0.5 rounded leading-none">
            {product.sku || (t.noSku)}
          </span>
        </div>
        
        <div className="mt-auto flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-black text-gray-600 tracking-wider mb-0.5">{t.price}</span>
            <span className="text-sm font-black text-amber-500 flex items-baseline gap-0.5">
              {product.sellingPrice.toLocaleString()} <span className="text-[10px] font-bold text-amber-500/60 uppercase">{t.currency}</span>
            </span>
          </div>
          <div className="text-right">
            <span className={cn(
              "text-[10px] font-black tracking-tight",
              isLowStock ? "text-amber-500" : "text-gray-400"
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
      className="flex items-center gap-3 bg-gray-900 border border-white/5 rounded-2xl p-3 group hover:border-amber-500/20 transition-all relative"
    >
      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-950 shrink-0 border border-white/10 shadow-inner">
        {item.images?.[0]
          ? <Image src={item.images[0]} alt={item.name} fill unoptimized className="object-cover" />
          : <Package className="w-6 h-6 text-gray-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-[13px] font-bold text-white truncate group-hover:text-amber-500 transition-colors uppercase tracking-tight">{item.name}</h4>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-bold text-gray-500 tabular-nums">{item.sellingPrice.toLocaleString()} {t.currency} × {item.quantity}</span>
          <span className="w-1 h-1 rounded-full bg-gray-700" />
          <span className="font-black text-amber-500 tabular-nums">{(item.sellingPrice * item.quantity).toLocaleString()} {t.currency}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1 items-end shrink-0 ml-auto">
        <div className="flex items-center bg-gray-950/80 rounded-lg p-0.5 border border-white/5 shadow-lg">
          <button
            onClick={() => onUpdateQty(item.id, -1)}
            className="w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-md transition-colors text-white active:scale-90"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-9 text-center text-sm font-black text-white tabular-nums select-none">{item.quantity}</span>
          <button
            onClick={() => onUpdateQty(item.id, 1)}
            className="w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-md transition-colors text-white active:scale-90"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <button
        onClick={() => onRemove(item.id)}
        className="absolute -top-1.5 -right-1.5 w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-xl"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

// ─── Main POS Client ──────────────────────────────────────────────────────────
export default function POSClient({ initialProducts }) {
  const router = useRouter();
  const searchInputRef = useRef(null);
  const { lang, isRTL } = useLanguage();
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
    },
    en: {
      low: "LOW",
      outOfStock: "OUT",
      left: "left",
      noSku: "No SKU",
      maxReached: "Max stock reached",
      walkIn: "Walk-in Customer",
      posTerminal: "POS Terminal",
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
    }
  };

  const t = translations[lang] || translations.en;

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
        setProducts(prev => prev.map(p => {
          const updated = stockData.find(s => s.id === p.id);
          return updated ? { ...p, stock: updated.stock, sellingPrice: updated.sellingPrice, isActive: updated.isActive } : p;
        }));
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

  // Keyboard Shortcuts & Barcode Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Barcode detection (simple heuristic: rapid keystrokes ending with Enter)
      if (document.activeElement.tagName !== "INPUT") {
        if (/^[a-zA-Z0-9]$/.test(e.key)) {
          barcodeBuffer.current += e.key;
          if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
          barcodeTimeout.current = setTimeout(() => { barcodeBuffer.current = ""; }, 100);
        } else if (e.key === "Enter" && barcodeBuffer.current.length > 3) {
          const sku = barcodeBuffer.current;
          const found = products.find(p => (p.sku || "").toLowerCase() === sku.toLowerCase());
          if (found && found.stock > 0) {
            addToCart(found);
            barcodeBuffer.current = "";
          }
        }
      }

      // Hotkeys
      if (e.key === "F2") { e.preventDefault(); searchInputRef.current?.focus(); }
      if (e.key === "F10") { e.preventDefault(); if (cart.length > 0) setIsCheckoutOpen(true); }
      if (e.key === "Escape") { e.preventDefault(); if (isCheckoutOpen) setIsCheckoutOpen(false); else setSearchTerm(""); }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [products, cart.length, isCheckoutOpen]);

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
    return products.filter(p => {
      const matchesCat = activeCategory === "ALL" || p.categoryId === activeCategory;
      const term = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || p.name.toLowerCase().includes(term) || (p.sku || "").toLowerCase().includes(term);
      return matchesCat && matchesSearch;
    });
  }, [products, searchTerm, activeCategory]);

  const handleCheckout = async () => {
    setLoading(true);
    setCheckoutError("");
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
      if (res.success) {
        setCart([]);
        localStorage.removeItem("pos_cart");
        setIsCheckoutOpen(false);
        setAmountTendered("");
        setDiscountValue(0);
        router.push(`/admin/orders/${res.orderId}/invoice`);
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
    <div className={cn("flex flex-col h-screen bg-[#050505] text-white overflow-hidden", isRTL ? "rtl" : "ltr")}>
      {/* ── Header ── */}
      <header className="h-16 shrink-0 flex items-center justify-between px-6 bg-gray-900/50 backdrop-blur-xl border-b border-white/5 z-30">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center border border-white/5 group-hover:bg-amber-500 group-hover:text-black transition-all">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest hidden sm:block">Back</span>
          </Link>
          <div className="w-px h-6 bg-white/10" />
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
              <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">{t.posTerminal}</span>
            </div>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-white/5 text-[10px] font-black uppercase text-white/50">
             <div className={cn("w-1.5 h-1.5 rounded-full", refreshing ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
             {t.lastSync}: {mounted && lastSync ? lastSync.toLocaleTimeString([]) : "--:--:--"}
          </div>
          <Button variant="ghost" size="icon" onClick={syncStock} disabled={refreshing} className="rounded-xl border border-white/5 hover:bg-white/5 text-gray-400">
             <RotateCcw className={cn("w-4 h-4", refreshing && "animate-spin text-amber-500")} />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-xl border border-white/5 hover:bg-white/5 text-gray-400 lg:hidden">
             <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* ── POS Layout ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LHS: Product Engine */}
        <main className="flex-1 min-h-0 flex flex-col min-w-0 bg-[#080808]">
          
          {/* Search & Tabs */}
          <div className="p-4 sm:p-6 pb-0 space-y-6">
            <div className="relative group max-w-2xl">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className={cn("w-5 h-5 transition-colors", searchTerm ? "text-amber-500" : "text-gray-600")} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                autoFocus
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-gray-900 border border-white/5 focus:border-amber-500/50 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-gray-700 outline-none shadow-2xl transition-all font-medium"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="hidden md:flex text-[10px] font-black text-gray-600 border border-white/10 rounded px-1.5 py-0.5 uppercase">F2</span>
                {searchTerm && (
                  <button onClick={() => {setSearchTerm(""); searchInputRef.current?.focus();}} className="text-gray-500 hover:text-white p-1">
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
                    className="h-10 px-5 rounded-xl border border-white/5 data-[state=active]:bg-amber-500 data-[state=active]:text-black font-black text-xs uppercase tracking-tight transition-all data-[state=inactive]:hover:bg-white/5 data-[state=inactive]:text-gray-500"
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
                  className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none"
                >
                  <Search className="w-16 h-16 mb-4" />
                  <p className="text-xl font-bold uppercase tracking-widest">{t.noProducts}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Shortcuts Bar (Desktop only) */}
          <footer className="hidden lg:flex h-10 shrink-0 bg-gray-950/80 border-t border-white/5 items-center px-6 gap-6 overflow-hidden">
             <div className="flex items-center gap-4 text-[9px] font-black text-white/30 uppercase tracking-[0.15em]">
                <div className="flex items-center gap-1.5"><kbd className="bg-gray-800 text-white/60 px-1 py-0.5 rounded border border-white/10">F2</kbd> {t.searchPlaceholder.split(' ')[2]}</div>
                <div className="flex items-center gap-1.5"><kbd className="bg-gray-800 text-white/60 px-1 py-0.5 rounded border border-white/10">F10</kbd> {t.payAndPrint.split(' ')[0]}</div>
                <div className="flex items-center gap-1.5"><kbd className="bg-gray-800 text-white/60 px-1 py-0.5 rounded border border-white/10">ESC</kbd> {t.clear}</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 border-2 border-dashed border-white/20 rounded-sm" /> SCAN BARCODE</div>
             </div>
          </footer>
        </main>

        {/* RHS: Transaction Desk */}
        <aside className="h-[46vh] w-full border-t border-white/5 lg:h-auto lg:w-[400px] xl:w-[440px] lg:border-t-0 lg:border-l flex flex-col shrink-0 bg-gray-900/50 backdrop-blur-3xl shadow-none lg:shadow-[-40px_0_60px_-15px_rgba(0,0,0,0.5)] z-40">
          
          <div className="h-14 shrink-0 px-6 flex items-center justify-between border-b border-white/5 bg-black/40">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-amber-500" />
                {cart.length > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    className="absolute -top-2 -right-2 bg-white text-black text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg"
                  >
                    {cart.reduce((a,b) => a + b.quantity, 0)}
                  </motion.span>
                )}
              </div>
              <span className="text-[13px] font-black uppercase tracking-widest text-white/90">{t.cartTitle}</span>
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCart([])} className="h-8 text-[10px] font-black uppercase text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg">
                <Trash2 className="w-3.5 h-3.5 mr-1" /> {t.clear}
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

          <div className="shrink-0 p-6 bg-gray-950 border-t border-white/10 space-y-5">
            <div className="space-y-2 text-[13px] font-medium text-gray-400">
              <div className="flex justify-between items-center">
                <span>{t.subtotal}</span>
                <span className="text-white font-bold tabular-nums">{subtotal.toLocaleString()} {t.currency}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>{t.vat}</span>
                <span className="text-white font-bold tabular-nums">{vat.toLocaleString()} {t.currency}</span>
              </div>
              
              {/* Quick Discount in Cart */}
              <div className="flex items-center gap-3 pt-1">
                 <div className="relative flex-1">
                   <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">
                      {discountType === 'percent' ? <Percent className="w-3 h-3" /> : <Tag className="w-3 h-3" />}
                   </div>
                   <input 
                     type="number"
                     placeholder={t.discount}
                     className="w-full bg-black/40 border border-white/5 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:border-amber-500/30 outline-none font-bold"
                     value={discountValue || ""}
                     onChange={(e) => setDiscountValue(e.target.value)}
                   />
                 </div>
                 <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5">
                    <button 
                      onClick={() => setDiscountType('percent')} 
                      className={cn("px-3 py-1.5 rounded-md text-[10px] font-black transition-all", discountType === 'percent' ? "bg-amber-500 text-black shadow-lg" : "text-gray-500 hover:text-white")}
                    >%</button>
                    <button 
                      onClick={() => setDiscountType('fixed')} 
                      className={cn("px-3 py-1.5 rounded-md text-[10px] font-black transition-all", discountType === 'fixed' ? "bg-amber-500 text-black shadow-lg" : "text-gray-500 hover:text-white")}
                    >{t.discountFixed}</button>
                 </div>
              </div>

              <div className="flex justify-between font-black text-2xl pt-4 border-t border-white/10 text-white tracking-tighter">
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
        <DialogContent className="max-w-md bg-gray-900 border-white/10 text-white p-0 flex flex-col h-auto !gap-0">
          <DialogHeader className="p-4 bg-black/20 border-b border-white/5 shrink-0">
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
            <div className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="flex items-center gap-3 mb-2">
                 <User className="w-4 h-4 text-amber-500" />
                 <h4 className="text-xs font-black uppercase text-white/50">{t.customer}</h4>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Input 
                  placeholder={t.walkIn} 
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="bg-black/40 border-white/5 focus-visible:ring-amber-500/30 font-bold"
                />
                <Input 
                  placeholder={isArabic ? "رقم الهاتف" : "Phone number"} 
                  value={customerPhone} 
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="bg-black/40 border-white/5 focus-visible:ring-amber-500/30 font-mono"
                />
              </div>
            </div>

            {/* Payment Panel */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 mb-2">
                 <DollarSign className="w-4 h-4 text-amber-500" />
                 <h4 className="text-xs font-black uppercase text-white/50">{t.paymentMethod}</h4>
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
                        : "bg-black/20 border-white/5 text-gray-500 hover:text-white"
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
                className="space-y-4 pt-4 border-t border-white/5"
              >
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-white/40">{t.amountTendered}</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
                    <Input 
                      type="number" 
                      autoFocus
                      className="bg-black/40 border-white/5 h-12 pl-12 text-xl font-black tabular-nums focus-visible:ring-amber-500/30"
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{t.change}</span>
                    <span className="text-2xl font-black text-white tabular-nums">{changeAmount.toLocaleString()} <span className="text-sm">{t.currency}</span></span>
                  </div>
                  <XCircle 
                    className={cn("w-10 h-10 transition-opacity", parseFloat(amountTendered) < total ? "text-red-500 opacity-100" : "opacity-0")} 
                  />
                </div>
              </motion.div>
            )}
          </div>

          <div className="p-4 bg-black/40 border-t border-white/5 space-y-3 shrink-0">
               <div className="flex justify-between items-baseline p-4 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-sm font-bold text-gray-400 uppercase">{t.total}</span>
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
      
      {/* ── Custom Scrollbar Styles ── */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 215, 0, 0.2); }
      `}</style>
    </div>
  );
}
