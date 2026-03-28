import Link from "next/link";
import { cookies } from "next/headers";
import Image from "next/image";
import { translations } from "@/lib/translations";

export default async function AboutTeaser() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const isRTL = lang === "ar";
  const t = translations[lang] || translations.en;

  return (
    <section className="py-20 bg-muted dark:bg-neutral-950/60 border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-10 items-start ${isRTL ? "direction-rtl" : ""}`}>
          <div className="lg:col-span-1 space-y-5">
            <h2 className="text-3xl font-black uppercase tracking-tighter italic text-foreground">
              {t.aboutTitle}
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              {t.aboutIntro}
            </p>

            <div className="bg-amber-500/10 dark:bg-white/5 border border-amber-500/20 dark:border-white/10 rounded-2xl p-6 space-y-3">
              <p className="text-amber-600 dark:text-amber-500 font-bold">{t.sudanTouch}</p>
              <p className="text-muted-foreground text-sm">{t.sudanTouchDesc}</p>
            </div>

            <div className="space-y-2">
              <p className="text-foreground font-bold">{t.servicesTitle}</p>
              <ul className="space-y-2">
                {t.services.slice(0, 3).map((s, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="mt-2 w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-muted-foreground text-sm leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition-all"
              >
                {t.aboutTitle}
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-6 py-3 bg-foreground/5 border border-border hover:bg-foreground/10 text-foreground font-bold rounded-xl transition-all"
              >
                {t.contactSales}
              </Link>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="relative rounded-2xl overflow-hidden border border-border">
              <Image
                src="https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1400&q=80"
                alt={isRTL ? "ألواح طاقة شمسية" : "Solar panels"}
                width={1200}
                height={700}
                className="w-full h-[300px] sm:h-[340px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="text-white text-xl font-bold">{t.solarPanelTitle}</h3>
                <p className="text-gray-200 text-sm mt-1">{t.solarPanelDesc}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="relative rounded-2xl overflow-hidden border border-border">
                <Image
                  src="https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=900&q=80"
                  alt={isRTL ? "أدوات كهربائية" : "Electrical tools"}
                  width={900}
                  height={600}
                  className="w-full h-[200px] object-cover"
                />
              </div>
              <div className="relative rounded-2xl overflow-hidden border border-border">
                <Image
                  src="https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=900&q=80"
                  alt={isRTL ? "كابلات وأسلاك" : "Cables and wires"}
                  width={900}
                  height={600}
                  className="w-full h-[200px] object-cover"
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6">
              <p className="text-foreground font-bold">{t.locationTitle}</p>
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                {t.locationLine1}
                <br />
                {t.locationLine2}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
