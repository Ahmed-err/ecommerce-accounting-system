import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const state = { lang: "ar", isRTL: true, brandName: "أعمال عصام الدين نصر للأدوات الكهربائية" };
vi.mock("@/context/LanguageContext", () => ({ useLanguage: () => state }));

import BrandLockup from "@/components/brand/BrandLockup";

describe("BrandLockup", () => {
  it("leads with همّت and shows the shop name and GM line in full", () => {
    render(<BrandLockup variant="full" />);
    expect(screen.getByText("همّت")).toBeInTheDocument();
    expect(screen.getByText("HIMMAT")).toBeInTheDocument();
    expect(screen.getByText(state.brandName)).toBeInTheDocument();
    expect(screen.getByText("المدير العام: رياض همت")).toBeInTheDocument();
  });

  it("drops the GM line in compact", () => {
    render(<BrandLockup variant="compact" />);
    expect(screen.queryByText("المدير العام: رياض همت")).not.toBeInTheDocument();
  });

  it("falls back to the translated shop name when settings give none", () => {
    state.brandName = "";
    render(<BrandLockup variant="compact" />);
    expect(screen.getByText("عصام الدين نصر للأدوات الكهربائية")).toBeInTheDocument();
    state.brandName = "أعمال عصام الدين نصر للأدوات الكهربائية";
  });

  it("uses the English wordmark in English", () => {
    Object.assign(state, { lang: "en", isRTL: false, brandName: "Essam El-Din Nasr Electrical Tools" });
    render(<BrandLockup variant="compact" />);
    expect(screen.getByText("Himmat")).toBeInTheDocument();
    Object.assign(state, { lang: "ar", isRTL: true, brandName: "أعمال عصام الدين نصر للأدوات الكهربائية" });
  });

  it("renders only the mark, labelled, in mark variant", () => {
    render(<BrandLockup variant="mark" />);
    expect(screen.getByRole("img", { name: "همّت" })).toBeInTheDocument();
  });
});
