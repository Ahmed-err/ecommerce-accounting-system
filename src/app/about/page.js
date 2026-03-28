import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { cookies } from "next/headers";
import Image from "next/image";
import { translations } from "@/lib/translations";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  return {
    title: t.about + " | " + t.brandName,
    description: t.brandDesc,
  };
}

const SOLAR_IMAGE =
  "https://placehold.co/900x600/png?text=Solar+Panels";
const ELECTRICAL_IMAGE_1 =
  "https://placehold.co/900x600/png?text=Electrical+Tools";
const ELECTRICAL_IMAGE_2 =
  "https://placehold.co/900x600/png?text=Cables+%26+Wires";
const ELECTRICAL_IMAGE_3 =
  "https://placehold.co/900x600/png?text=Switches+%26+Sockets";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];

  return (
    <main
      className={`min-h-screen bg-background ${
        lang === "ar" ? "text-right font-arabic" : "text-left"
      }`}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-14">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            {t.aboutTitle}
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            {t.aboutIntro}
          </p>
        </div>

        {/* About + Location */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-7 sm:p-10">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">
                {t.businessName}
              </h2>
              <p className="text-gray-300 leading-relaxed">
                {t.businessDescription}
              </p>
              <p className="text-gray-400 leading-relaxed">
                {t.businessServicesOverview}
              </p>
            </div>

            <div className="mt-8">
              <h3 className="text-white font-semibold mb-4">
                {t.servicesTitle}
              </h3>
              <ul className={`space-y-3 ${lang === "ar" ? "list-none" : "list-disc"} pl-0`}>
                {t.services.map((s, idx) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <span className="mt-1 w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-gray-300">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-7 sm:p-10">
            <h3 className="text-white font-semibold mb-4">
              {t.locationTitle}
            </h3>
            <div className="space-y-3 text-gray-300 text-sm leading-relaxed">
              <p>{t.locationLine1}</p>
              <p>{t.locationLine2}</p>
            </div>

            {/* Sudan touch block */}
            <div className="mt-8 bg-gray-900/40 border border-white/10 rounded-2xl p-4">
              <p className="text-amber-500 font-bold text-sm">
                {t.sudanTouch}
              </p>
              <p className="text-gray-400 text-xs mt-2">{t.sudanTouchDesc}</p>
            </div>
          </div>
        </div>

        {/* Images: Solar + Electrical tools */}
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">
              {t.mediaTitle}
            </h2>
            <p className="text-gray-400 mt-2">{t.mediaDesc}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="relative rounded-3xl overflow-hidden border border-white/10">
              <Image
                src={SOLAR_IMAGE}
                alt={lang === "ar" ? "صور الطاقة الشمسية" : "Solar panels image"}
                width={900}
                height={600}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 p-6">
                <h3 className="text-white text-lg font-bold">
                  {t.solarPanelTitle}
                </h3>
                <p className="text-gray-200 text-sm mt-1">
                  {t.solarPanelDesc}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="relative rounded-3xl overflow-hidden border border-white/10">
                <Image
                  src={ELECTRICAL_IMAGE_1}
                  alt={lang === "ar" ? "أدوات كهربائية متنوعة" : "Electrical tools collage"}
                  width={900}
                  height={600}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 p-6">
                  <h3 className="text-white text-lg font-bold">
                    {t.electricalToolsTitle}
                  </h3>
                  <p className="text-gray-200 text-sm mt-1">
                    {t.electricalToolsDesc}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[ELECTRICAL_IMAGE_2, ELECTRICAL_IMAGE_3].map((src, i) => (
                  <div
                    key={i}
                    className="relative rounded-2xl overflow-hidden border border-white/10"
                    style={{ aspectRatio: "1 / 1" }}
                  >
                    <Image
                      src={src}
                      alt={lang === "ar" ? "تفاصيل أدوات كهربائية" : "Electrical tools detail"}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
                <div
                  className="relative rounded-2xl overflow-hidden border border-white/10"
                  style={{ aspectRatio: "1 / 1", background: "rgba(255,255,255,0.05)" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Short */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-7 sm:p-10">
          <h2 className="text-2xl font-bold text-white mb-2">{t.contactShortTitle}</h2>
          <p className="text-gray-400">
            {t.contactShortDesc}
          </p>

          <div className={`mt-6 grid grid-cols-1 md:grid-cols-3 gap-4`}>
            <div className="rounded-2xl border border-white/10 bg-gray-900/40 p-4">
              <p className="text-amber-500 font-bold text-sm">{t.salesPhoneLabel}</p>
              <p className="text-gray-200 font-mono text-sm mt-1">{t.salesPhone}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-gray-900/40 p-4">
              <p className="text-amber-500 font-bold text-sm">{t.supportPhoneLabel}</p>
              <p className="text-gray-200 font-mono text-sm mt-1">{t.supportPhone}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-gray-900/40 p-4">
              <p className="text-amber-500 font-bold text-sm">{t.secondSalesPhoneLabel}</p>
              <p className="text-gray-200 font-mono text-sm mt-1">{t.secondSalesPhone}</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

