import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const state = { lang: "ar" };
vi.mock("@/context/LanguageContext", () => ({ useLanguage: () => state }));

import Price from "@/components/brand/Price";

describe("Price", () => {
  it("prints amount then currency, with tabular digits", () => {
    const { container } = render(<Price amount={1250} />);
    expect(container.textContent).toContain("1,250");
    expect(container.textContent).toContain("ج.س");
    expect(container.firstChild).toHaveAttribute("data-numeric");
  });

  it("shows the compare price and discount only when cheaper", () => {
    render(<Price amount={1250} compareAt={1400} />);
    expect(screen.getByText("1,400")).toHaveClass("line-through");
    expect(screen.getByText("−11%")).toBeInTheDocument();
  });

  it("hides discount when compareAt is not higher", () => {
    render(<Price amount={1400} compareAt={1400} />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("uses SDG in English", () => {
    state.lang = "en";
    const { container } = render(<Price amount={5} />);
    expect(container.textContent).toContain("SDG");
    state.lang = "ar";
  });
});
