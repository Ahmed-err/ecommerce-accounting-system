import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CategoriesStrip from "@/components/CategoriesStrip";

describe("CategoriesStrip", () => {
  it("renders a fallback placeholder and links to the category products page when no image is provided", () => {
    render(
      <CategoriesStrip
        categories={[{ id: "lighting", name: "Lighting", nameAr: "الإضاءة", productCount: 4 }]}
      />
    );

    const link = screen.getByRole("link", { name: /browse category lighting/i });

    expect(link).toHaveAttribute("href", "/products?category=lighting");
    expect(screen.getByText("Li")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /lighting/i })).not.toBeInTheDocument();
  });
});
