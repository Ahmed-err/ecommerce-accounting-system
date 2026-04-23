"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, ArrowLeft, AlertTriangle, Check, Loader2, User, MapPin, CreditCard, Package, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/components/store/CartProvider";
import { useSession } from "next-auth/react";
import { placeOrder, getCheckoutShippingOptions } from "@/app/actions/catalog";
import { validateCartStock } from "@/app/actions/cart";
import { previewCoupon } from "@/app/actions/coupon";
import { listUserAddresses } from "@/app/actions/addresses";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import {
  SUDAN_CITIES,
  PAYMENT_METHODS,
  STORE_BANK_DETAILS,
  resolveBankTransferProofWhatsapp,
  CHECKOUT_TAX_RATE,
} from "@/lib/constants";
import { UploadButton } from "@/lib/uploader";
import { checkoutShippingSchema } from "@/lib/schemas/checkout";
import { cn } from "@/lib/utils";
import Image from "next/image";

const panelClass =
  "rounded-2xl border border-border bg-card text-card-foreground shadow-sm";
const fieldBase =
  "w-full rounded-xl border bg-background px-3 py-2.5 text-foreground transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/25 focus-visible:outline-none sm:py-3";
const insetClass = "rounded-xl border border-border bg-muted/30 p-3 sm:p-4";

