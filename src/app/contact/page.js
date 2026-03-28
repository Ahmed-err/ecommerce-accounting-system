import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactFormClient from "@/components/ContactFormClient";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { STORE_WHATSAPP_NUMBER } from "@/lib/constants";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  return {
    title: t.contactSalesTitle + " | " + t.brandName,
    description: t.contactSalesDesc,
  };
}

export default async function ContactPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];

  return (
    <main className={`min-h-screen bg-background ${lang === 'ar' ? 'text-right' : 'text-left'}`} dir={lang === "ar" ? "rtl" : "ltr"}>
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">{t.contactSalesTitle}</h1>
          <p className="text-gray-400 text-lg">
            {t.contactSalesDesc}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-8">
              <h2 className="text-xl font-bold text-white">{t.ourOffices}</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-amber-500/10 p-3 rounded-lg">
                    <MapPin className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{t.visitUs}</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      {t.addressLine1}<br />
                      {t.addressLine2}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-amber-500/10 p-3 rounded-lg">
                    <Phone className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{t.callUs}</h3>
                    <p className="text-gray-400 text-sm mt-1 text-left" dir="ltr">
                      {t.salesPhone}
                    </p>
                    <p className="text-gray-400 text-sm mt-1 text-left" dir="ltr">
                      {t.secondSalesPhone}
                    </p>
                    <p className="text-gray-400 text-sm">{t.workingHours}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-amber-500/10 p-3 rounded-lg">
                    <Mail className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{t.emailUs}</h3>
                    <p className="text-gray-400 text-sm mt-1">{t.businessEmail}</p>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                <h3 className="text-white font-semibold mb-4">{t.quickContact}</h3>
                <a 
                  href={`https://wa.me/${STORE_WHATSAPP_NUMBER}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                >
                  <MessageCircle className="h-5 w-5" />
                  {t.whatsappSales}
                </a>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <ContactFormClient />
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
