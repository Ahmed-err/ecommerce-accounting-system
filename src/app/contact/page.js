import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, Phone, MapPin, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "اتصل بالمبيعات | باور ستور",
  description: "تواصل مع فريق المبيعات لدينا للطلبات بالجملة أو المستلزمات الكهربائية الاحترافية.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-right" dir="rtl">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">اتصل بالمبيعات</h1>
          <p className="text-gray-400 text-lg">
            هل لديك أسئلة حول الطلبات بالجملة أو معدات كهربائية محددة؟ فريقنا هنا لمساعدتك في تزويد مشروعك بالطاقة.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-8">
              <h2 className="text-xl font-bold text-white">مكاتبنا</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-amber-500/10 p-3 rounded-lg">
                    <MapPin className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">تفضل بزيارتنا</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      ١٢٣ شارع الرياض، الخرطوم، السودان<br />
                      مقابل عفراء مول
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-amber-500/10 p-3 rounded-lg">
                    <Phone className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">اتصل بنا</h3>
                    <p className="text-gray-400 text-sm mt-1 text-left" dir="ltr">+249 123 456 789</p>
                    <p className="text-gray-400 text-sm">الأحد - الخميس، ٨ صباحاً - ٥ مساءً</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-amber-500/10 p-3 rounded-lg">
                    <Mail className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">راسلنا عبر البريد الإلكتروني</h3>
                    <p className="text-gray-400 text-sm mt-1">sales@powerstore.com</p>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                <h3 className="text-white font-semibold mb-4">اتصال سريع</h3>
                <a 
                  href="https://wa.me/249123456789" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                >
                  <MessageCircle className="h-5 w-5" />
                  دعم مبيعات واتساب
                </a>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12">
              <h2 className="text-2xl font-bold text-white mb-8">أرسل لنا رسالة</h2>
              
              <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 mr-1">الاسم الكامل</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none text-right"
                    placeholder="أحمد علي"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 mr-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none text-right"
                    placeholder="ahmed@example.com"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-gray-300 mr-1">الموضوع</label>
                  <select
                    className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none text-right appearance-none"
                  >
                    <option>استفسار عن منتج</option>
                    <option>عرض سعر لطلب بالجملة</option>
                    <option>دعم فني</option>
                    <option>أخرى</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-gray-300 mr-1">الرسالة</label>
                  <textarea
                    required
                    rows={5}
                    className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none resize-none text-right"
                    placeholder="أخبرنا كيف يمكننا مساعدتك..."
                  ></textarea>
                </div>

                <div className="md:col-span-2 pt-4">
                  <Button className="w-full py-6 bg-amber-500 hover:bg-amber-600 text-black font-bold text-lg rounded-xl flex items-center justify-center gap-2 group transition-all">
                    <span>إرسال الرسالة</span>
                    <Send className="h-5 w-5 group-hover:-translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
