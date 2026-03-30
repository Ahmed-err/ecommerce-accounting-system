import { createElement } from "react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/image", () => ({
  default: (props: any) => {
    const { src, alt = "", ...rest } = props;
    return createElement("img", { src: typeof src === "string" ? src : "", alt, ...rest });
  },
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) =>
    createElement("a", { href: typeof href === "string" ? href : "#", ...rest }, children),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({ lang: "en", isRTL: false, setLang: vi.fn() }),
}));

vi.mock("@/lib/cloudinary", () => ({
  uploadImage: vi.fn(async () => ({ url: "https://example.com/img.webp", publicId: "pid_1" })),
  deleteImage: vi.fn(async () => ({ result: "ok" })),
  resolveFolder: vi.fn((f: string) => f),
}));

global.fetch = vi.fn(async () =>
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
) as any;
