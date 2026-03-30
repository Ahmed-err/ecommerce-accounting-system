import { prisma as db } from "@/lib/prisma";
import { sanitizeLegalHtml } from "@/lib/legal-sanitize";
import {
  DEFAULT_TERMS_AR,
  DEFAULT_TERMS_EN,
  DEFAULT_PRIVACY_AR,
  DEFAULT_PRIVACY_EN,
} from "@/lib/legal-defaults";

const FALLBACK = {
  TERMS: { ar: DEFAULT_TERMS_AR, en: DEFAULT_TERMS_EN },
  PRIVACY: { ar: DEFAULT_PRIVACY_AR, en: DEFAULT_PRIVACY_EN },
};

export async function getLegalPageForStore(type) {
  try {
    const row = await Promise.race([
      db.legalPage.findUnique({ where: { type } }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("legal_timeout")), 3000)),
    ]);
    if (row) {
      return {
        contentAr: sanitizeLegalHtml(row.contentAr),
        contentEn: sanitizeLegalHtml(row.contentEn),
        updatedAt: row.updatedAt,
        source: "db",
      };
    }
  } catch {
    /* fallback */
  }
  const fb = FALLBACK[type] || FALLBACK.TERMS;
  return {
    contentAr: sanitizeLegalHtml(fb.ar),
    contentEn: sanitizeLegalHtml(fb.en),
    updatedAt: null,
    source: "default",
  };
}
