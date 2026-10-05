import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProductImage from "@/components/media/ProductImage";

describe("ProductImage", () => {
  it("shows the placeholder text, not an emoji, when there is no photo", () => {
    render(<ProductImage src={undefined} alt="Fridge" />);
    expect(screen.getByText("Photo coming soon")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("📦");
  });

  it("falls back to the placeholder when the photo fails to load", () => {
    render(<ProductImage src="https://res.cloudinary.com/x/image/upload/v1/p.jpg" alt="Fridge" sizes="200px" />);
    fireEvent.error(screen.getByAltText("Fridge"));
    expect(screen.getByText("Photo coming soon")).toBeInTheDocument();
  });
});
