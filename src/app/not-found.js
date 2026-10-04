import StoreShell from "@/components/shell/StoreShell";
import NotFoundClient from "@/components/store/NotFoundClient";

// Unmatched URLs land here (route-group not-found pages only cover notFound() inside the group).
export default function NotFound() {
  return (
    <StoreShell>
      <NotFoundClient />
    </StoreShell>
  );
}
