import { beforeEach, describe, expect, it, vi } from "vitest";

const store: Record<string, unknown> = {};
vi.mock("@/lib/settings", () => ({ getOrCreateStoreSettings: vi.fn(async () => store) }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import { fetchStoreBranding } from "@/lib/branding";

describe("fetchStoreBranding", () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  it("trims names and falls back when blank", async () => {
    Object.assign(store, { nameAr: "   ", nameEn: " Shop " });
    const b = await fetchStoreBranding();
    expect(b.nameAr).toBe("أعمال عصام الدين نصر للأدوات الكهربائية");
    expect(b.nameEn).toBe("Shop");
  });

  it("exposes only configured social links", async () => {
    Object.assign(store, { facebookUrl: " https://facebook.com/himmat ", instagramUrl: "", whatsappUrl: null, tiktokUrl: "  " });
    expect((await fetchStoreBranding()).social).toEqual({
      facebook: "https://facebook.com/himmat",
      instagram: null,
      whatsapp: null,
      tiktok: null,
    });
  });
});
