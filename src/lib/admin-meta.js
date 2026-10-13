import { cookies } from "next/headers";
import { translations } from "@/lib/translations";

// Tab title for an admin page in the staff member's language; the root layout adds the brand.
export function adminMetadata(key) {
  return async function generateMetadata() {
    const lang = (await cookies()).get("lang")?.value === "en" ? "en" : "ar";
    const t = translations[lang];
    return { title: t[key] || translations.en[key], robots: { index: false, follow: false } };
  };
}
