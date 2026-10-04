import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { LanguageProvider, useLanguage, useT } from "@/context/LanguageContext";

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

function TProbe() {
  const t = useT();
  return <span data-testid="t">{t.home}</span>;
}

describe("useT", () => {
  it("returns the dictionary the server passed in", () => {
    render(<LanguageProvider initialLang="ar" dictionary={{ home: "الرئيسية" }}><TProbe /></LanguageProvider>);
    expect(screen.getByTestId("t")).toHaveTextContent("الرئيسية");
  });

  it("follows a new dictionary prop after a language switch refresh", () => {
    const { rerender } = render(<LanguageProvider initialLang="ar" dictionary={{ home: "الرئيسية" }}><TProbe /></LanguageProvider>);
    act(() => rerender(<LanguageProvider initialLang="en" dictionary={{ home: "Home" }}><TProbe /></LanguageProvider>));
    expect(screen.getByTestId("t")).toHaveTextContent("Home");
  });
});
