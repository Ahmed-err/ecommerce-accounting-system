import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import en from "@/lib/i18n/en";

const ctx = {
  lang: "en",
  isRTL: false,
  brandName: "Essam El-Din Nasr Electrical Tools",
  contactPhone: "+249900000000",
  contactEmail: "",
  contactAddress: null,
  social: { facebook: "https://facebook.com/himmat", instagram: null, whatsapp: "https://wa.me/249900000000", tiktok: null },
};
vi.mock("@/context/LanguageContext", () => ({ useLanguage: () => ctx, useT: () => en }));

import SiteFooter, { FOOTER_LINKS } from "@/components/shell/SiteFooter";

const APP = path.resolve(__dirname, "../../../src/app");
const routeExists = (href: string) => {
  const p = href === "/" ? "" : href.slice(1);
  return [path.join(APP, "(store)", p, "page.js"), path.join(APP, p, "page.js")].some((f) => fs.existsSync(f));
};

describe("SiteFooter", () => {
  it("links only to pages that exist", () => {
    for (const { href } of [...FOOTER_LINKS.shop, ...FOOTER_LINKS.help]) expect(routeExists(href), href).toBe(true);
  });

  it("renders only configured social links, labelled, in a new tab", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "Facebook" })).toHaveAttribute("href", "https://facebook.com/himmat");
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("target", "_blank");
    expect(screen.queryByRole("link", { name: "Instagram" })).toBeNull();
    expect(document.querySelector('a[href=""]')).toBeNull();
    expect(document.body.innerHTML).not.toMatch(/https:\/\/(twitter|linkedin)\.com"/);
  });

  it("hides empty contact rows and keeps the developer credit", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "+249900000000" })).toHaveAttribute("href", "tel:+249900000000");
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(screen.getByRole("link", { name: /Sarmadax/ })).toHaveAttribute("href", "https://sarmadax.com");
  });

  it("has no duplicate links", () => {
    render(<SiteFooter />);
    const hrefs = [...document.querySelectorAll("footer nav a")].map((a) => a.getAttribute("href"));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
