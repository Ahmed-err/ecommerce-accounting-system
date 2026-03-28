import { FeaturedProductsClient } from "./FeaturedProductsClient";
import { getFeaturedProducts } from "@/app/actions/catalog";
import { cookies } from "next/headers";

export default async function FeaturedProducts() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const products = await getFeaturedProducts();
  
  return <FeaturedProductsClient products={products} lang={lang} />;
}
