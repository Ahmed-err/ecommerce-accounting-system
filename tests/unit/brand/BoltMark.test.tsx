import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import BoltMark, { BOLT_PATH, BOLT_PATH_SMALL } from "@/components/brand/BoltMark";

describe("BoltMark", () => {
  it("uses the heavier bolt at small sizes", () => {
    const { container } = render(<BoltMark size={24} />);
    expect(container.querySelector("path")?.getAttribute("d")).toBe(BOLT_PATH_SMALL);
  });

  it("uses the regular bolt at larger sizes and brand colours", () => {
    const { container } = render(<BoltMark size={56} />);
    expect(container.querySelector("path")?.getAttribute("d")).toBe(BOLT_PATH);
    expect(container.querySelector("rect")?.getAttribute("fill")).toBe("#0E1A2B");
    expect(container.querySelector("path")?.getAttribute("fill")).toBe("#F2A20C");
  });

  it("inverts for the amber tone", () => {
    const { container } = render(<BoltMark tone="amber" />);
    expect(container.querySelector("rect")?.getAttribute("fill")).toBe("#F2A20C");
    expect(container.querySelector("path")?.getAttribute("fill")).toBe("#0E1A2B");
  });

  it("is decorative unless titled", () => {
    const { container, rerender } = render(<BoltMark />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    rerender(<BoltMark title="همّت" />);
    expect(screen.getByRole("img", { name: "همّت" })).toBeInTheDocument();
  });

  it("tab favicon (src/app/icon.svg) uses the heavier small-size bolt", () => {
    const svg = fs.readFileSync(path.resolve(__dirname, "../../../src/app/icon.svg"), "utf8");
    expect(svg).toContain(BOLT_PATH_SMALL);
  });

  it("auto tone follows the theme via classes", () => {
    const { container } = render(<BoltMark tone="auto" />);
    expect(container.querySelector("rect")?.getAttribute("class")).toContain("dark:fill-amber-500");
    expect(container.querySelector("path")?.getAttribute("class")).toContain("dark:fill-navy-900");
  });
});
