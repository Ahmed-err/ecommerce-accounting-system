import fs from "node:fs";
import path from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ErrorState from "@/components/shell/ErrorState";

const APP = path.resolve(__dirname, "../../../src/app");

describe("page states", () => {
  it("root loading.js is gone (it streamed before notFound and hit the DB)", () => {
    expect(fs.existsSync(path.join(APP, "loading.js"))).toBe(false);
    expect(fs.readFileSync(path.join(APP, "(store)/loading.js"), "utf8")).not.toMatch(/cookies|getStoreBranding|prisma/);
  });

  it("error state retries and links home and to support", () => {
    const retry = vi.fn();
    render(<ErrorState onRetry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Report this issue" })).toHaveAttribute("href", "/contact?subject=TECH");
  });

  it("global-error renders its own html and body", () => {
    const s = fs.readFileSync(path.join(APP, "global-error.js"), "utf8");
    expect(s).toMatch(/<html/);
    expect(s).toMatch(/<body/);
  });

  it("store group has its own not-found and error boundaries", () => {
    expect(fs.existsSync(path.join(APP, "(store)/not-found.js"))).toBe(true);
    expect(fs.existsSync(path.join(APP, "(store)/error.js"))).toBe(true);
  });

  it("unmatched URLs (root not-found) render inside the same store shell", () => {
    const root = fs.readFileSync(path.join(APP, "not-found.js"), "utf8");
    const layout = fs.readFileSync(path.join(APP, "(store)/layout.js"), "utf8");
    expect(root).toMatch(/<StoreShell>/);
    expect(layout).toMatch(/<StoreShell>/);
  });
});
