import { describe, expect, it } from "vitest";
// @ts-expect-error plain ESM script
import { transformUseT } from "../../../scripts/codemods/use-t.mjs";

const wrap = (body: string, imports = 'import { useLanguage } from "@/context/LanguageContext";\nimport { translations } from "@/lib/translations";') =>
  `"use client";\n${imports}\n\nexport default function C() {\n  const { lang } = useLanguage();\n${body}\n  return t.home;\n}\n`;

describe("transformUseT", () => {
  it("replaces the standard lookup and merges the import", () => {
    const out = transformUseT(wrap("  const t = translations[lang] || translations.en;"));
    expect(out.code).toContain('import { useLanguage, useT } from "@/context/LanguageContext";');
    expect(out.code).toContain("  const t = useT();");
    expect(out.code).not.toContain("@/lib/translations");
    expect(out.manual).toEqual([]);
  });

  it("handles bracket fallbacks and no fallback", () => {
    expect(transformUseT(wrap("  const t = translations[lang] || translations['ar'];")).code).toContain("const t = useT();");
    expect(transformUseT(wrap("  const t = translations[siteLang];")).code).toContain("const t = useT();");
  });

  it("moves translateCategory to its own module", () => {
    const out = transformUseT(wrap("  const t = translations[lang];", 'import { useLanguage } from "@/context/LanguageContext";\nimport { translations, translateCategory } from "@/lib/translations";'));
    expect(out.code).toContain('import { translateCategory } from "@/lib/i18n/translate-category";');
  });

  it("adds a useT import when LanguageContext is not imported", () => {
    const out = transformUseT(wrap("  const t = translations[lang];", 'import { translations } from "@/lib/translations";'));
    expect(out.code).toContain('import { useT } from "@/context/LanguageContext";');
  });

  it("reports other uses for manual review", () => {
    const out = transformUseT(wrap("  const t = translations[lang];\n  const c = translations.en.currency;"));
    expect(out.manual).toEqual(["translations.en.currency"]);
  });

  it("replaces every lookup in files with several components", () => {
    const out = transformUseT(wrap("  const t = translations[lang];\n}\nfunction D() {\n  const { lang } = useLanguage();\n  const t = translations[lang];"));
    expect(out.code.match(/const t = useT\(\);/g)).toHaveLength(2);
    expect(out.manual).toEqual([]);
  });

  it("leaves server files alone", () => {
    const src = 'import { translations } from "@/lib/translations";\nconst t = translations.ar;\n';
    expect(transformUseT(src)).toEqual({ code: src, changed: false, manual: [] });
  });
});
