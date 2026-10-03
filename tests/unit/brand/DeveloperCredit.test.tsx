import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const state = { lang: "ar" };
vi.mock("@/context/LanguageContext", () => ({ useLanguage: () => state }));

import DeveloperCredit from "@/components/brand/DeveloperCredit";

describe("DeveloperCredit", () => {
  it("credits Sarmadax in Arabic and links to sarmadax.com in a new tab", () => {
    render(<DeveloperCredit />);
    const link = screen.getByRole("link", { name: /Sarmadax/ });
    expect(link).toHaveAttribute("href", "https://sarmadax.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.getByText(/تطوير:/)).toBeInTheDocument();
  });

  it("reads Built by Sarmadax in English", () => {
    state.lang = "en";
    render(<DeveloperCredit />);
    expect(screen.getByText(/Built by/)).toBeInTheDocument();
    state.lang = "ar";
  });
});
