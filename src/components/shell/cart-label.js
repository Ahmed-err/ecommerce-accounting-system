// Accessible name for the cart link; the visual count badge is aria-hidden.
export function cartLabel(t, count, loaded) {
  if (!loaded) return t.cart;
  if (!count) return t.cartEmptyLabel;
  return t.cartWithCount.replace("{count}", String(count));
}
