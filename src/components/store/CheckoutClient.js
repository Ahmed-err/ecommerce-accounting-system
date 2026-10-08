"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ShoppingBag, ArrowRight, ArrowLeft, AlertTriangle, Check, Loader2, User, MapPin, CreditCard, Package, Shield, Smartphone, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/store/CartProvider";
import { useSession } from "next-auth/react";
import { placeOrder } from "@/app/actions/catalog";
import { validateCartStock } from "@/app/actions/cart";
import { listUserAddresses } from "@/app/actions/addresses";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLanguage, useT } from "@/context/LanguageContext";
import {
  PAYMENT_METHODS,
  STORE_BANK_DETAILS,
  resolveBankTransferProofWhatsapp,
} from "@/lib/constants";
import { UploadButton } from "@/lib/uploader";
import { checkoutShippingSchema } from "@/lib/schemas/checkout";
import { cn } from "@/lib/utils";
import ProductImage from "@/components/media/ProductImage";

const panelClass =
  "rounded-2xl border border-border bg-card text-card-foreground shadow-sm";
const fieldBase =
  "w-full rounded-xl border bg-background px-3 py-2.5 text-foreground transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/25 focus-visible:outline-none sm:py-3";
const insetClass = "rounded-xl border border-border bg-muted/30 p-3 sm:p-4";

function ReviewRow({ label, children }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted-foreground">{label}:</dt>
      <dd className="min-w-0 break-words text-foreground">{children}</dd>
    </div>
  );
}

