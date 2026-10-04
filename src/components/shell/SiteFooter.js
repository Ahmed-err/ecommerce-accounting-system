"use client";

import Link from "next/link";
import BrandLockup from "@/components/brand/BrandLockup";
import DeveloperCredit from "@/components/brand/DeveloperCredit";
import { useLanguage, useT } from "@/context/LanguageContext";

export const FOOTER_LINKS = {
  shop: [
    { key: "allProducts", href: "/products" },
    { key: "cart", href: "/cart" },
    { key: "about", href: "/about" },
  ],
  help: [
    { key: "trackOrder", href: "/track-order" },
    { key: "contact", href: "/contact" },
    { key: "privacyPolicy", href: "/privacy" },
    { key: "termsOfService", href: "/terms" },
  ],
};

// Only accounts configured in Admin → Settings are shown.
const SOCIAL = [
  { key: "facebook", label: "socialFacebook", path: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" },
  { key: "instagram", label: "socialInstagram", path: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm5.5-1.5h.01" },
  { key: "whatsapp", label: "socialWhatsapp", path: "M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.1-5.3A8.5 8.5 0 1 1 21 11.5z" },
  { key: "tiktok", label: "socialTiktok", path: "M14 3v11a4 4 0 1 1-4-4M14 3a5 5 0 0 0 5 5" },
];

const linkCls = "text-[15px] text-ink-2 hover:text-accent-text";

function LinkColumn({ title, links, t }) {
  return (
    <nav aria-label={title} className="space-y-3">
      <h2 className="text-[15px] font-bold">{title}</h2>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className={linkCls}>
              {t[l.key]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// Store footer (P0.4, board 6).
export default function SiteFooter() {
  const t = useT();
  const { brandName, contactPhone, contactEmail, contactAddress, social = {} } = useLanguage();
  const year = new Date().getFullYear();
  const socials = SOCIAL.filter((s) => social[s.key]);

  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <BrandLockup variant="full" tone="auto" />
          <p className="text-sm leading-7 text-ink-2">{t.brandDesc}</p>
          {socials.length ? (
            <div className="flex gap-2">
              {socials.map((s) => (
                <a
                  key={s.key}
                  href={social[s.key]}
                  target="_blank"
                  rel="noopener"
                  aria-label={t[s.label]}
                  className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-ink-2 hover:text-accent-text"
                >
                  <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          ) : null}
        </div>
        <LinkColumn title={t.footerShop} links={FOOTER_LINKS.shop} t={t} />
        <LinkColumn title={t.footerHelp} links={FOOTER_LINKS.help} t={t} />
        <div className="space-y-3">
          <h2 className="text-[15px] font-bold">{t.footerContact}</h2>
          <ul className="space-y-2">
            {contactPhone ? (
              <li>
                <a href={`tel:${contactPhone.replace(/[^\d+]/g, "")}`} dir="ltr" className={`${linkCls} font-bold tabular-nums`}>
                  {contactPhone}
                </a>
              </li>
            ) : null}
            {contactEmail ? (
              <li>
                <a href={`mailto:${contactEmail}`} className={linkCls}>
                  {contactEmail}
                </a>
              </li>
            ) : null}
            {contactAddress ? <li className="text-[15px] text-ink-2">{contactAddress}</li> : null}
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>
            © {year} {t.brandWordmark} — {brandName}. {t.allRightsReserved}
          </p>
          <DeveloperCredit />
        </div>
      </div>
    </footer>
  );
}
