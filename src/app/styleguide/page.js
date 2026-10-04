import { notFound } from "next/navigation";
import StyleguideClient from "./StyleguideClient";

export function generateMetadata() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return { title: "Style guide", robots: { index: false, follow: false } };
}

// Review page for the P0.3 design system; never served on production.
export default function StyleguidePage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <StyleguideClient />;
}
