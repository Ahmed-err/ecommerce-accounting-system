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
        setError("Please provide your name, email, and shipping address to continue as guest.");
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
      setSuccess(`Order placed! Your order ID: ${res.orderId.slice(-8).toUpperCase()}`);
    } else {
      setError(res.error || "Failed to place order.");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex p-4 bg-emerald-500/10 rounded-full mb-6"><ShoppingBag className="h-10 w-10 text-emerald-400" /></div>
        <h2 className="text-2xl font-bold text-white mb-2">Order Placed Successfully!</h2>
        <p className="text-gray-400 mb-6">{success}</p>
        <Link href="/products">
          <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
            Continue Shopping <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  if (cartCount === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex p-4 bg-white/5 rounded-full mb-6"><ShoppingBag className="h-10 w-10 text-gray-500" /></div>
        <h2 className="text-2xl font-bold text-white mb-2">Your cart is empty</h2>
        <p className="text-gray-400 mb-6">Add some products to get started!</p>
        <Link href="/products">
          <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
            Browse Products <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Cart Items */}
      <div className="lg:col-span-2 space-y-4">
        <Link href="/products" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Continue Shopping
        </Link>

        {/* Guest Details Form */}
        {!session && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs">1</span>
              Guest Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Full Name</label>
                <input
                  type="text"
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500 transition-colors"
                  placeholder="John Doe"
                  value={guestInfo.name}
                  onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Email Address</label>
                <input
                  type="email"
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500 transition-colors"
                  placeholder="john@example.com"
                  value={guestInfo.email}
                  onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">City / Region (Detection for Delivery Rate)</label>
                <select
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500 transition-colors"
                  value={guestInfo.city}
                  onChange={(e) => setGuestInfo({ ...guestInfo, city: e.target.value })}
                >
                  <option value="">Select your city...</option>
                  {SUDAN_CITIES.map(city => (
                    <option key={city.name} value={city.name}>{city.name} (SDG {city.rate})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-gray-400">Shipping Address (Neighborhood/Street/House #)</label>
                <textarea
                  rows={2}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500 transition-colors resize-none"
                  placeholder="e.g. Al-Riyadh, Street 15, House 42"
                  value={guestInfo.address}
                  onChange={(e) => setGuestInfo({ ...guestInfo, address: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-gray-400">Phone Number (Required for confirmation call)</label>
                <input
                  type="text"
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500 transition-colors"
                  placeholder="+249..."
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
            <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs">
              {session ? '1' : '2'}
            </span>
            Payment Method
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
                <div className="flex flex-col h-full">
                  <span className={`font-bold transition-colors ${guestInfo.paymentMethod === method.id ? 'text-amber-500' : 'text-white'}`}>
                    {method.name}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{method.description}</p>
                </div>
                {guestInfo.paymentMethod === method.id && (
                  <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-950" />
                  </div>
                )}
              </label>
            ))}
          </div>

          {guestInfo.paymentMethod === "BANK_TRANSFER" && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2">
              <p className="text-xs text-blue-400 font-bold uppercase tracking-wider">Bank Transfer Instructions</p>
              <p className="text-sm text-gray-300">Please send your payment to the following account:</p>
              <div className="bg-gray-950/50 p-3 rounded-lg border border-white/5 text-sm space-y-1">
                <p><span className="text-gray-500">Bank:</span> <span className="text-white font-medium">{STORE_BANK_DETAILS.bankName}</span></p>
                <p><span className="text-gray-500">Account:</span> <span className="text-white font-mono font-bold">{STORE_BANK_DETAILS.accountNumber}</span></p>
                <p><span className="text-gray-500">Name:</span> <span className="text-white font-medium">{STORE_BANK_DETAILS.accountName}</span></p>
              </div>
              <p className="text-xs text-gray-400 italic">Please send a screenshot of the transfer to our WhatsApp number after placing the order.</p>
            </div>
          )}
        </div>

        <h2 className="text-lg font-bold text-white flex items-center gap-2 px-2">
          {!session && <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs">2</span>}
          Review Order Items
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
            <div className="flex-1 min-w-0">
              <Link href={`/products/${item.id}`}>
                <h3 className="text-white font-semibold truncate hover:text-amber-500 transition-colors">{item.name}</h3>
              </Link>
              <p className="text-amber-500 font-bold mt-1">SDG {item.price.toLocaleString()}</p>
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
            <div className="text-right w-24 shrink-0">
              <p className="text-white font-bold">SDG {(item.price * item.quantity).toLocaleString()}</p>
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
          <h2 className="text-lg font-bold text-white">Order Summary</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Items ({cartCount})</span>
              <span>SDG {cartTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Shipping ({guestInfo.city || 'Choose city'})</span>
              <span>{shippingCost > 0 ? `SDG ${shippingCost.toLocaleString()}` : '—'}</span>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 flex justify-between">
            <span className="text-white font-bold">Total</span>
            <span className="text-amber-500 text-xl font-bold">SDG {finalTotal.toLocaleString()}</span>
          </div>

          {error && <div className="p-3 bg-red-500/20 text-red-400 rounded-md text-sm">{error}</div>}

          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full py-6 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-base rounded-xl"
          >
            {loading ? "Placing Order..." : "Place Order"}
          </Button>

          {!session && (
            <p className="text-xs text-gray-500 text-center">
              Already have an account? <Link href="/login" className="text-amber-500 hover:underline">Log in</Link> instead.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

