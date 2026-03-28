import { cookies } from "next/headers";
import { translations } from "@/lib/translations";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  return {
    title: t.register + " | " + t.brandName,
  };
}

export default function RegisterLayout({ children }) {
  return children;
}
