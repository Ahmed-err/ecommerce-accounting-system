"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, ArrowLeft, AlertTriangle, Check, Loader2, User, MapPin, CreditCard, Package, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/store/CartProvider";
import { useSession } from "next-auth/react";
import { placeOrder } from "@/app/actions/catalog";
import { validateCartStock } from "@/app/actions/cart";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { SUDAN_CITIES, PAYMENT_METHODS, STORE_BANK_DETAILS, STORE_WHATSAPP_NUMBER } from "@/lib/constants";
import { UploadButton } from "@/lib/uploadthing";

export default function CartClient() {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang] || translations['ar'];
  const { cart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount } = useCart();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [guestInfo, setGuestInfo] = useState({ name: "", phone: "", phoneAlt: "", address: "", city: "", paymentMethod: "CASH_ON_DELIVERY", transferScreenshotUrl: "" });
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [stockValidation, setStockValidation] = useState({ valid: true, issues: [] });
  
  const shippingCost = useMemo(() => {
    const city = SUDAN_CITIES.find(c => c.name === guestInfo.city);
    return city ? city.rate : 0;
  }, [guestInfo.city]);

  const vatAmount = cartTotal * 0.15;
  const finalTotal = cartTotal + shippingCost + vatAmount;
  const router = useRouter();
  const whatsappUrl = `https://wa.me/${STORE_WHATSAPP_NUMBER}`;
  const whatsappMessage = encodeURIComponent(
    lang === "ar"
      ? `مرحبا، قمت بعمل طلب من ${t.brandName}. الاسم: ${guestInfo.name || "-"}، الهاتف: ${guestInfo.phone || "-"}`
      : `Hello, I placed an order from ${t.brandName}. Name: ${guestInfo.name || "-"}, Phone: ${guestInfo.phone || "-"}`
  );

  const formatStockIssue = (issue) => {
    switch (issue?.type) {
      case "invalid_product":
        return t.stockIssueInvalidProduct;
      case "invalid_quantity":
        return t.stockIssueInvalidQuantity;
      case "not_found":
        return t.stockIssueNotFound;
      case "inactive":
        return t.stockIssueInactive;
      case "insufficient_stock": {
        const available = issue.available ?? 0;
        const requested = issue.requested ?? 0;
        return t.stockIssueInsufficientStock
          .replace("{available}", String(available))
          .replace("{requested}", String(requested));
      }
      default:
        return t.stockValidationFailed;
    }
  };

  const stockIssuesById = useMemo(() => {
    const map = {};
    const issues = stockValidation?.issues || [];
    for (const issue of issues) {
      if (issue?.id) map[issue.id] = issue;
    }
    return map;
  }, [stockValidation]);

  useEffect(() => {
    if (!session?.user) return;
    setGuestInfo((prev) => ({
      ...prev,
      name: prev.name || session.user.name || "",
    }));
  }, [session]);

  // Reset stock validation UI when cart totals change.
  useEffect(() => {
    setStockValidation({ valid: true, issues: [] });
  }, [cartCount, cartTotal]);

  const validateForm = () => {
    const errors = {};
    
    if (!guestInfo.name.trim()) {
      errors.name = t.fullNameRequired || "Full name is required";
    } else if (guestInfo.name.trim().length < 3) {
      errors.name = t.nameTooShort || "Name must be at least 3 characters";
    }
    
    if (!guestInfo.phone.trim()) {
      errors.phone = t.phoneRequired || "Phone number is required";
    } else if (!/^09\d{8}$/.test(guestInfo.phone.replace(/\s/g, ''))) {
      errors.phone = t.phoneInvalid || "Phone number must start with 09 and be 10 digits";
    }
    
    if (guestInfo.phoneAlt && !/^09\d{8}$/.test(guestInfo.phoneAlt.replace(/\s/g, ''))) {
      errors.phoneAlt = t.phoneInvalid || "Invalid phone number format";
    }
    
    if (!guestInfo.city) {
      errors.city = t.cityRequired || "Please select a city";
    }
    
    if (!guestInfo.address.trim()) {
      errors.address = t.addressRequired || "Delivery address is required";
    } else if (guestInfo.address.trim().length < 10) {
      errors.address = t.addressTooShort || "Address must be at least 10 characters";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCheckout = async () => {
    if (!validateForm()) {
      setError(t.fixFormErrors || "Please fix the form errors before proceeding");
      return;
    }
    
    setLoading(true);
    setIsProcessing(true);
    setError("");

    try {
      // Validate stock before placing order
      const stockCheck = await validateCartStock(cart);
      setStockValidation(stockCheck);
      
      if (!stockCheck.valid) {
        const issues = stockCheck.issues
          .map((i) => `${i?.name || ""} ${formatStockIssue(i)}`.trim())
          .join("; ");
        setError(`${t.stockValidationFailed}: ${issues}`);
        setLoading(false);
        setIsProcessing(false);
        return;
      }

      const res = await placeOrder(session?.user?.id || null, cart, {
        ...guestInfo,
        shippingCost
      });
      
      if (res.success) {
        clearCart();
        setSuccess(`${t.checkoutSuccess} ${t.orderNumberIs}: ${res.orderId.slice(-8).toUpperCase()}`);
      } else {
        setError(res.error || t.orderFailed);
      }
    } catch (err) {
      setError(t.checkoutError || "An error occurred during checkout. Please try again.");
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  const copyWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(`+${STORE_WHATSAPP_NUMBER}`);
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2000);
    } catch {}
  };

  const handleStep1Next = () => {
    if (!validateForm()) {
      setError(t.fixFormErrors || "Please fill in all required fields correctly");
      return;
    }
    setError("");
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    if (!guestInfo.paymentMethod) {
      setError(t.selectPaymentMethod || "Please select a payment method");
      return;
    }
    setError("");
    setCurrentStep(3);
  };

  if (success) {
    return (
      <motion.div 
        className="text-center py-20"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="inline-flex p-4 bg-emerald-500/10 rounded-full mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        >
          <div className="relative">
            <ShoppingBag className="h-10 w-10 text-emerald-400" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
            >
              <Check className="h-6 w-6 text-emerald-400 absolute -bottom-1 -right-1 bg-gray-950 rounded-full p-1" />
            </motion.div>
          </div>
        </motion.div>
        <motion.h2 
          className="text-2xl font-bold text-white mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {t.checkoutSuccess}
        </motion.h2>
        <motion.p 
          className="text-gray-400 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {success}
        </motion.p>
        
        <motion.div 
          className="max-w-md mx-auto space-y-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-2 flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              {lang === "ar" ? "الخطوات التالية" : "Next Steps"}
            </h3>
            <ul className={`text-sm text-gray-400 space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              <motion.li 
                className="flex items-start gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <span className="text-amber-500 mt-1">•</span>
                <span>{lang === "ar" ? "سنقوم بمعالجة طلبك خلال 24 ساعة" : "Your order will be processed within 24 hours"}</span>
              </motion.li>
              <motion.li 
                className="flex items-start gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <span className="text-amber-500 mt-1">•</span>
                <span>{lang === "ar" ? "سنتواصل معك عبر الهاتف للتأكيد" : "We'll contact you via phone for confirmation"}</span>
              </motion.li>
              <motion.li 
                className="flex items-start gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
              >
                <span className="text-amber-500 mt-1">•</span>
                <span>{lang === "ar" ? "يمكنك تتبع حالة طلبك في حسابك" : "You can track your order status in your account"}</span>
              </motion.li>
            </ul>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/products">
              <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                <ArrowRight className={`mr-2 h-4 w-4 ${isRTL ? '' : 'rotate-180'}`} /> {t.backToStore}
              </Button>
            </Link>
            {session && (
              <Link href="/my-orders">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <Package className={`mr-2 h-4 w-4 ${isRTL ? '' : 'rotate-180'}`} />
                  {lang === "ar" ? "طلباتي" : "My Orders"}
                </Button>
              </Link>
            )}
          </div>
          
          <p className="text-xs text-gray-500">{t.contactRecall}</p>
        </motion.div>
      </motion.div>
    );
  }

  if (cartCount === 0) {
    return (
      <motion.div 
        className="text-center py-20"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="inline-flex p-4 bg-white/5 rounded-full mb-6"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ShoppingBag className="h-10 w-10 text-gray-500" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">{t.cartEmpty}</h2>
        <p className="text-gray-400 mb-6">{t.addSomeProducts}</p>
        <motion.div 
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Link href="/products">
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              <ArrowRight className={`mr-2 h-4 w-4 ${isRTL ? '' : 'rotate-180'}`} /> {t.browseProducts}
            </Button>
          </Link>
          <div className="text-sm text-gray-500">
            <p>{lang === "ar" ? "أو استعرض المنتجات المميزة" : "Or browse featured products"}</p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={`grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 ${isRTL ? 'text-right' : 'text-left'}`} 
      dir={isRTL ? 'rtl' : 'ltr'}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Cart Items */}
      <div className="lg:col-span-2 space-y-3 sm:space-y-4 min-w-0">
        <Link href="/products" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-4 transition-colors">
          <ArrowRight className={`h-4 w-4 ${isRTL ? '' : 'rotate-180'}`} /> {t.continueShopping}
        </Link>

        {/* Checkout Steps Progress */}
        <motion.div 
          className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">{lang === "ar" ? "خطوات الدفع" : "Checkout Steps"}</h2>
            <span className="text-sm text-gray-400">{lang === "ar" ? `الخطوة ${currentStep} من 3` : `Step ${currentStep} of 3`}</span>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <motion.div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                    step <= currentStep 
                      ? 'bg-amber-500 text-black' 
                      : 'bg-gray-700 text-gray-400'
                  }`}
                  initial={false}
                  animate={{
                    scale: step === currentStep ? 1.1 : 1,
                    backgroundColor: step <= currentStep ? '#f59e0b' : '#374151'
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {step < currentStep ? <Check className="h-4 w-4" /> : step}
                </motion.div>
                {step < 3 && (
                  <motion.div 
                    className="flex-1 h-1 mx-2 rounded-full"
                    initial={false}
                    animate={{
                      backgroundColor: step < currentStep ? '#f59e0b' : '#374151',
                      scaleX: step < currentStep ? 1 : 1
                    }}
                    transition={{ duration: 0.4 }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className={`text-xs transition-colors duration-300 ${currentStep >= 1 ? 'text-amber-500 font-semibold' : 'text-gray-500'}`}>
              {lang === "ar" ? "معلومات العميل" : "Customer Info"}
            </span>
            <span className={`text-xs transition-colors duration-300 ${currentStep >= 2 ? 'text-amber-500 font-semibold' : 'text-gray-500'}`}>
              {lang === "ar" ? "طريقة الدفع" : "Payment"}
            </span>
            <span className={`text-xs transition-colors duration-300 ${currentStep >= 3 ? 'text-amber-500 font-semibold' : 'text-gray-500'}`}>
              {lang === "ar" ? "مراجعة" : "Review"}
            </span>
          </div>
        </motion.div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
                <button 
                  onClick={() => setError("")}
                  className="ml-auto text-red-400 hover:text-red-300 text-sm"
                >
                  ×
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* Customer Information Step */}
          {currentStep === 1 && (
            <motion.div 
              key="step1"
              className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 space-y-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="h-5 w-5 text-amber-500" />
                {session?.user ? t.customerInfoTitle : t.guestInfoTitle}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <User className="h-4 w-4 text-amber-500" />
                    {t.fullName} *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className={`w-full bg-gray-800 border rounded-lg px-4 py-2.5 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all ${isRTL ? 'text-right' : 'text-left'} ${
                        formErrors.name ? 'border-red-400 focus:border-red-400 focus:ring-red-400/50' : 'border-white/10'
                      }`}
                      placeholder={lang === 'ar' ? 'محمد أحمد' : 'John Doe'}
                      value={guestInfo.name}
                      onChange={(e) => {
                        setGuestInfo({ ...guestInfo, name: e.target.value });
                        if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                      }}
                    />
                    {formErrors.name && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </motion.span>
                    )}
                  </div>
                  {formErrors.name && <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>}
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="text-amber-500 font-bold">📱</span>
                    {t.phoneRequiredLabel} *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      className={`w-full bg-gray-800 border rounded-lg px-4 py-2.5 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all ${isRTL ? 'text-right' : 'text-left'} ${
                        formErrors.phone ? 'border-red-400 focus:border-red-400 focus:ring-red-400/50' : 'border-white/10'
                      }`}
                      placeholder="09xxxxxxxx"
                      value={guestInfo.phone}
                      onChange={(e) => {
                        setGuestInfo({ ...guestInfo, phone: e.target.value });
                        if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                      }}
                    />
                    {formErrors.phone && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </motion.span>
                    )}
                  </div>
                  {formErrors.phone && <p className="text-xs text-red-400 mt-1">{formErrors.phone}</p>}
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="text-gray-500">📞</span>
                    {t.phoneOptional} <span className="text-xs text-gray-600">({t.optional})</span>
                  </label>
                  <input
                    type="tel"
                    className={`w-full bg-gray-800 border rounded-lg px-4 py-2.5 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all ${isRTL ? 'text-right' : 'text-left'} ${
                      formErrors.phoneAlt ? 'border-red-400 focus:border-red-400 focus:ring-red-400/50' : 'border-white/10'
                    }`}
                    placeholder="09xxxxxxxx"
                    value={guestInfo.phoneAlt}
                    onChange={(e) => {
                      setGuestInfo({ ...guestInfo, phoneAlt: e.target.value });
                      if (formErrors.phoneAlt) setFormErrors({ ...formErrors, phoneAlt: '' });
                    }}
                  />
                  {formErrors.phoneAlt && <p className="text-xs text-red-400 mt-1">{formErrors.phoneAlt}</p>}
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin className="h-4 w-4 text-amber-500" />
                    {t.shippingCityLabel} *
                  </label>
                  <div className="relative">
                    <select
                      className={`w-full bg-gray-800 border rounded-lg px-4 py-2.5 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all appearance-none cursor-pointer ${isRTL ? 'text-right' : 'text-left'} ${
                        formErrors.city ? 'border-red-400 focus:border-red-400 focus:ring-red-400/50' : 'border-white/10'
                      }`}
                      value={guestInfo.city}
                      onChange={(e) => {
                        setGuestInfo({ ...guestInfo, city: e.target.value });
                        if (formErrors.city) setFormErrors({ ...formErrors, city: '' });
                      }}
                    >
                      <option value="">{t.selectCity}</option>
                      {SUDAN_CITIES.map(city => (
                        <option key={city.name} value={city.name}>
                          {lang === 'ar' ? city.arName : city.name} ({city.rate.toLocaleString()} {t.currency})
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {formErrors.city && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-10 top-1/2 -translate-y-1/2 text-red-400"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </motion.span>
                    )}
                  </div>
                  {formErrors.city && <p className="text-xs text-red-400 mt-1">{formErrors.city}</p>}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin className="h-4 w-4 text-amber-500" />
                    {t.shippingAddressLabel} *
                  </label>
                  <div className="relative">
                    <textarea
                      rows={3}
                      className={`w-full bg-gray-800 border rounded-lg px-4 py-2.5 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all resize-none ${isRTL ? 'text-right' : 'text-left'} ${
                        formErrors.address ? 'border-red-400 focus:border-red-400 focus:ring-red-400/50' : 'border-white/10'
                      }`}
                      placeholder={t.shippingAddressPlaceholder}
                      value={guestInfo.address}
                      onChange={(e) => {
                        setGuestInfo({ ...guestInfo, address: e.target.value });
                        if (formErrors.address) setFormErrors({ ...formErrors, address: '' });
                      }}
                    />
                    {formErrors.address && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-3 top-3 text-red-400"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </motion.span>
                    )}
                  </div>
                  {formErrors.address && <p className="text-xs text-red-400 mt-1">{formErrors.address}</p>}
                </div>
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={handleStep1Next}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                >
                  {lang === "ar" ? "التالي" : "Next"}
                  <ArrowLeft className={`ml-2 h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Payment Method Step */}
          {currentStep === 2 && (
            <motion.div 
              key="step2"
              className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 space-y-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-500" />
                {t.paymentMethodTitle}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PAYMENT_METHODS.map((method) => (
                  <label 
                    key={method.id} 
                    className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
                      guestInfo.paymentMethod === method.id 
                        ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/5' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <input 
                      type="radio" 
                      className="sr-only" 
                      name="paymentMethod" 
                      value={method.id}
                      checked={guestInfo.paymentMethod === method.id}
                      onChange={() => setGuestInfo({ ...guestInfo, paymentMethod: method.id })}
                    />
                    <div className={`flex flex-col h-full ${isRTL ? 'text-right pr-8' : 'text-left pl-8'}`}>
                      <span className={`font-bold transition-colors ${guestInfo.paymentMethod === method.id ? 'text-amber-500' : 'text-white'}`}>
                        {lang === 'ar' ? method.arName : method.enName}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">{lang === 'ar' ? method.arDesc : method.enDesc}</p>
                    </div>
                    {guestInfo.paymentMethod === method.id && (
                      <div className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-950" />
                      </div>
                    )}
                  </label>
                ))}
              </div>

              {guestInfo.paymentMethod === "BANK_TRANSFER" && (
                <div className={`p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <p className="text-xs text-blue-400 font-bold uppercase tracking-wider">{t.bankTransferInstructions}</p>
                  <p className="text-sm text-gray-300">{t.transferToFollowing}</p>
                  <div className="bg-gray-950/50 p-3 rounded-lg border border-white/5 text-sm space-y-1">
                    <p><span className="text-gray-500">{t.bankLabel}:</span> <span className="text-white font-medium">{lang === 'ar' ? STORE_BANK_DETAILS.arBankName : STORE_BANK_DETAILS.bankName}</span></p>
                    <p><span className="text-gray-500">{t.accountNumberLabel}:</span> <span className="text-white font-mono font-bold">{STORE_BANK_DETAILS.accountNumber}</span></p>
                    <p><span className="text-gray-500">{t.accountNameLabel}:</span> <span className="text-white font-medium">{lang === 'ar' ? STORE_BANK_DETAILS.arAccountName : STORE_BANK_DETAILS.accountName}</span></p>
                  </div>
                  <div className="bg-gray-950/50 p-3 rounded-lg border border-white/5 space-y-2">
                    <p className="text-xs text-gray-400 font-semibold">
                      {lang === "ar" ? "رقم واتساب التأكيد" : "Confirmation WhatsApp"}
                    </p>
                    <p className="text-white font-mono font-bold">+{STORE_WHATSAPP_NUMBER}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={copyWhatsApp}
                        className="h-8 text-xs bg-gray-800 border-white/10 text-white hover:bg-gray-700"
                      >
                        {copiedWhatsApp
                          ? (lang === "ar" ? "تم النسخ" : "Copied")
                          : (lang === "ar" ? "نسخ الرقم" : "Copy number")}
                      </Button>
                      <a
                        href={`${whatsappUrl}?text=${whatsappMessage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 px-3 inline-flex items-center rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                      >
                        {lang === "ar" ? "فتح واتساب" : "Open WhatsApp"}
                      </a>
                    </div>
                  </div>
                  <div className="bg-gray-950/50 p-3 rounded-lg border border-white/5 space-y-2">
                    <p className="text-xs text-gray-400 font-semibold">
                      {lang === "ar" ? "رفع لقطة شاشة التحويل (اختياري)" : "Upload transfer screenshot (optional)"}
                    </p>
                    <UploadButton
                      endpoint="paymentProof"
                      content={{
                        button: ({ ready }) =>
                          ready
                            ? (lang === "ar" ? "رفع الصورة" : "Upload screenshot")
                            : (lang === "ar" ? "جاري التحضير..." : "Preparing..."),
                        allowedContent: lang === "ar" ? "صورة واحدة حتى 4MB" : "1 image up to 4MB",
                      }}
                      className="ut-button:bg-amber-500 ut-button:ut-readying:bg-amber-500/50 ut-button:text-black ut-button:font-bold ut-allowed-content:text-gray-500"
                      onClientUploadComplete={(res) => {
                        const first = res?.[0]?.url;
                        if (first) {
                          setGuestInfo((prev) => ({ ...prev, transferScreenshotUrl: first }));
                        }
                      }}
                      onUploadError={(uploadErr) => {
                        setError(uploadErr.message || (lang === "ar" ? "فشل الرفع" : "Upload failed"));
                      }}
                    />
                    {guestInfo.transferScreenshotUrl && (
                      <div className="text-xs text-emerald-400 break-all">
                        {lang === "ar" ? "تم رفع الصورة:" : "Uploaded:"} {guestInfo.transferScreenshotUrl}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 italic font-medium">{t.sendScreenshotNotice}</p>
                </div>
              )}
              
              <div className="flex justify-between">
                <Button 
                  onClick={() => setCurrentStep(1)}
                  variant="outline"
                  className="border-white/20 text-white bg-transparent hover:bg-white/10"
                >
                  <ArrowRight className={`mr-2 h-4 w-4 ${isRTL ? '' : 'rotate-180'}`} />
                  {lang === "ar" ? "السابق" : "Previous"}
                </Button>
                <Button 
                  onClick={handleStep2Next}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                >
                  {lang === "ar" ? "التالي" : "Next"}
                  <ArrowLeft className={`ml-2 h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Review Order Step */}
          {currentStep === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Package className="h-5 w-5 text-amber-500" />
                  {t.reviewProducts}
                </h2>
                
                {/* Customer & Delivery Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800/30 p-3 rounded-lg space-y-2">
                    <h3 className="text-sm font-semibold text-amber-500 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {lang === "ar" ? "معلومات العميل" : "Customer Info"}
                    </h3>
                    <div className="text-xs text-gray-300 space-y-1">
                      <p><span className="text-gray-500">{t.fullName}:</span> {guestInfo.name}</p>
                      <p><span className="text-gray-500">{t.phoneRequiredLabel}:</span> {guestInfo.phone}</p>
                      {guestInfo.phoneAlt && <p><span className="text-gray-500">{t.phoneOptional}:</span> {guestInfo.phoneAlt}</p>}
                    </div>
                  </div>
                  <div className="bg-gray-800/30 p-3 rounded-lg space-y-2">
                    <h3 className="text-sm font-semibold text-amber-500 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {lang === "ar" ? "معلومات التوصيل" : "Delivery Info"}
                    </h3>
                    <div className="text-xs text-gray-300 space-y-1">
                      <p><span className="text-gray-500">{t.shippingCityLabel}:</span> {guestInfo.city}</p>
                      <p><span className="text-gray-500">{t.shippingAddressLabel}:</span> {guestInfo.address}</p>
                    </div>
                  </div>
                </div>
              
              {/* Payment Summary */}
              <div className="bg-gray-800/30 p-3 rounded-lg">
                <h3 className="text-sm font-semibold text-amber-500 flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4" />
                  {lang === "ar" ? "طريقة الدفع" : "Payment Method"}
                </h3>
                <p className="text-xs text-gray-300">
                  {lang === "ar" 
                    ? PAYMENT_METHODS.find(m => m.id === guestInfo.paymentMethod)?.arName
                    : PAYMENT_METHODS.find(m => m.id === guestInfo.paymentMethod)?.enName
                  }
                </p>
              </div>
              
              <div className="flex justify-start">
                <Button 
                  onClick={() => setCurrentStep(2)}
                  variant="outline"
                  className="border-white/20 text-white bg-transparent hover:bg-white/10"
                >
                  <ArrowRight className={`mr-2 h-4 w-4 ${isRTL ? '' : 'rotate-180'}`} />
                  {lang === "ar" ? "السابق" : "Previous"}
                </Button>
              </div>
            </div>
          </motion.div>
          )}
        </AnimatePresence>

        {/* Cart Items - Show on all steps for reference */}
        <div className="space-y-3 sm:space-y-4">
          {currentStep !== 3 && (
            <h2 className="text-lg font-bold text-white flex items-center gap-2 px-2">
              <Package className="h-5 w-5 text-amber-500" />
              {lang === "ar" ? "منتجات في السلة" : "Cart Items"}
            </h2>
          )}
          
          {cart.map((item, index) => (
            <motion.div 
              key={item.id} 
              className={`bg-white/5 border rounded-xl p-3 sm:p-4 ${
                stockIssuesById[item.id]
                  ? "border-red-500/35"
                  : "border-white/10"
              }`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ borderColor: "rgba(245, 158, 11, 0.3)" }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
                {/* Image */}
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl opacity-30">📦</span>
                  )}
                </div>
                
                {/* Info */}
                <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <Link href={`/products/${item.id}`}>
                    <h3 className="text-white font-semibold truncate hover:text-amber-500 transition-colors">{item.name}</h3>
                  </Link>
                  <p className="text-amber-500 font-bold mt-1">{item.price.toLocaleString()} {t.currency}</p>

                  {stockIssuesById[item.id] && (
                    <p className="text-xs mt-2 text-red-400 leading-relaxed">
                      {formatStockIssue(stockIssuesById[item.id])}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 sm:gap-4">
                  {/* Quantity - Only editable on step 1 */}
                  {currentStep === 1 ? (
                    <div className="flex items-center bg-gray-800 border border-white/10 rounded-lg">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)} 
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm text-white font-medium">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="bg-gray-800 border border-white/10 rounded-lg px-3 py-2">
                      <span className="text-sm text-white font-medium">{lang === "ar" ? "الكمية:" : "Qty:"} {item.quantity}</span>
                    </div>
                  )}

                  {/* Subtotal */}
                  <div className={`${isRTL ? 'text-left' : 'text-right'} shrink-0`}>
                    <p className="text-white font-bold whitespace-nowrap">{(item.price * item.quantity).toLocaleString()} {t.currency}</p>
                  </div>

                  {/* Remove - Only on step 1 */}
                  {currentStep === 1 && (
                    <button 
                      onClick={() => removeFromCart(item.id)} 
                      className="p-2 text-gray-500 hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      <motion.div 
        className="lg:col-span-1 min-w-0"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <motion.div 
          className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 lg:sticky lg:top-24 space-y-4"
          whileHover={{ borderColor: "rgba(245, 158, 11, 0.2)" }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-500" />
            {t.orderSummary}
          </h2>

          {/* Enhanced Order Summary */}
          <div className="space-y-3">
            <div className="bg-gray-800/30 p-3 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-amber-500 font-bold text-lg">{finalTotal.toLocaleString()} {t.currency}</span>
                <span className="text-white font-bold">{t.grandTotal}</span>
              </div>
            </div>
            
            <div className="border-t border-white/10 pt-3 space-y-2 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>{cartTotal.toLocaleString()} {t.currency}</span>
                <span>{t.productsTotal} ({cartCount} {t.items})</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>{shippingCost > 0 ? `${shippingCost.toLocaleString()} ${t.currency}` : '—'}</span>
                <span>{t.delivery} ({guestInfo.city || t.cityNotSelected})</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>{vatAmount.toLocaleString()} {t.currency}</span>
                <span>{isRTL ? "ضريبة القيمة المضافة (15%)" : "VAT (15%)"}</span>
              </div>
            </div>
            
            {/* Order Summary Details */}
            {currentStep === 3 && (
              <div className="bg-gray-800/30 p-3 rounded-lg space-y-2">
                <h3 className="text-sm font-semibold text-amber-500 mb-2">
                  {lang === "ar" ? "تفاصيل الطلب" : "Order Details"}
                </h3>
                <div className="space-y-1 text-xs text-gray-300">
                  <div className="flex justify-between">
                    <span>{lang === "ar" ? "المنتجات" : "Products"}:</span>
                    <span>{cartCount} {t.items}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{lang === "ar" ? "طريقة الدفع" : "Payment"}:</span>
                    <span className="truncate max-w-24">
                      {lang === "ar" 
                        ? PAYMENT_METHODS.find(m => m.id === guestInfo.paymentMethod)?.arName?.substring(0, 15)
                        : PAYMENT_METHODS.find(m => m.id === guestInfo.paymentMethod)?.enName?.substring(0, 15)
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{lang === "ar" ? "التوصيل" : "Delivery"}:</span>
                    <span className="truncate max-w-24">{guestInfo.city}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div 
                className="p-3 bg-red-500/20 text-red-400 rounded-md text-sm border border-red-500/20"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Checkout Button - Only show on step 3 */}
          {currentStep === 3 ? (
            <Button
              onClick={handleCheckout}
              disabled={loading || isProcessing}
              className="w-full py-5 sm:py-6 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-base rounded-xl transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {lang === "ar" ? "جاري معالجة الطلب..." : "Processing Order..."}
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-5 w-5" />
                  {t.placeOrderBtn}
                </>
              )}
            </Button>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-gray-500">
                {lang === "ar" 
                  ? `اكمل الخطوة ${currentStep} من 3 للمتابعة` 
                  : `Complete step ${currentStep} of 3 to continue`
                }
              </p>
            </div>
          )}

          {/* Login Prompt */}
          {!session && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs text-gray-400 text-center">
                {t.haveAccount} <Link href="/login" className="text-amber-500 hover:underline font-semibold">{t.loginInstead}</Link>
                <br />
                <span className="text-gray-500">
                  {lang === "ar" ? "للتتبع السريع والعروض الخاصة" : "For fast tracking & special offers"}
                </span>
              </p>
            </div>
          )}
          
          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <Shield className="h-3 w-3" />
            <span>{lang === "ar" ? "دفع آمن ومشفر" : "Secure & Encrypted Payment"}</span>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

