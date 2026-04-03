import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatServerActionError(error) {
  if (error == null || error === "") return "";
  if (typeof error === "string") return error.trim();
  if (typeof error === "object") {
    if (typeof error.message === "string" && error.message.trim()) {
      return error.message.trim();
    }
    const parts = Object.values(error).flat();
    const joined = parts
      .filter((p) => p != null && String(p).trim())
      .map(String)
      .join(" · ");
    if (joined) return joined;
    try {
      const s = JSON.stringify(error);
      if (s && s !== "{}") return s;
    } catch {
      /* ignore */
    }
  }
  return "";
}