export default function CheckoutClient({ shippingOptions, proofWhatsappDigits = null, bankTransferDetails = null }) {
  const { lang, isRTL, brandName } = useLanguage();
  const t = useT();
  const {
    cart,
    clearCart,
    cartTotal,
    cartCount,
    loaded,
    appliedCoupon,
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
  });
  const [savedAddresses, setSavedAddresses] = useState([]);
  const defaultAddressAppliedRef = useRef(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [stockValidation, setStockValidation] = useState({ valid: true, issues: [] });

  const selectedCity = useMemo(
    () =>
      shippingOptions.find(
        (c) => String(c.name || "").toLowerCase() === String(guestInfo.city || "").toLowerCase()
      ) || null,
    [guestInfo.city, shippingOptions]
  );
  const shippingCost = selectedCity ? Number(selectedCity.rate || 0) : 0;
  const cityLabel = selectedCity
    ? lang === "ar"
      ? selectedCity.arName || selectedCity.name
      : selectedCity.name
    : "";

  const discountAmount = useMemo(() => {
    if (!appliedCoupon?.percentOff) return 0;
    return Math.min(
      cartTotal,
      Math.round(cartTotal * (appliedCoupon.percentOff / 100) * 100) / 100
    );
  }, [appliedCoupon, cartTotal]);

  const afterDiscount = Math.max(0, Math.round((cartTotal - discountAmount) * 100) / 100);
  const finalTotal = Math.round((afterDiscount + shippingCost) * 100) / 100;
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
    // The server rejects a bank transfer without a receipt; say so here, not at the last step.
    if (guestInfo.paymentMethod === "BANK_TRANSFER" && !guestInfo.transferScreenshotUrl) {
      setError(t.transferProofRequired);
      return;
    }
    setError("");
    setCurrentStep(3);
  };

  const paymentMethod = PAYMENT_METHODS.find((m) => m.id === guestInfo.paymentMethod);
  const paymentMethodName = paymentMethod ? (lang === "ar" ? paymentMethod.arName : paymentMethod.enName) : "";
  const ForwardArrow = isRTL ? ArrowLeft : ArrowRight;
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  if (!loaded) {
    return (
      <div
        className="flex min-h-[45vh] flex-col items-center justify-center gap-3 text-muted-foreground"
        aria-busy="true"
      >
        <Loader2 className="h-10 w-10 animate-spin text-accent-text" />
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
              <BackArrow className="h-4 w-4 shrink-0" />
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
            "mb-2 inline-flex min-h-10 touch-manipulation items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-accent-text dark:hover:text-amber-400"
          )}
        >
          <BackArrow className="h-4 w-4 shrink-0" />
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
              "mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
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
                    currentStep >= step ? "font-semibold text-accent-text dark:text-amber-400" : "text-muted-foreground"
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
                  "flex items-start gap-3"
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
                <User className="h-5 w-5 shrink-0 text-accent-text" />
                {t.deliveryDetailsTitle}
              </h2>

              {savedAddresses.length > 0 && (
                <div className={cn(insetClass, "space-y-2")}>
                  <p className="text-sm font-semibold text-accent-text dark:text-amber-400">
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
                    <User className="h-4 w-4 shrink-0 text-accent-text" />
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
                    <Smartphone className="h-4 w-4 shrink-0 text-accent-text" />
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
                    <Phone className="h-4 w-4 shrink-0 text-accent-text" />
                    {t.phoneOptional}{" "}
                    <span className="text-xs opacity-80">{t.optional}</span>
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
                    <MapPin className="h-4 w-4 shrink-0 text-accent-text" />
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
                    <MapPin className="h-4 w-4 shrink-0 text-accent-text" />
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
                className="flex justify-end pt-2"
              >
                <Button
                  type="button"
                  onClick={handleStep1Next}
                  className="h-11 min-w-[120px] touch-manipulation bg-amber-500 font-semibold text-black hover:bg-amber-600"
                >
                  {lang === "ar" ? "التالي" : "Next"}
                  <ForwardArrow className="h-4 w-4 shrink-0" />
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
                <CreditCard className="h-5 w-5 shrink-0 text-accent-text" />
                {t.paymentMethodTitle}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.id}
                    className={cn(
                      "relative min-h-[88px] cursor-pointer rounded-2xl border p-4 transition-all touch-manipulation",
                      guestInfo.paymentMethod === method.id
                        ? "border-amber-500 bg-amber-500/10 shadow-md"
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
                            ? "text-accent-text dark:text-amber-400"
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
                <div className={cn(insetClass, "space-y-3")}>
                  <p className="text-sm font-semibold text-accent-text dark:text-amber-400">
                    {t.bankTransferInstructions}
                  </p>
                  <p className="text-sm text-foreground/90">{t.transferToFollowing}</p>
                  <dl className="space-y-1 rounded-lg border border-border bg-card p-3 text-sm">
                    <ReviewRow label={t.bankLabel}>
                      {lang === "ar" ? resolvedBankDetails.arBankName : resolvedBankDetails.bankName}
                    </ReviewRow>
                    <ReviewRow label={t.accountNumberLabel}>
                      <span dir="ltr" className="font-mono font-bold">
                        {resolvedBankDetails.accountNumber}
                      </span>
                    </ReviewRow>
                    <ReviewRow label={t.accountNameLabel}>
                      {lang === "ar" ? resolvedBankDetails.arAccountName : resolvedBankDetails.accountName}
                    </ReviewRow>
                  </dl>
                  <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                    <p className="text-xs font-semibold text-muted-foreground">{t.confirmationWhatsapp}</p>
                    <p className="font-mono font-bold text-foreground">
                      <span dir="ltr">+{bankProofWaDigits}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={copyWhatsApp}
                        className="h-8 border-border bg-muted text-xs text-foreground hover:bg-muted/70"
                      >
                        {copiedWhatsApp
                          ? (lang === "ar" ? "تم النسخ" : "Copied")
                          : (lang === "ar" ? "نسخ الرقم" : "Copy number")}
                      </Button>
                      <a
                        href={`${whatsappUrl}?text=${whatsappMessage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center rounded-md bg-emerald-600 px-3 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
                      >
                        {lang === "ar" ? "فتح واتساب" : "Open WhatsApp"}
                      </a>
                    </div>
                  </div>
                  <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                    <p className="text-xs font-semibold text-muted-foreground">{t.transferProofLabel} *</p>
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
                          setError("");
                        }
                      }}
                      onUploadError={(uploadErr) => {
                        setError(uploadErr.message || (lang === "ar" ? "فشل الرفع" : "Upload failed"));
                      }}
                    />
                    {guestInfo.transferScreenshotUrl && (
                      <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <Check className="h-4 w-4 shrink-0" />
                        {t.transferProofUploaded}
                        <a
                          href={guestInfo.transferScreenshotUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2"
                        >
                          {t.transferProofView}
                        </a>
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{t.sendScreenshotNotice}</p>
                </div>
              )}
              
              <div
                className={cn(
                  "flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"
                )}
              >
                <Button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  variant="outline"
                  className="h-11 w-full touch-manipulation border-border sm:w-auto"
                >
                  <BackArrow className="h-4 w-4 shrink-0" />
                  {lang === "ar" ? "السابق" : "Previous"}
                </Button>
                <Button
                  type="button"
                  onClick={handleStep2Next}
                  className="h-11 w-full touch-manipulation bg-amber-500 font-semibold text-black hover:bg-amber-600 sm:w-auto sm:min-w-[120px]"
                >
                  {lang === "ar" ? "التالي" : "Next"}
                  <ForwardArrow className="h-4 w-4 shrink-0" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Review Order Step */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              className={cn(panelClass, "mb-6 space-y-4 p-4 sm:p-6")}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Package className="h-5 w-5 shrink-0 text-accent-text" />
                {t.checkoutReviewTitle}
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className={cn(insetClass, "space-y-2")}>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-accent-text dark:text-amber-400">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {t.deliveryDetailsTitle}
                  </h3>
                  <dl className="space-y-1 text-sm">
                    <ReviewRow label={t.fullName}>{guestInfo.name}</ReviewRow>
                    <ReviewRow label={t.reviewPhoneLabel}>
                      <span dir="ltr">
                        {guestInfo.phoneAlt ? `${guestInfo.phone} / ${guestInfo.phoneAlt}` : guestInfo.phone}
                      </span>
                    </ReviewRow>
                    <ReviewRow label={t.reviewCityLabel}>{cityLabel}</ReviewRow>
                    <ReviewRow label={t.reviewAddressLabel}>{guestInfo.address}</ReviewRow>
                    {guestInfo.orderNotes?.trim() && (
                      <ReviewRow label={t.deliveryNotes}>{guestInfo.orderNotes.trim()}</ReviewRow>
                    )}
                  </dl>
                </div>
                <div className={cn(insetClass, "space-y-2")}>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-accent-text dark:text-amber-400">
                    <CreditCard className="h-4 w-4 shrink-0" />
                    {t.paymentMethodShort}
                  </h3>
                  <p className="text-sm text-foreground">{paymentMethodName}</p>
                  {guestInfo.paymentMethod === "BANK_TRANSFER" && guestInfo.transferScreenshotUrl && (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <Check className="h-4 w-4 shrink-0" />
                      {t.transferProofUploaded}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-start">
                <Button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  variant="outline"
                  className="h-11 touch-manipulation border-border"
                >
                  <BackArrow className="h-4 w-4 shrink-0" />
                  {lang === "ar" ? "السابق" : "Previous"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <div className="min-w-0 lg:col-span-5 xl:col-span-4">
        <div className={cn(panelClass, "space-y-4 p-4 sm:p-6 lg:sticky lg:top-24 xl:top-28")}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Package className="h-5 w-5 shrink-0 text-accent-text" />
              {t.orderSummary}
            </h2>
            <Link
              href="/cart"
              className="inline-flex min-h-10 items-center text-sm font-medium text-accent-text hover:underline dark:text-amber-400"
            >
              {t.editCart}
            </Link>
          </div>

          <ul className="space-y-3">
            {cart.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-white">
                  <ProductImage src={item.image} alt={item.name || ""} sizes="48px" compact />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm leading-snug text-foreground">{item.name}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {t.qtyShort}: {item.quantity}
                  </p>
                  {stockIssuesById[item.id] && (
                    <p className="mt-1 text-xs leading-relaxed text-destructive">
                      {formatStockIssue(stockIssuesById[item.id])}
                    </p>
                  )}
                </div>
                <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">
                  {(item.price * item.quantity).toLocaleString()} {t.currency}
                </span>
              </li>
            ))}
          </ul>

          <dl className="space-y-2 border-t border-border pt-3 text-sm">
            <div className="flex justify-between gap-2 text-muted-foreground">
              <dt>
                {t.productsTotal} ({cartCount} {t.items})
              </dt>
              <dd className="shrink-0 tabular-nums text-foreground">
                {cartTotal.toLocaleString()} {t.currency}
              </dd>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between gap-2 text-emerald-600 dark:text-emerald-400">
                <dt>
                  {t.discountLabel} ({appliedCoupon.code})
                </dt>
                <dd className="shrink-0 tabular-nums">
                  −{discountAmount.toLocaleString()} {t.currency}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-2 text-muted-foreground">
              <dt className="min-w-0">
                {t.delivery}
                {cityLabel ? ` (${cityLabel})` : ""}
              </dt>
              <dd className="shrink-0 tabular-nums text-foreground">
                {selectedCity ? `${shippingCost.toLocaleString()} ${t.currency}` : t.cityNotSelected}
              </dd>
            </div>
          </dl>

          <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
            <span className="font-bold text-foreground">{t.grandTotal}</span>
            <span className="text-lg font-bold tabular-nums text-accent-text dark:text-amber-400">
              {finalTotal.toLocaleString()} {t.currency}
            </span>
          </div>

          {currentStep === 3 ? (
            <Button
              type="button"
              onClick={handleCheckout}
              disabled={loading || isProcessing}
              className="hidden h-14 w-full touch-manipulation gap-2 rounded-xl bg-amber-500 text-base font-semibold text-black hover:bg-amber-600 disabled:opacity-60 lg:inline-flex"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                  {t.placingOrder}
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5 shrink-0" />
                  {t.placeOrderBtn}
                </>
              )}
            </Button>
          ) : (
            <p className="hidden py-2 text-center text-xs leading-relaxed text-muted-foreground lg:block">
              {t.completeStepsHint}
            </p>
          )}

          {!session && (
            <p className="rounded-xl border border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
              {t.haveAccount}{" "}
              <Link
                href="/login"
                className="font-semibold text-accent-text hover:underline dark:text-amber-400"
              >
                {t.loginInstead}
              </Link>
            </p>
          )}
        </div>
      </div>

      {currentStep === 3 && (
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-4 shadow-lg backdrop-blur-md lg:hidden",
            "pb-[max(1rem,env(safe-area-inset-bottom))]"
          )}
        >
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t.grandTotal}
              </p>
              <p className="truncate text-lg font-bold tabular-nums text-accent-text dark:text-amber-400">
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

