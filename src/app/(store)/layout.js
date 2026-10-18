import StoreShell from "@/components/shell/StoreShell";

// Shared store shell for every store page. Admin/POS have their own layouts.
export default function StoreLayout({ children }) {
  return <StoreShell>{children}</StoreShell>;
}
