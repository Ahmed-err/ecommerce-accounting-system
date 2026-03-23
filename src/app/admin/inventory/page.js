import { getProducts, getCategories } from "@/app/actions/inventory";
import ProductTable from "@/components/inventory/ProductTable";

export const metadata = {
  title: "Inventory | Admin Dashboard",
};

export const dynamic = "force-dynamic";

export default async function InventoryPage({ searchParams }) {
  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const search = params?.search || "";
  const categoryId = params?.category || "";
  const status = params?.status || "all";
  const sort = params?.sort || "newest";

  const { products, total } = await getProducts({ search, categoryId, status, sort, page });
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Inventory Management</h1>
          <p className="text-gray-400 mt-1">Manage products, pricing, and stock levels.</p>
        </div>
      </div>
      
      <ProductTable 
        initialProducts={products} 
        total={total}
        categories={categories}
        searchParams={params}
      />
    </div>
  );
}
