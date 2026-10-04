import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import en from "@/lib/i18n/en";

const session = { data: null as null | { user: { role: string; name: string; email: string } } };
const cart = { cartCount: 0, loaded: true };
vi.mock("next-auth/react", () => ({ useSession: () => session, signOut: vi.fn() }));
vi.mock("@/components/store/CartProvider", () => ({ useCart: () => cart }));
vi.mock("@/app/actions/catalog", () => ({ getCatalogCategories: vi.fn(async () => []) }));
vi.mock("@/components/store/NotificationBell", () => ({ default: () => null }));
vi.mock("@/components/GlobalSearch", () => ({ default: () => <input aria-label="search" /> }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }) }));

import SiteHeader, { cartLabel } from "@/components/shell/SiteHeader";

describe("cartLabel", () => {
  it("announces the count and handles edge values", () => {
    expect(cartLabel(en, 0, true)).toBe("Cart, empty");
    expect(cartLabel(en, 1, true)).toBe("Cart, 1 items");
    expect(cartLabel(en, 12, true)).toBe("Cart, 12 items");
    expect(cartLabel(en, 3, false)).toBe("Cart");
  });
});

describe("SiteHeader", () => {
  it("cart is one named link with no interactive element inside", () => {
    cart.cartCount = 2;
    render(<SiteHeader />);
    const link = screen.getByRole("link", { name: "Cart, 2 items" });
    expect(link).toHaveAttribute("href", "/cart");
    expect(within(link).queryByRole("button")).toBeNull();
    cart.cartCount = 0;
  });

  it("guests get a single Login link", () => {
    session.data = null;
    render(<SiteHeader />);
    const login = screen.getByRole("link", { name: /Login/ });
    expect(login).toHaveAttribute("href", "/login");
    expect(within(login).queryByRole("button")).toBeNull();
  });

  it("marks the current page", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  });

  it("is sticky and 64px tall without height animation", () => {
    const { container } = render(<SiteHeader />);
    const header = container.querySelector("header")!;
    expect(header.className).toContain("sticky");
    expect(header.innerHTML).toContain("h-16");
    expect(header.innerHTML).not.toMatch(/h-\[72px\]|h-\[60px\]/);
  });

  it("shows staff links only to staff", async () => {
    session.data = { user: { role: "CUSTOMER", name: "C", email: "c@x" } };
    const { unmount } = render(<SiteHeader />);
    fireEvent.click(screen.getByRole("button", { name: /account/i }));
    expect(screen.queryByRole("link", { name: en.adminPos })).toBeNull();
    unmount();
    session.data = { user: { role: "CASHIER", name: "S", email: "s@x" } };
    render(<SiteHeader />);
    fireEvent.click(screen.getByRole("button", { name: /account/i }));
    expect(await screen.findByRole("link", { name: en.adminPos })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: en.admin })).toBeNull();
    session.data = null;
  });

  it("account panel closes after choosing an item and links straight to account orders", () => {
    session.data = { user: { role: "CUSTOMER", name: "C", email: "c@x" } };
    render(<SiteHeader />);
    const toggle = screen.getByRole("button", { name: /account/i });
    fireEvent.click(toggle);
    const orders = screen.getByRole("link", { name: en.myOrders });
    expect(orders).toHaveAttribute("href", "/account/orders");
    fireEvent.click(orders);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: en.myOrders })).toBeNull();
    session.data = null;
  });
});
