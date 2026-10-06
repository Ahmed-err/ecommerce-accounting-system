import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CategoriesStrip from "@/components/CategoriesStrip";

describe("CategoriesStrip", () => {
  it("links each category to its products, named by label and count", () => {
    render(<CategoriesStrip categories={[{ id: "fr", name: "Refrigerators & Freezers", nameAr: "الثلاجات والفريزرات", productCount: 40, cover: null }]} />);
    const link = screen.getByRole("link", { name: /Refrigerators & Freezers\s*40 products/ });
    expect(link).toHaveAttribute("href", "/products?category=fr");
  });

  it("shows the cover photo when there is one, a quiet placeholder otherwise", () => {
    const { container } = render(
      <CategoriesStrip
        categories={[
          { id: "a", name: "TV & Satellite", productCount: 8, cover: "https://res.cloudinary.com/x/image/upload/v1/tv.jpg" },
          { id: "b", name: "Cookware", productCount: 3, cover: null },
        ]}
      />
    );
    expect(container.querySelector('img[src*="tv.jpg"]')).toBeTruthy();
    expect(screen.getByRole("link", { name: /Cookware/ }).textContent).not.toContain("📦");
  });
});