export default function CheckoutClient({ proofWhatsappDigits = null, bankTransferDetails = null }) {
  const { lang, isRTL, brandName } = useLanguage();
  const t = translations[lang] || translations['ar'];
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    cartCount,
    loaded,
    appliedCoupon: cartAppliedCoupon,
    setAppliedCoupon: persistCartCoupon,
  } = useCart();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [guestInfo, setGuestInfo] = useState({
    name: "",
    phone: "",
    phoneAlt: "",
    address: "",
    city: "",
    paymentMethod: "CASH_ON_DELIVERY",
    transferScreenshotUrl: "",
    orderNotes: "",
    couponCode: "",
  });
  const [couponDraft, setCouponDraft] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, percentOff }
  const [savedAddresses, setSavedAddresses] = useState([]);
  const defaultAddressAppliedRef = useRef(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [stockValidation, setStockValidation] = useState({ valid: true, issues: [] });
  const [couponBusy, setCouponBusy] = useState(false);
  const [shippingOptions, setShippingOptions] = useState(
    SUDAN_CITIES.map((c) => ({ name: c.name, arName: c.arName, rate: c.rate }))
  );

  const shippingCost = useMemo(() => {
    const selected = shippingOptions.find(
      (c) =>
        String(c.name || "").toLowerCase() === String(guestInfo.city || "").toLowerCase()
    );
    return selected ? Number(selected.rate || 0) : 0;
  }, [guestInfo.city, shippingOptions]);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon?.percentOff) return 0;
    return Math.min(
      cartTotal,
      Math.round(cartTotal * (appliedCoupon.percentOff / 100) * 100) / 100
    );
  }, [appliedCoupon, cartTotal]);

  const afterDiscount = Math.max(0, Math.round((cartTotal - discountAmount) * 100) / 100);
  const vatAmount = Math.round(afterDiscount * CHECKOUT_TAX_RATE * 100) / 100;
  const finalTotal = Math.round((afterDiscount + shippingCost + vatAmount) * 100) / 100;
  const router = useRouter();
  const skipEmptyCartRedirectRef = useRef(false);

  useEffect(() => {
    if (!loaded || cartCount > 0) return;
    if (skipEmptyCartRedirectRef.current) return;
    router.replace("/cart");
  }, [loaded, cartCount, router]);

  const bankProofWaDigits = useMemo(
    () => resolveBankTransferProofWhatsapp(proofWhatsappDigits),
    [proofWhatsappDigits]
  );

  const resolvedBankDetails = useMemo(() => {
    const d = bankTransferDetails && typeof bankTransferDetails === "object" ? bankTransferDetails : {};
    const enBank = String(d.bankNameEn || "").trim();
    const arBank = String(d.bankNameAr || "").trim();
    const num = String(d.accountNumber || "").trim();
    const enName = String(d.accountNameEn || "").trim();
    const arName = String(d.accountNameAr || "").trim();
    return {
      bankName: enBank || arBank || STORE_BANK_DETAILS.bankName,
      arBankName: arBank || enBank || STORE_BANK_DETAILS.arBankName,
      accountNumber: num || STORE_BANK_DETAILS.accountNumber,
      accountName: enName || arName || STORE_BANK_DETAILS.accountName,
      arAccountName: arName || enName || STORE_BANK_DETAILS.arAccountName,
    };
  }, [bankTransferDetails]);

  const whatsappUrl = `https://wa.me/${bankProofWaDigits}`;
  const whatsappMessage = encodeURIComponent(
    lang === "ar"
      ? `مرحبا، قمت بعمل طلب من ${brandName}. الاسم: ${guestInfo.name || "-"}، الهاتف: ${guestInfo.phone || "-"}`
      : `Hello, I placed an order from ${brandName}. Name: ${guestInfo.name || "-"}, Phone: ${guestInfo.phone || "-"}`
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

  useEffect(() => {
    if (!loaded || !cartAppliedCoupon?.code) return;
    setAppliedCoupon((prev) => (prev?.code ? prev : cartAppliedCoupon));
    setGuestInfo((g) => (g.couponCode ? g : { ...g, couponCode: cartAppliedCoupon.code }));
    setCouponDraft((d) => (d ? d : cartAppliedCoupon.code));
  }, [loaded, cartAppliedCoupon]);

  useEffect(() => {
    if (!session?.user?.id) return;
    listUserAddresses().then((res) => {
      if (res.success && Array.isArray(res.addresses)) {
        setSavedAddresses(res.addresses);
      }
    });
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id || !savedAddresses.length || defaultAddressAppliedRef.current) return;
    const def = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
    if (def) {
      setGuestInfo((prev) => ({
        ...prev,
        name: def.fullName,
        phone: def.phone,
        address: def.addressLine,
        city: def.city,
      }));
      defaultAddressAppliedRef.current = true;
    }
  }, [session?.user?.id, savedAddresses]);

  useEffect(() => {
    let cancelled = false;
    getCheckoutShippingOptions().then((res) => {
      if (cancelled) return;
      if (Array.isArray(res?.options) && res.options.length > 0) {
        setShippingOptions(res.options);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset stock validation UI when cart totals change.
  useEffect(() => {
    setStockValidation({ valid: true, issues: [] });
  }, [cartCount, cartTotal]);

  const mapZodIssue = (issue) => {
    const code = issue?.message;
    switch (code) {
      case "name_short":
        return t.nameTooShort;
      case "phone_format":
        return t.phoneInvalid;
      case "city_required":
        return t.cityRequired;
      case "address_short":
        return t.addressTooShort;
      case "notes_long":
        return t.notesTooLong;
      case "phone_alt_format":
        return t.phoneInvalid;
      default:
        return t.fixFormErrors;
    }
  };

  const validateForm = () => {
    const parsed = checkoutShippingSchema.safeParse({
      name: guestInfo.name,
      phone: guestInfo.phone,
      phoneAlt: guestInfo.phoneAlt || "",
      city: guestInfo.city,
      address: guestInfo.address,
      orderNotes: guestInfo.orderNotes || "",
    });

    if (!parsed.success) {
      const errors = {};
      for (const iss of parsed.error.issues) {
        const key = iss.path[0];
        if (key && typeof key === "string") {
          errors[key] = mapZodIssue(iss);
        }
      }
      setFormErrors(errors);
      return false;
    }

    setFormErrors({});
    return true;
  };

  const handleApplyCoupon = async () => {
    const code = couponDraft.trim();
    if (!code) {
      toast.error(t.couponInvalid);
      return;
    }
    setCouponBusy(true);
    try {
      const res = await previewCoupon(code);
      if (res.valid) {
        setAppliedCoupon({ code: res.code, percentOff: res.percentOff });
        persistCartCoupon({ code: res.code, percentOff: res.percentOff });
        setGuestInfo((g) => ({ ...g, couponCode: res.code }));
        toast.success(t.couponToastSuccess);
      } else {
        setAppliedCoupon(null);
        persistCartCoupon(null);
        setGuestInfo((g) => ({ ...g, couponCode: "" }));
        if (res.error === "rate_limit") toast.error(t.couponRateLimited);
        else toast.error(t.couponInvalid);
      }
    } finally {
      setCouponBusy(false);
    }
  };

  const applySavedAddress = (addr) => {
    setGuestInfo((prev) => ({
      ...prev,
      name: addr.fullName,
      phone: addr.phone,
      address: addr.addressLine,
      city: addr.city,
    }));
    setFormErrors({});
    toast.message(t.addressFilledFromSaved);
  };

  const handleCheckout = async () => {
    if (loading || isProcessing) return;
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

      const cartForOrder = cart.map((item) => ({
        id: item.id,
        name: typeof item.name === "string" ? item.name : "Product",
        quantity: item.quantity,
      }));

      const res = await placeOrder(session?.user?.id || null, cartForOrder, {
        ...guestInfo,
        couponCode: appliedCoupon?.code || "",
        shippingCost,
      });

      if (
        res?.success &&
        typeof res?.orderId === "string" &&
        res.orderId.trim().length > 0
      ) {
        const orderId = res.orderId.trim();
        skipEmptyCartRedirectRef.current = true;
        clearCart();
        toast.success(t.checkoutSuccess);
        // Full navigation avoids RSC/client transition bugs that surfaced as root error UI
        // after a successful server action + soft navigation.
        window.location.assign(`/order-confirmation/${encodeURIComponent(orderId)}`);
        return;
      } else {
        setError(res.error || t.orderFailed);
        toast.error(res.error || t.orderFailed);
      }
    } catch (err) {
      const fallback = t.checkoutError || "An error occurred during checkout. Please try again.";
      const msg =
        err instanceof Error && typeof err.message === "string" && err.message.trim()
          ? err.message.trim()
          : fallback;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  const copyWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(`+${bankProofWaDigits}`);
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

  if (!loaded) {
    return (
      <div
        className="flex min-h-[45vh] flex-col items-center justify-center gap-3 text-muted-foreground"
        aria-busy="true"
      >
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
        <p className="text-sm">{t.loading}</p>
      </div>
    );
  }

  if (cartCount === 0) {
    return (
      <motion.div
        className="py-16 text-center sm:py-20"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="mb-6 inline-flex rounded-full bg-muted p-4"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        </motion.div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">{t.cartEmpty}</h2>
        <p className="mb-8 text-muted-foreground">{t.addSomeProducts}</p>
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Link href="/products">
            <Button className="h-11 touch-manipulation bg-amber-500 font-semibold text-black hover:bg-amber-600">
              <ArrowRight
                className={cn(
                  "h-4 w-4 shrink-0",
                  isRTL ? "ms-2" : "me-2 rotate-180"
                )}
              />
              {t.browseProducts}
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(
        "grid grid-cols-1 gap-6 pb-28 sm:gap-8 lg:grid-cols-12 lg:gap-8 lg:pb-0 xl:gap-10",
        isRTL ? "text-right" : "text-left"
      )}
      dir={isRTL ? "rtl" : "ltr"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="min-w-0 space-y-4 sm:space-y-5 lg:col-span-7 xl:col-span-8">
        <Link
          href="/products"
          className={cn(
            "mb-2 inline-flex min-h-10 touch-manipulation items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-amber-600 dark:hover:text-amber-400",
            isRTL && "flex-row-reverse"
          )}
        >
          <ArrowRight
            className={cn("h-4 w-4 shrink-0", !isRTL && "rotate-180")}
          />
          {t.continueShopping}
        </Link>

        <motion.div
          className={cn(panelClass, "mb-2 p-4 sm:p-5")}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div
            className={cn(
              "mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
              isRTL && "sm:flex-row-reverse"
            )}
          >
            <h2 className="text-base font-bold text-foreground sm:text-lg">
              {t.checkoutStepsTitle}
            </h2>
            <span className="text-xs font-medium text-muted-foreground sm:text-sm">
              {t.checkoutStepOf
                .replace("{current}", String(currentStep))
                .replace("{total}", "3")}
            </span>
          </div>
          <div className="grid grid-cols-3 items-start gap-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="relative flex flex-col items-center">
                {step < 3 && (
                  <div
                    className={cn(
                      "absolute top-[18px] h-1 w-[calc(100%-1.5rem)] rounded-full sm:top-5",
                      isRTL
                        ? "right-1/2 -translate-x-4 sm:-translate-x-5"
                        : "left-1/2 translate-x-4 sm:translate-x-5",
                      step < currentStep ? "bg-amber-500" : "bg-muted"
                    )}
                    aria-hidden
                  />
                )}
                <motion.div
                  className={cn(
                    "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:h-10 sm:w-10",
                    step <= currentStep ? "bg-amber-500 text-black" : "bg-muted text-muted-foreground"
                  )}
                  initial={false}
                  animate={{ scale: step === currentStep ? 1.06 : 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                >
                  {step < currentStep ? <Check className="h-4 w-4" /> : step}
                </motion.div>
                <span
                  className={cn(
                    "mt-2 text-center text-[10px] font-medium sm:text-xs",
                    currentStep >= step ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                  )}
                >
                  {step === 1 ? t.stepShippingShort : step === 2 ? t.stepPaymentShort : t.stepReviewShort}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4"
              role="alert"
            >
              <div
                className={cn(
                  "flex items-start gap-3",
                  isRTL && "flex-row-reverse"
                )}
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <p className="min-w-0 flex-1 text-sm text-destructive">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-destructive hover:bg-destructive/15"
                >
                  {t.dismiss}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {currentStep < 3 && (
          <p className="mb-4 text-center text-xs text-muted-foreground lg:hidden">
            {t.checkoutStepOf
              .replace("{current}", String(currentStep))
              .replace("{total}", "3")}
          </p>
        )}

        <AnimatePresence mode="wait">
          {/* Customer Information Step */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              className={cn(panelClass, "mb-6 space-y-4 p-4 sm:p-6")}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <User className="h-5 w-5 shrink-0 text-amber-500" />
                {session?.user ? t.customerInfoTitle : t.guestInfoTitle}
              </h2>

              {savedAddresses.length > 0 && (
                <div className={cn(insetClass, "space-y-2")}>
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {t.savedAddressesTitle}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {savedAddresses.map((addr) => (
                      <Button
                        key={addr.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="touch-manipulation border-amber-500/40 text-foreground hover:bg-amber-500/10"
                        onClick={() => applySavedAddress(addr)}
                      >
                        {addr.label || addr.city}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4 shrink-0 text-amber-500" />
                    {t.fullName} *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className={cn(
                        fieldBase,
                        isRTL ? "text-right" : "text-left",
                        formErrors.name
                          ? "border-destructive"
                          : "border-input"
                      )}
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
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-destructive"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </motion.span>
                    )}
                  </div>
                  {formErrors.name && (
                    <p className="mt-1 text-xs text-destructive">{formErrors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-bold text-amber-500">📱</span>
                    {t.phoneRequiredLabel} *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      className={cn(
                        fieldBase,
                        isRTL ? "text-right" : "text-left",
                        formErrors.phone
                          ? "border-destructive"
                          : "border-input"
                      )}
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
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-destructive"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </motion.span>
                    )}
                  </div>
                  {formErrors.phone && (
                    <p className="mt-1 text-xs text-destructive">{formErrors.phone}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-muted-foreground">📞</span>
                    {t.phoneOptional}{" "}
                    <span className="text-xs opacity-80">({t.optional})</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    className={cn(
                      fieldBase,
                      isRTL ? "text-right" : "text-left",
                      formErrors.phoneAlt
                        ? "border-destructive"
                        : "border-input"
                    )}
                    placeholder="09xxxxxxxx"
                    value={guestInfo.phoneAlt}
                    onChange={(e) => {
                      setGuestInfo({ ...guestInfo, phoneAlt: e.target.value });
                      if (formErrors.phoneAlt) setFormErrors({ ...formErrors, phoneAlt: '' });
                    }}
                  />
                  {formErrors.phoneAlt && (
                    <p className="mt-1 text-xs text-destructive">{formErrors.phoneAlt}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 text-amber-500" />
                    {t.shippingCityLabel} *
                  </label>
                  <div className="relative">
                    <select
                      className={cn(
                        fieldBase,
                        "cursor-pointer appearance-none",
                        isRTL ? "ps-4 pe-10 text-right" : "pe-10 ps-4 text-left",
                        formErrors.city ? "border-destructive" : "border-input"
                      )}
                      value={guestInfo.city}
                      onChange={(e) => {
                        setGuestInfo({ ...guestInfo, city: e.target.value });
                        if (formErrors.city) setFormErrors({ ...formErrors, city: '' });
                      }}
                    >
                      <option value="">{t.selectCity}</option>
                      {shippingOptions.map((city) => (
                        <option key={city.name} value={city.name}>
                          {lang === "ar" ? city.arName || city.name : city.name} ({Number(city.rate || 0).toLocaleString()} {t.currency})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {formErrors.city && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute end-10 top-1/2 -translate-y-1/2 text-destructive"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </motion.span>
                    )}
                  </div>
                  {formErrors.city && (
                    <p className="mt-1 text-xs text-destructive">{formErrors.city}</p>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 text-amber-500" />
                    {t.shippingAddressLabel} *
                  </label>
                  <div className="relative">
                    <textarea
                      rows={3}
                      className={cn(
                        fieldBase,
                        "resize-none",
                        isRTL ? "text-right" : "text-left",
                        formErrors.address
                          ? "border-destructive"
                          : "border-input"
                      )}
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
                        className="absolute end-3 top-3 text-destructive"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </motion.span>
                    )}
                  </div>
                  {formErrors.address && (
                    <p className="mt-1 text-xs text-destructive">{formErrors.address}</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  {t.couponPlaceholder}
                </label>
                <div
                  className={cn(
                    "flex flex-col gap-2 sm:flex-row",
                    isRTL && "sm:flex-row-reverse"
                  )}
                >
                  <Input
                    value={couponDraft}
                    onChange={(e) => setCouponDraft(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyCoupon();
                      }
                    }}
                    placeholder="SAVE10"
                    className="h-11 border-input bg-background uppercase sm:flex-1"
                    disabled={couponBusy}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 shrink-0 touch-manipulation bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-60 sm:min-w-[100px]"
                    onClick={handleApplyCoupon}
                    disabled={couponBusy}
                  >
                    {couponBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t.applyCoupon
                    )}
                  </Button>
                </div>
                {appliedCoupon && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    {t.couponSavedInline}: {appliedCoupon.code} (−
                    {appliedCoupon.percentOff}%)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  {t.deliveryNotes}
                </label>
                <textarea
                  rows={2}
                  className={cn(
                    fieldBase,
                    "resize-none",
                    isRTL ? "text-right" : "text-left",
                    formErrors.orderNotes ? "border-destructive" : "border-input"
                  )}
                  placeholder={t.deliveryNotesPlaceholder}
                  value={guestInfo.orderNotes}
                  onChange={(e) =>
                    setGuestInfo({ ...guestInfo, orderNotes: e.target.value })
                  }
                />
                {formErrors.orderNotes && (
                  <p className="text-xs text-destructive">{formErrors.orderNotes}</p>
                )}
              </div>

              <div
                className={cn(
                  "flex pt-2",
                  isRTL ? "justify-start" : "justify-end"
                )}
              >
                <Button
                  type="button"
                  onClick={handleStep1Next}
                  className="h-11 min-w-[120px] touch-manipulation bg-amber-500 font-semibold text-black hover:bg-amber-600"
                >
                  {lang === "ar" ? "التالي" : "Next"}
                  <ArrowLeft
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isRTL ? "ms-2 rotate-180" : "me-2"
                    )}
                  />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Payment Method Step */}
          {currentStep === 2 && (
            <motion.div 
              key="step2"
              className={cn(panelClass, "mb-6 space-y-4 p-4 sm:p-6")}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <CreditCard className="h-5 w-5 shrink-0 text-amber-500" />
                {t.paymentMethodTitle}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.id}
                    className={cn(
                      "relative min-h-[88px] cursor-pointer rounded-2xl border p-4 transition-all touch-manipulation",
                      guestInfo.paymentMethod === method.id
                        ? "border-amber-500 bg-amber-500/10 shadow-md shadow-amber-500/10"
                        : "border-border bg-muted/20 hover:bg-muted/40"
                    )}
                  >
                    <input 
                      type="radio" 
                      className="sr-only" 
                      name="paymentMethod" 
                      value={method.id}
                      checked={guestInfo.paymentMethod === method.id}
                      onChange={() => setGuestInfo({ ...guestInfo, paymentMethod: method.id })}
                    />
                    <div
                      className={cn(
                        "flex h-full flex-col",
                        isRTL ? "pe-8 text-right" : "ps-8 text-left"
                      )}
                    >
                      <span
                        className={cn(
                          "font-bold transition-colors",
                          guestInfo.paymentMethod === method.id
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-foreground"
                        )}
                      >
                        {lang === "ar" ? method.arName : method.enName}
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {lang === "ar" ? method.arDesc : method.enDesc}
                      </p>
                    </div>
                    {guestInfo.paymentMethod === method.id && (
                      <div
                        className={cn(
                          "absolute top-3 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500",
                          isRTL ? "end-3" : "start-3"
                        )}
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-black" />
                      </div>
                    )}
                  </label>
                ))}
              </div>

              {guestInfo.paymentMethod === "BANK_TRANSFER" && (
                <div
                  className={cn(
                    "space-y-3 rounded-2xl border border-blue-500/25 bg-blue-500/10 p-4 sm:p-5",
                    isRTL ? "text-right" : "text-left"
                  )}
                >
                  <p className="text-xs text-blue-400 font-bold uppercase tracking-wider">{t.bankTransferInstructions}</p>
                  <p className="text-sm text-foreground/90">{t.transferToFollowing}</p>
                  <div className="bg-muted/50 p-3 rounded-lg border border-border text-sm space-y-1">
                    <p>
                      <span className="text-muted-foreground">{t.bankLabel}:</span>{" "}
                      <span className="text-foreground font-medium">
                        {lang === "ar" ? resolvedBankDetails.arBankName : resolvedBankDetails.bankName}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">{t.accountNumberLabel}:</span>{" "}
                      <span className="text-foreground font-mono font-bold">{resolvedBankDetails.accountNumber}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">{t.accountNameLabel}:</span>{" "}
                      <span className="text-foreground font-medium">
                        {lang === "ar" ? resolvedBankDetails.arAccountName : resolvedBankDetails.accountName}
                      </span>
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg border border-border space-y-2">
                    <p className="text-xs text-muted-foreground font-semibold">
                      {lang === "ar" ? "رقم واتساب التأكيد" : "Confirmation WhatsApp"}
                    </p>
                    <p className="text-foreground font-mono font-bold">+{bankProofWaDigits}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={copyWhatsApp}
                        className="h-8 text-xs bg-muted border-border text-foreground hover:bg-muted/70"
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
                  <div className="bg-muted/50 p-3 rounded-lg border border-border space-y-2">
                    <p className="text-xs text-muted-foreground font-semibold">
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
                      className="rounded-md bg-amber-500 px-4 py-2 font-bold text-black hover:bg-amber-600 disabled:opacity-60"
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
                  <p className="text-xs text-muted-foreground italic font-medium">{t.sendScreenshotNotice}</p>
                </div>
              )}
              
              <div
                className={cn(
                  "flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between",
                  isRTL && "sm:flex-row-reverse"
                )}
              >
                <Button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  variant="outline"
                  className="h-11 w-full touch-manipulation border-border sm:w-auto"
                >
                  <ArrowRight
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isRTL ? "ms-2" : "me-2 rotate-180"
                    )}
                  />
                  {lang === "ar" ? "السابق" : "Previous"}
                </Button>
                <Button
                  type="button"
                  onClick={handleStep2Next}
                  className="h-11 w-full touch-manipulation bg-amber-500 font-semibold text-black hover:bg-amber-600 sm:w-auto sm:min-w-[120px]"
                >
                  {lang === "ar" ? "التالي" : "Next"}
                  <ArrowLeft
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isRTL ? "ms-2 rotate-180" : "me-2"
                    )}
                  />
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
              <div className={cn(panelClass, "mb-6 space-y-4 p-4 sm:p-6")}>
                <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <Package className="h-5 w-5 shrink-0 text-amber-500" />
                  {t.reviewProducts}
                </h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className={cn(insetClass, "space-y-2")}>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                      <User className="h-4 w-4 shrink-0" />
                      {t.customerInfoTitle}
                    </h3>
                    <div className="space-y-1 text-xs">
                      <p>
                        <span className="text-muted-foreground">{t.fullName}:</span>{" "}
                        <span className="text-foreground">{guestInfo.name}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          {t.phoneRequiredLabel}:
                        </span>{" "}
                        <span className="text-foreground">{guestInfo.phone}</span>
                      </p>
                      {guestInfo.phoneAlt && (
                        <p>
                          <span className="text-muted-foreground">
                            {t.phoneOptional}:
                          </span>{" "}
                          <span className="text-foreground">
                            {guestInfo.phoneAlt}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={cn(insetClass, "space-y-2")}>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                      <MapPin className="h-4 w-4 shrink-0" />
                      {t.deliveryInfoTitle}
                    </h3>
                    <div className="space-y-1 text-xs">
                      <p>
                        <span className="text-muted-foreground">
                          {t.shippingCityLabel}:
                        </span>{" "}
                        <span className="text-foreground">{guestInfo.city}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          {t.shippingAddressLabel}:
                        </span>{" "}
                        <span className="break-words text-foreground">
                          {guestInfo.address}
                        </span>
                      </p>
                      {guestInfo.orderNotes?.trim() && (
                        <p>
                          <span className="text-muted-foreground">
                            {t.deliveryNotes}:
                          </span>{" "}
                          <span className="break-words text-foreground">
                            {guestInfo.orderNotes.trim()}
                          </span>
                        </p>
                      )}
                      {appliedCoupon && (
                        <p>
                          <span className="text-muted-foreground">
                            {t.couponSavedInline}:
                          </span>{" "}
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {appliedCoupon.code} (−{appliedCoupon.percentOff}%)
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              
              <div className={cn(insetClass, "space-y-1")}>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                  <CreditCard className="h-4 w-4 shrink-0" />
                  {t.paymentMethodShort}
                </h3>
                <p className="text-xs text-foreground">
                  {lang === "ar" 
                    ? PAYMENT_METHODS.find(m => m.id === guestInfo.paymentMethod)?.arName
                    : PAYMENT_METHODS.find(m => m.id === guestInfo.paymentMethod)?.enName
                  }
                </p>
              </div>
              
              <div className={cn("flex", isRTL ? "justify-end" : "justify-start")}>
                <Button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  variant="outline"
                  className="h-11 touch-manipulation border-border"
                >
                  <ArrowRight
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isRTL ? "ms-2" : "me-2 rotate-180"
                    )}
                  />
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
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 px-2">
              <Package className="h-5 w-5 text-amber-500" />
              {lang === "ar" ? "منتجات في السلة" : "Cart Items"}
            </h2>
          )}
          
          {cart.map((item, index) => (
            <motion.div 
              key={item.id} 
              className={cn(
                "rounded-xl border border-border bg-muted/25 p-3 sm:p-4",
                stockIssuesById[item.id] && "border-destructive/40"
              )}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ borderColor: "rgba(245, 158, 11, 0.3)" }}
            >
              <div
                className={cn(
                  "flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center",
                  isRTL && "sm:flex-row-reverse"
                )}
              >
                <div className="relative mx-auto h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:mx-0 sm:h-[72px] sm:w-[72px]">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name || ""}
                      fill
                      className="object-contain p-1"
                      sizes="80px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">
                      📦
                    </div>
                  )}
                </div>

                <div
                  className={cn(
                    "min-w-0 flex-1",
                    isRTL ? "text-right" : "text-left"
                  )}
                >
                  <Link href={`/products/${item.id}`}>
                    <h3 className="line-clamp-2 font-semibold text-foreground transition-colors hover:text-amber-600 dark:hover:text-amber-400">
                      {item.name}
                    </h3>
                  </Link>
                  <p className="mt-1 font-bold text-amber-600 dark:text-amber-400">
                    {item.price.toLocaleString()} {t.currency}
                  </p>
                  {stockIssuesById[item.id] && (
                    <p className="mt-2 text-xs leading-relaxed text-destructive">
                      {formatStockIssue(stockIssuesById[item.id])}
                    </p>
                  )}
                </div>

                <div
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 sm:justify-end",
                    isRTL && "sm:flex-row-reverse"
                  )}
                >
                  {currentStep === 1 ? (
                    <div className="inline-flex items-center rounded-xl border border-input bg-background">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        className="flex min-h-10 min-w-10 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label={t.decreaseQuantity}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-[2rem] px-1 text-center text-sm font-medium tabular-nums text-foreground">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const cap =
                            typeof item.stock === "number"
                              ? item.stock
                              : Number.MAX_SAFE_INTEGER;
                          updateQuantity(
                            item.id,
                            Math.min(cap, item.quantity + 1)
                          );
                        }}
                        disabled={
                          typeof item.stock === "number" &&
                          item.quantity >= item.stock
                        }
                        className="flex min-h-10 min-w-10 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={t.increaseQuantity}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-input bg-muted/40 px-3 py-2">
                      <span className="text-sm font-medium text-foreground">
                        {t.qtyShort}: {item.quantity}
                      </span>
                    </div>
                  )}

                  <div
                    className={cn(
                      "shrink-0 tabular-nums",
                      isRTL ? "text-left" : "text-right"
                    )}
                  >
                    <p className="whitespace-nowrap font-bold text-foreground">
                      {(item.price * item.quantity).toLocaleString()}{" "}
                      {t.currency}
                    </p>
                  </div>

                  {currentStep === 1 && (
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="flex min-h-10 min-w-10 items-center justify-center text-muted-foreground transition-colors hover:text-destructive"
                      aria-label={t.remove}
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

      <motion.div
        className="min-w-0 lg:col-span-5 xl:col-span-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      >
        <motion.div
          className={cn(
            panelClass,
            "space-y-4 p-4 sm:p-6 lg:sticky lg:top-24 xl:top-28"
          )}
          transition={{ duration: 0.3 }}
        >
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Package className="h-5 w-5 shrink-0 text-amber-500" />
            {t.orderSummary}
          </h2>

          <div className="space-y-3">
            <div className={cn(insetClass, "space-y-2")}>
              <div
                className={cn(
                  "flex items-center justify-between gap-2",
                  isRTL && "flex-row-reverse"
                )}
              >
                <span className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {finalTotal.toLocaleString()} {t.currency}
                </span>
                <span className="font-bold text-foreground">{t.grandTotal}</span>
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-3 text-xs">
              <div
                className={cn(
                  "flex justify-between gap-2 text-muted-foreground",
                  isRTL && "flex-row-reverse"
                )}
              >
                <span className="tabular-nums text-foreground">
                  {cartTotal.toLocaleString()} {t.currency}
                </span>
                <span className="min-w-0 text-end">
                  {t.productsTotal} ({cartCount} {t.items})
                </span>
              </div>
              {discountAmount > 0 && (
                <div
                  className={cn(
                    "flex justify-between text-emerald-600 dark:text-emerald-400",
                    isRTL && "flex-row-reverse"
                  )}
                >
                  <span className="tabular-nums">
                    −{discountAmount.toLocaleString()} {t.currency}
                  </span>
                  <span>{t.discountLabel}</span>
                </div>
              )}
              <div
                className={cn(
                  "flex justify-between gap-2 text-muted-foreground",
                  isRTL && "flex-row-reverse"
                )}
              >
                <span className="tabular-nums">
                  {shippingCost > 0
                    ? `${shippingCost.toLocaleString()} ${t.currency}`
                    : "—"}
                </span>
                <span className="max-w-[60%] text-end leading-snug">
                  {t.delivery} ({guestInfo.city || t.cityNotSelected})
                </span>
              </div>
              <div
                className={cn(
                  "flex justify-between gap-2 text-muted-foreground",
                  isRTL && "flex-row-reverse"
                )}
              >
                <span className="tabular-nums text-foreground">
                  {vatAmount.toLocaleString()} {t.currency}
                </span>
                <span className="max-w-[55%] text-end">
                  {isRTL
                    ? `ضريبة القيمة المضافة (${Math.round(CHECKOUT_TAX_RATE * 100)}٪)`
                    : `VAT (${Math.round(CHECKOUT_TAX_RATE * 100)}%)`}
                </span>
              </div>
            </div>
            
            {/* Order Summary Details */}
            {currentStep === 3 && (
              <div className={cn(insetClass, "space-y-2")}>
                <h3 className="mb-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                  {t.orderDetailsQuick}
                </h3>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div
                    className={cn(
                      "flex justify-between gap-2",
                      isRTL && "flex-row-reverse"
                    )}
                  >
                    <span>{t.productsTotal}</span>
                    <span className="tabular-nums">
                      {cartCount} {t.items}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "flex justify-between gap-2",
                      isRTL && "flex-row-reverse"
                    )}
                  >
                    <span>{t.paymentMethodShort}</span>
                    <span className="max-w-[55%] truncate text-end text-foreground">
                      {lang === "ar"
                        ? PAYMENT_METHODS.find(
                            (m) => m.id === guestInfo.paymentMethod
                          )?.arName
                        : PAYMENT_METHODS.find(
                            (m) => m.id === guestInfo.paymentMethod
                          )?.enName}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "flex justify-between gap-2",
                      isRTL && "flex-row-reverse"
                    )}
                  >
                    <span>{t.delivery}</span>
                    <span className="max-w-[55%] truncate text-end text-foreground">
                      {guestInfo.city}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {currentStep === 3 && (
            <details
              className={cn(
                "mb-4 rounded-xl border border-border bg-card p-3 text-card-foreground",
                isRTL && "text-right"
              )}
              open
            >
              <summary className="cursor-pointer text-sm font-semibold text-foreground">
                {t.reviewOrderToggle}
              </summary>
              <ul
                className={cn(
                  "mt-3 space-y-2 border-t border-border pt-3 text-xs text-muted-foreground",
                  isRTL && "text-right"
                )}
              >
                {cart.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      "flex justify-between gap-2",
                      isRTL && "flex-row-reverse"
                    )}
                  >
                    <span className="min-w-0 truncate">{item.name}</span>
                    <span className="shrink-0 tabular-nums text-foreground">
                      ×{item.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div
                  className={cn(
                    "flex flex-col gap-2",
                    isRTL && "text-right"
                  )}
                >
                  <div className={cn("flex items-start gap-2", isRTL && "flex-row-reverse")}>
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0">{error}</span>
                  </div>
                  <p className="text-xs opacity-90">{t.paymentRetryHint}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {currentStep === 3 ? (
            <Button
              type="button"
              onClick={handleCheckout}
              disabled={loading || isProcessing}
              className="hidden h-14 w-full touch-manipulation rounded-xl bg-amber-500 text-base font-semibold text-black hover:bg-amber-600 disabled:opacity-60 lg:inline-flex"
            >
              {isProcessing ? (
                <>
                  <Loader2
                    className={cn(
                      "h-5 w-5 animate-spin shrink-0",
                      isRTL ? "ms-2" : "me-2"
                    )}
                  />
                  {t.placingOrder}
                </>
              ) : (
                <>
                  <Shield
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isRTL ? "ms-2" : "me-2"
                    )}
                  />
                  {t.placeOrderBtn}
                </>
              )}
            </Button>
          ) : (
            <div className="hidden py-2 text-center lg:block">
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t.completeStepsHint}
              </p>
            </div>
          )}

          {!session && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
              <p className="text-center text-xs text-muted-foreground">
                {t.haveAccount}{" "}
                <Link
                  href="/login"
                  className="font-semibold text-amber-600 hover:underline dark:text-amber-400"
                >
                  {t.loginInstead}
                </Link>
              </p>
            </div>
          )}

        </motion.div>
      </motion.div>

      {currentStep === 3 && (
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-4 shadow-lg backdrop-blur-md lg:hidden",
            "pb-[max(1rem,env(safe-area-inset-bottom))]"
          )}
        >
          <div
            className={cn(
              "mx-auto flex max-w-7xl items-center gap-3",
              isRTL && "flex-row-reverse"
            )}
          >
            <div className={cn("min-w-0 flex-1", isRTL && "text-right")}>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t.grandTotal}
              </p>
              <p className="truncate text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {finalTotal.toLocaleString()} {t.currency}
              </p>
            </div>
            <Button
              type="button"
              onClick={handleCheckout}
              disabled={loading || isProcessing}
              className="h-12 min-w-[140px] shrink-0 touch-manipulation bg-amber-500 px-4 font-semibold text-black hover:bg-amber-600 disabled:opacity-60"
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                t.placeOrderBtn
              )}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

