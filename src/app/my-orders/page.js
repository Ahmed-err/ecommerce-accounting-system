import { auth } from "@/auth";
import { getUserOrders } from "@/app/actions/catalog";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Package, Calendar, ChevronRight, AlertCircle } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = {
  title: "طلباتي | باور ستور",
};

export default async function MyOrdersPage() {
  const session = await auth();
  
  if (!session) {
    redirect("/login");
  }

  const orders = await getUserOrders(session.user.id);

  return (
    <main className="min-h-screen bg-gray-950 text-right" dir="rtl">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-4 mb-10">
          <div className="bg-amber-500/10 p-3 rounded-2xl">
            <Package className="h-8 w-8 text-amber-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">طلباتي</h1>
            <p className="text-gray-400">تتبع وإدارة سجل طلباتك</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center space-y-4">
            <div className="inline-flex items-center justify-center p-4 bg-white/5 rounded-full mb-2">
              <AlertCircle className="h-10 w-10 text-gray-500" />
            </div>
            <h2 className="text-xl font-bold text-white">لم يتم العثور على طلبات</h2>
            <p className="text-gray-400 max-w-xs mx-auto">
              لم تقم بتقديم أي طلبات بعد. ابدأ التسوق لرؤية طلباتك هنا!
            </p>
            <div className="pt-4">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition-all"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                ابدأ التسوق
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div 
                key={order.id} 
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group"
              >
                <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 bg-white/[0.02]">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">رقم الطلب</p>
                    <p className="text-lg font-mono text-white">#{order.id.slice(-8).toUpperCase()}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mt-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(order.createdAt).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-start justify-between sm:justify-center gap-2">
                    <div className="text-right pb-1">
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest sm:block hidden">المبلغ الإجمالي</p>
                      <p className="text-2xl font-bold text-amber-500">{order.totalAmount.toLocaleString()} ج.س</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      order.status === 'DELIVERED' ? 'bg-emerald-500/10 text-emerald-500' :
                      order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500' :
                      'bg-amber-500/10 text-amber-500'
                    }`}>
                      {order.status === 'DELIVERED' ? 'تم التوصيل' :
                       order.status === 'CANCELLED' ? 'ملغي' :
                       order.status === 'PENDING' ? 'قيد الانتظار' : order.status}
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-4">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">المنتجات المطلوبة</p>
                  <div className="space-y-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 group/item">
                        <div className="h-16 w-16 bg-gray-900 border border-white/5 rounded-lg overflow-hidden flex-shrink-0">
                          {item.product?.images?.[0] ? (
                            <img src={item.product.images[0]} alt={item.product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xl">📦</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link href={`/products/${item.productId}`}>
                            <h4 className="text-white font-semibold truncate group-hover/item:text-amber-500 transition-colors">
                              {item.product?.name || "منتج محذوف"}
                            </h4>
                          </Link>
                          <p className="text-sm text-gray-500">
                            {item.quantity} × {item.price.toLocaleString()} ج.س
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="text-sm text-white font-bold">
                            {(item.price * item.quantity).toLocaleString()} ج.س
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {order.paymentMethod === 'BANK_TRANSFER' && !order.isVerified && (
                  <div className="px-6 py-4 bg-blue-500/10 border-t border-blue-500/20">
                    <p className="text-xs text-blue-400 font-medium flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                       بانتظار التحقق من التحويل البنكي. يرجى التأكد من إرسال لقطة الشاشة إلى واتساب الخاص بنا.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
