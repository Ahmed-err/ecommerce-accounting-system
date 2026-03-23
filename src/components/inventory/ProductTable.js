"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, AlertTriangle, Image as ImageIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import ProductForm from "./ProductForm";
import { deleteProduct } from "@/app/actions/inventory";

export default function ProductTable({ initialProducts, total, categories, searchParams }) {
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const pathname = usePathname();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchValue, setSearchValue] = useState(searchParamsHook.get('search') || "");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  
  const currentPage = Number(searchParamsHook.get('page')) || 1;
  const totalPages = Math.ceil(total / 10) || 1;
  
  const searchTimeout = useRef(null);
  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchValue(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      const params = new URLSearchParams(searchParamsHook);
      if (val) {
        params.set('search', val);
      } else {
        params.delete('search');
      }
      params.set('page', '1');
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);
  };

  const handleStatusChange = (val) => {
    const params = new URLSearchParams(searchParamsHook);
    if (val && val !== "all") {
      params.set('status', val);
    } else {
      params.delete('status');
    }
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleCategoryChange = (val) => {
    const params = new URLSearchParams(searchParamsHook);
    if (val && val !== "all") {
      params.set('category', val);
    } else {
      params.delete('category');
    }
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleSortChange = (val) => {
    const params = new URLSearchParams(searchParamsHook);
    if (val && val !== "newest") {
      params.set('sort', val);
    } else {
      params.delete('sort');
    }
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParamsHook);
    params.set('page', newPage.toString());
    router.replace(`${pathname}?${params.toString()}`);
  };
  
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      await deleteProduct(id);
    }
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const openNew = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  return (
    <div className="bg-gray-900 border border-white/5 rounded-xl flex flex-col w-full h-full min-h-[500px]">
      {mounted && (
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="flex gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64 group h-8">
                <Search className="absolute left-3 inset-y-0 my-auto h-4 w-4 text-gray-500 group-focus-within:text-amber-500 transition-colors pointer-events-none" />
                <Input 
                  placeholder="Search name or SKU..." 
                  className="h-full pl-10 pr-10 bg-gray-800 border-white/10 text-white focus:border-amber-500/50 transition-all"
                  value={searchValue}
                  onChange={handleSearch}
                />
                {searchValue && (
                  <button 
                    onClick={() => {
                      setSearchValue("");
                      const params = new URLSearchParams(searchParamsHook);
                      params.delete('search');
                      params.set('page', '1');
                      router.replace(`${pathname}?${params.toString()}`);
                    }}
                    className="absolute right-3 inset-y-0 my-auto flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Select 
                value={searchParamsHook.get('status') || "all"} 
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="w-[140px] bg-gray-800 border-white/10 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10 text-white">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={searchParamsHook.get('category') || "all"} 
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="w-[160px] bg-gray-800 border-white/10 text-white">
                  <SelectValue placeholder="Category">
                    {searchParamsHook.get('category') && categories.find(c => c.id.toString() === searchParamsHook.get('category'))?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10 text-white">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={searchParamsHook.get('sort') || "newest"} 
                onValueChange={handleSortChange}
              >
                <SelectTrigger className="w-[160px] bg-gray-800 border-white/10 text-white">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10 text-white">
                  <SelectItem value="newest">Newest Added</SelectItem>
                  <SelectItem value="price_asc">Price: Low-High</SelectItem>
                  <SelectItem value="price_desc">Price: High-Low</SelectItem>
                  <SelectItem value="stock_asc">Stock: Low-High</SelectItem>
                  <SelectItem value="stock_desc">Stock: High-Low</SelectItem>
                  <SelectItem value="name_asc">Name: A-Z</SelectItem>
                </SelectContent>
              </Select>
           </div>
           <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
             <Plus className="mr-2 h-4 w-4" /> Add Product
           </Button>
        </div>
      )}

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-gray-800/50 text-xs uppercase text-gray-400">
            <tr>
              <th className="px-6 py-4 font-medium">Product</th>
              <th className="px-6 py-4 font-medium">SKU</th>
              <th className="px-6 py-4 font-medium">Price</th>
              <th className="px-6 py-4 font-medium">Stock</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {initialProducts.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                  No products found.
                </td>
              </tr>
            )}
            {initialProducts.map((p) => (
              <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-gray-800 flex items-center justify-center overflow-hidden border border-white/5 flex-shrink-0">
                    {p.images && p.images[0] ? (
                      <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-white">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.category?.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4">{p.sku}</td>
                <td className="px-6 py-4">
                  <div>${p.sellingPrice.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">Cost: ${p.purchasePrice.toFixed(2)}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={p.stock <= p.minStock ? "text-red-400 font-bold" : "text-green-400"}>
                      {p.stock}
                    </span>
                    {p.stock <= p.minStock && (
                      <AlertTriangle className="h-4 w-4 text-red-400" title="Low Stock" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="text-gray-400 hover:text-white">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm text-gray-400">
        <div>
          Showing <span className="text-white font-medium">{initialProducts.length > 0 ? (currentPage - 1) * 10 + 1 : 0}</span> to <span className="text-white font-medium">{Math.min(currentPage * 10, total)}</span> of <span className="text-white font-medium">{total}</span> results
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-gray-800 border-white/10 text-white hover:bg-gray-700 disabled:opacity-50"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <div className="px-4 py-1.5 bg-gray-800 rounded-md border border-white/10 text-white font-medium">
            Page {currentPage} of {totalPages}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-gray-800 border-white/10 text-white hover:bg-gray-700 disabled:opacity-50"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {isFormOpen && (
        <ProductForm 
          isOpen={isFormOpen} 
          onClose={() => setIsFormOpen(false)} 
          product={editingProduct}
          categories={categories}
        />
      )}
    </div>
  );
}
