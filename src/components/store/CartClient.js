"use client";

import Link from "next/link";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/store/CartProvider";
import { useSession } from "next-auth/react";
import { placeOrder } from "@/app/actions/catalog";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SUDAN_CITIES, PAYMENT_METHODS, STORE_BANK_DETAILS } from "@/lib/constants";

export default function CartClient() {
  const { cart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount } = useCart();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [guestInfo, setGuestInfo] = useState({ name: "", email: "", phone: "", address: "", city: "", paymentMethod: "CASH_ON_DELIVERY" });
  
  const shippingCost = useMemo(() => {
    const city = SUDAN_CITIES.find(c => c.name === guestInfo.city);
    return city ? city.rate : 0;
  }, [guestInfo.city]);

  const finalTotal = cartTotal + shippingCost;
  const router = useRouter();

  const handleCheckout = async () => {
    // If not logged in, ensure guest info is filled
    if (!session?.user?.id) {
      if (!guestInfo.name || !guestInfo.email || !guestInfo.address) {
        setError("يرجى تقديم الاسم والبريد الإلكتروني وعنوان الشحن للمتابعة كزائر.");
        return;
      }
    }
    
    setLoading(true);
    setError("");

    const res = await placeOrder(session?.user?.id || null, cart, {
      ...guestInfo,
      shippingCost
    });
    if (res.success) {
      clearCart();
      setSuccess(`تم تقديم الطلب! رقم طلبك هو: ${res.orderId.slice(-8).toUpperCase()}`);
    } else {
      setError(res.error || "فشل في تقديم الطلب.");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex p-4 bg-emerald-500/10 rounded-full mb-6"><ShoppingBag className="h-10 w-10 text-emerald-400" /></div>
        <h2 className="text-2xl font-bold text-white mb-2">تم تقديم الطلب بنجاح!</h2>
        <p className="text-gray-400 mb-6">{success}</p>
        <div className="flex flex-col items-center gap-4">
          <Link href="/products">
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              <ArrowRight className="mr-2 h-4 w-4" /> العودة للتسوق
            </Button>
          </Link>
          <p className="text-sm text-gray-500">سنتواصل معك هاتفياً لتأكيد الطلب قريباً.</p>
        </div>
      </div>
    );
  }

  if (cartCount === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex p-4 bg-white/5 rounded-full mb-6"><ShoppingBag className="h-10 w-10 text-gray-500" /></div>
        <h2 className="text-2xl font-bold text-white mb-2">سلة التسوق فارغة</h2>
        <p className="text-gray-400 mb-6">أضف بعض المنتجات لتبدأ التسوق!</p>
        <Link href="/products">
          <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
            <ArrowRight className="mr-2 h-4 w-4" /> تصفح المنتجات
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-right" dir="rtl">
      {/* Cart Items */}
      <div className="lg:col-span-2 space-y-4">
        <Link href="/products" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-4 transition-colors">
          <ArrowRight className="h-4 w-4" /> متابعة التسوق
        </Link>

        {/* Guest Details Form */}
        {!session && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs ml-2">١</span>
              معلومات الزائر
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">الاسم الكامل</label>
                <input
                  type="text"
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500 transition-colors text-right"
                  placeholder="محمد أحمد"
                  value={guestInfo.name}
                  onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">البريد الإلكتروني</label>
                <input
                  type="email"
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500 transition-colors text-right"
                  placeholder="name@example.com"
                  value={guestInfo.email}
                  onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">المدينة / الولاية (لتحديد تكلفة التوصيل)</label>
                <select
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500 transition-colors text-right"
                  value={guestInfo.city}
                  onChange={(e) => setGuestInfo({ ...guestInfo, city: e.target.value })}
                >
                  <option value="">اختر مدينتك...</option>
                  {SUDAN_CITIES.map(city => (
                    <option key={city.name} value={city.name}>{city.name} ({city.rate.toLocaleString()} ج.س)</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-gray-400">عنوان الشحن (الحي/الشارع/رقم المنزل)</label>
                <textarea
                  rows={2}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500 transition-colors resize-none text-right"
                  placeholder="مثال: الرياض، شارع ١٥، منزل ٤٢"
                  value={guestInfo.address}
                  onChange={(e) => setGuestInfo({ ...guestInfo, address: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-gray-400">رقم الهاتف (مطلوب للاتصال وتأكيد الطلب)</label>
                <input
                  type="text"
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500 transition-colors text-right"
                  placeholder="09..."
                  value={guestInfo.phone}
                  onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Payment Method */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs ml-2">
              {session ? '١' : '٢'}
            </span>
            طريقة الدفع
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
                <div className="flex flex-col h-full text-right">
                  <span className={`font-bold transition-colors ${guestInfo.paymentMethod === method.id ? 'text-amber-500' : 'text-white'}`}>
                    {method.arName || method.name}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{method.arDescription || method.description}</p>
                </div>
                {guestInfo.paymentMethod === method.id && (
                  <div className="absolute top-3 left-3 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-950" />
                  </div>
                )}
              </label>
            ))}
          </div>

          {guestInfo.paymentMethod === "BANK_TRANSFER" && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2 text-right">
              <p className="text-xs text-blue-400 font-bold uppercase tracking-wider">تعليمات التحويل البنكي</p>
              <p className="text-sm text-gray-300">يرجى تحويل مبلغ الطلب إلى الحساب التالي:</p>
              <div className="bg-gray-950/50 p-3 rounded-lg border border-white/5 text-sm space-y-1">
                <p><span className="text-gray-500">البنك:</span> <span className="text-white font-medium">{STORE_BANK_DETAILS.bankName}</span></p>
                <p><span className="text-gray-500">رقم الحساب:</span> <span className="text-white font-mono font-bold">{STORE_BANK_DETAILS.accountNumber}</span></p>
                <p><span className="text-gray-500">الاسم:</span> <span className="text-white font-medium">{STORE_BANK_DETAILS.accountName}</span></p>
              </div>
              <p className="text-xs text-gray-400 italic font-medium">يرجى إرسال لقطة شاشة للعملية عبر الواتساب مع إرفاق رقم الطلب.</p>
            </div>
          )}
        </div>

        <h2 className="text-lg font-bold text-white flex items-center gap-2 px-2">
          {!session && <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs ml-2">٣</span>}
          مراجعة المنتجات
        </h2>

        {cart.map((item) => (
          <div key={item.id} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
            {/* Image */}
            <div className="h-20 w-20 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
              {item.image ? (
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl opacity-30">📦</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-right">
              <Link href={`/products/${item.id}`}>
                <h3 className="text-white font-semibold truncate hover:text-amber-500 transition-colors">{item.name}</h3>
              </Link>
              <p className="text-amber-500 font-bold mt-1">{item.price.toLocaleString()} ج.س</p>
            </div>

            {/* Quantity */}
            <div className="flex items-center bg-gray-800 border border-white/10 rounded-lg">
              <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 text-gray-400 hover:text-white">
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-8 text-center text-sm text-white font-medium">{item.quantity}</span>
              <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 text-gray-400 hover:text-white">
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {/* Subtotal */}
            <div className="text-left w-32 shrink-0">
              <p className="text-white font-bold">{(item.price * item.quantity).toLocaleString()} ج.س</p>
            </div>

            {/* Remove */}
            <button onClick={() => removeFromCart(item.id)} className="p-2 text-gray-500 hover:text-red-400 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-1">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 sticky top-24 space-y-4">
          <h2 className="text-lg font-bold text-white">ملخص الطلب</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span className="text-amber-500 font-bold">{finalTotal.toLocaleString()} ج.س</span>
              <span className="text-white font-bold">الإجمالي الكلي</span>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 space-y-2 text-xs text-gray-500">
             <div className="flex justify-between">
               <span>{cartTotal.toLocaleString()} ج.س</span>
               <span>إجمالي المنتجات ({cartCount})</span>
             </div>
             <div className="flex justify-between">
               <span>{shippingCost > 0 ? `${shippingCost.toLocaleString()} ج.س` : '—'}</span>
               <span>التوصيل ({guestInfo.city || 'لم يتم اختيار المدينة'})</span>
             </div>
          </div>

          {error && <div className="p-3 bg-red-500/20 text-red-400 rounded-md text-sm">{error}</div>}

          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full py-6 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-base rounded-xl"
          >
            {loading ? "جاري تقديم الطلب..." : "إتمام الطلب"}
          </Button>

          {!session && (
            <p className="text-xs text-gray-500 text-center">
              هل لديك حساب؟ <Link href="/login" className="text-amber-500 hover:underline">سجل الدخول</Link> بدلاً من ذلك.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

