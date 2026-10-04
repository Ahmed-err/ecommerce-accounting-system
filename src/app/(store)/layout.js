import StoreShell from "@/components/shell/StoreShell";

// Shared store shell for every store page (P0.4). Admin/POS have their own layouts.
export default function StoreLayout({ children }) {
  return <StoreShell>{children}</StoreShell>;
}
