import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProductGrid, { visibleCategoryRows } from "@/components/store/ProductGrid";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/products",
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("@/app/actions/catalog", () => ({ getCatalogProductsByIds: vi.fn(async () => []) }));
vi.mock("@/components/store/ProductCard", () => ({ default: ({ product }: any) => <div>{product.name}</div> }));

const categories = [
  { id: "fr", name: "Refrigerators & Freezers", parentId: null, productCount: 39 },
  { id: "fz", name: "Freezers", parentId: "fr", productCount: 15 },
  { id: "tv", name: "TV & Satellite", parentId: null, productCount: 8 },
];
const brands = [
  { name: "LG", count: 12 },
  { name: "Unionaire", count: 3 },
];

const renderGrid = () =>
  render(<ProductGrid initialProducts={[{ id: "p1", name: "Fridge" }]} total={1} categories={categories} brands={brands} />);

describe("visibleCategoryRows", () => {
  it("shows top categories, opening only the one in use", () => {
    expect(visibleCategoryRows(categories, "all").map((c) => c.id)).toEqual(["fr", "tv"]);
    expect(visibleCategoryRows(categories, "fr").map((c) => c.id)).toEqual(["fr", "fz", "tv"]);
    expect(visibleCategoryRows(categories, "fz").map((c) => c.id)).toEqual(["fr", "fz", "tv"]);
  });
});

describe("ProductGrid", () => {
  beforeEach(() => {
    replace.mockClear();
    search = "";
  });

  it("labels the search box, price fields and sort", () => {
    renderGrid();
    expect(screen.getByLabelText("Search products")).toBeInTheDocument();
    expect(screen.getAllByLabelText("From")).toHaveLength(1);
    expect(screen.getAllByLabelText("To")).toHaveLength(1);
    expect(screen.getByRole("combobox")).toHaveAccessibleName(/sort/i);
  });

  it("filters by brand in one navigation, back to page 1", () => {
    search = "page=3&sort=price_asc";
    renderGrid();
    fireEvent.click(screen.getByRole("button", { name: /Unionaire/ }));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/products?sort=price_asc&brand=Unionaire", { scroll: false });
  });

  it("shows a removable chip for each active filter", () => {
    search = "brand=LG&inStock=1";
    renderGrid();
    fireEvent.click(screen.getByRole("button", { name: "Remove filter: LG" }));
    expect(replace).toHaveBeenCalledWith("/products?inStock=1", { scroll: false });
    expect(screen.getByRole("button", { name: "Clear all" })).toBeInTheDocument();
  });
});
