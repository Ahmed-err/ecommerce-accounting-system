import Link from "next/link";

const LINKS = [
  { key: "orders", href: "/account/orders", label: "myOrdersTitle" },
  { key: "notifications", href: "/account/notifications", label: "notifications" },
  { key: "settings", href: "/account/settings", label: "accountSettingsTitle" },
];

/** Tab row linking the three account pages. Server component: pass the dictionary. */
export default function AccountNav({ active, t }) {
  return (
    <nav aria-label={t.myAccount} className="flex gap-1 overflow-x-auto border-b border-border">
      {LINKS.map((l) => {
        const current = l.key === active;
        return (
          <Link
            key={l.key}
            href={l.href}
            aria-current={current ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              current
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t[l.label]}
          </Link>
        );
      })}
    </nav>
  );
}
