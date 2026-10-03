import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";

// tests/setup.ts mocks LanguageContext globally; this test needs the real provider.
vi.unmock("@/context/LanguageContext");

function Probe() {
  const { lang } = useLanguage();
  return <span data-testid="lang">{lang}</span>;
}

describe("LanguageProvider", () => {
  afterEach(() => localStorage.clear());

  it("defaults to Arabic", () => {
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByTestId("lang")).toHaveTextContent("ar");
  });

  it("keeps the server language even if localStorage holds another one", () => {
    localStorage.setItem("lang", "en");
    render(<LanguageProvider initialLang="ar"><Probe /></LanguageProvider>);
    expect(screen.getByTestId("lang")).toHaveTextContent("ar");
  });
});
