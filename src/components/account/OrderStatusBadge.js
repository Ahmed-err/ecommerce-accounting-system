import { orderStatusLabel, orderStatusTone } from "@/lib/order-labels";

const TONES = {
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  danger: "bg-red-500/10 text-red-700 dark:text-red-400",
  info: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  warning: "bg-amber-500/15 text-accent-text dark:text-amber-400",
  neutral: "bg-muted text-foreground",
};

export default function OrderStatusBadge({ status, t, className = "" }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONES[orderStatusTone(status)]} ${className}`}>
      {orderStatusLabel(status, t)}
    </span>
  );
}
