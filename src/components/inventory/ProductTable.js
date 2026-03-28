"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, AlertTriangle, Image as ImageIcon, ChevronLeft, ChevronRight, X, Layers, Package } from "lucide-react";
import ProductForm from "./ProductForm";
import { deleteProduct, updateStockQuantity } from "@/app/actions/inventory";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export default function ProductTable({ initialProducts, total, categories, searchParams }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
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
    if (window.confirm(t.inventoryDeleteConfirm)) {
      await deleteProduct(id);
    }
  };

  const handleStockUpdate = async (id, change) => {
    const res = await updateStockQuantity(id, change);
    if (!res.success) {
      alert(res.error || "Failed to update stock");
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
    <div className={`bg-gray-900 border border-white/5 rounded-2xl flex flex-col w-full h-full min-h-[500px] ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? "rtl" : "ltr"}>
      {mounted && (
        <div className="p-4 sm:p-6 border-b border-white/5 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-3 sm:gap-4">
           <div className="grid grid-cols-1 sm:grid-cols-2 xl:flex xl:flex-wrap gap-2 w-full xl:w-auto">
              {/* Search */}
              <div className="relative w-full sm:col-span-2 xl:w-72 group h-10">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} inset-y-0 my-auto h-4 w-4 text-gray-500 group-focus-within:text-amber-500 transition-colors pointer-events-none`} />
                <Input 
                  placeholder={t.inventorySearchPlaceholder} 
                  className={`h-full ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} bg-gray-800/50 border-white/5 text-white focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all ${isRTL ? 'text-right' : 'text-left'} rounded-xl`}
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
                      className={`absolute ${isRTL ? 'left-3' : 'right-3'} inset-y-0 my-auto flex items-center justify-center text-gray-500 hover:text-white transition-colors`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                )}
              </div>

              {/* Status Select */}
              <Select 
                value={searchParamsHook.get('status') || "all"} 
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className={`h-10 w-full sm:w-[140px] bg-gray-800/50 border-white/5 text-white ${isRTL ? 'text-right' : 'text-left'} rounded-xl`} dir={isRTL ? "rtl" : "ltr"}>
                  <SelectValue placeholder={t.inventoryColStock} />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10 text-white rounded-xl">
                  <SelectItem value="all">{t.inventoryStatusAll}</SelectItem>
                  <SelectItem value="low">{t.inventoryStatusLow}</SelectItem>
                  <SelectItem value="out">{t.inventoryStatusOut}</SelectItem>
                </SelectContent>
              </Select>

              {/* Category Select */}
              <Select 
                value={searchParamsHook.get('category') || "all"} 
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className={`h-10 w-full sm:w-[150px] bg-gray-800/50 border-white/5 text-white ${isRTL ? 'text-right' : 'text-left'} rounded-xl`} dir={isRTL ? "rtl" : "ltr"}>
                  <SelectValue placeholder={t.categoriesTab}>
                    {searchParamsHook.get('category') && categories.find(c => c.id.toString() === searchParamsHook.get('category'))?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10 text-white rounded-xl">
                  <SelectItem value="all">{t.inventoryStatusAll}</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort Select */}
              <Select 
                value={searchParamsHook.get('sort') || "newest"} 
                onValueChange={handleSortChange}
              >
                <SelectTrigger className={`h-10 w-full sm:w-[150px] bg-gray-800/50 border-white/5 text-white ${isRTL ? 'text-right' : 'text-left'} rounded-xl`} dir={isRTL ? "rtl" : "ltr"}>
                  <SelectValue placeholder={t.sortBy} />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10 text-white rounded-xl">
                  <SelectItem value="newest">{t.inventorySortNewest}</SelectItem>
                  <SelectItem value="price_asc">{t.inventorySortPriceAsc}</SelectItem>
                  <SelectItem value="price_desc">{t.inventorySortPriceDesc}</SelectItem>
                  <SelectItem value="stock_asc">{t.inventorySortStockAsc}</SelectItem>
                  <SelectItem value="stock_desc">{t.inventorySortStockDesc}</SelectItem>
                </SelectContent>
              </Select>
           </div>
           
           <Button onClick={openNew} className="h-10 w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl px-6 shrink-0">
             <Plus className={`${isRTL ? 'ml-2' : 'mr-2'} h-4 w-4`} /> {t.inventoryAddProduct}
           </Button>
        </div>
      )}

      <div className="overflow-x-auto flex-1">
        <table className={`w-full min-w-[900px] ${isRTL ? 'text-right' : 'text-left'} text-sm text-gray-300`}>
          <thead className="bg-gray-800/30 text-xs uppercase text-gray-400 font-bold border-b border-white/5">
            <tr>
              <th className="px-6 py-4">{t.inventoryColProduct}</th>
              <th className="px-6 py-4">{t.inventoryColSku}</th>
              <th className="px-6 py-4">{t.inventoryColPrice}</th>
              <th className="px-6 py-4">{t.inventoryColStock}</th>
              <th className={`px-6 py-4 ${isRTL ? 'text-left' : 'text-right'}`}>{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {initialProducts.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-500 italic">
                  <div className="flex flex-col items-center gap-2 opacity-30">
                     <Package className="h-10 w-10" />
                     {t.inventoryNoProducts}
                  </div>
                </td>
              </tr>
            ) : (
                initialProducts.map((p) => {
                  const isLow = p.stock <= p.minStock;
                  return (
                    <tr key={p.id} className={`${isLow ? 'bg-red-500/[0.02]' : 'hover:bg-white/[0.015]'} transition-colors group`}>
                      <td className="px-6 py-4 flex items-center gap-3 min-w-[250px]">
                        <div className="h-12 w-12 rounded-xl bg-gray-800 flex items-center justify-center overflow-hidden border border-white/5 flex-shrink-0 group-hover:border-amber-500/30 transition-colors">
                          {p.images && p.images[0] ? (
                            <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                        <div className="truncate">
                          <div className="font-bold text-white group-hover:text-amber-500 transition-colors">{p.name}</div>
                          <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                             <Layers className="h-3 w-3" /> {p.category?.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-500 uppercase tracking-wider">{p.sku}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-white regular-nums">{p.sellingPrice.toLocaleString()} {t.currency}</div>
                        <div className="text-[10px] text-gray-500 mt-1">{t.inventoryCost}: {p.purchasePrice.toLocaleString()} {t.currency}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-2">
                           <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold regular-nums ${isLow ? "text-red-500" : "text-emerald-500"}`}>
                                {p.stock}
                              </span>
                              {isLow && (
                                <AlertTriangle className="h-3 w-3 text-red-500 animate-pulse" />
                              )}
                           </div>
                           {/* Quick Stock Controls */}
                           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleStockUpdate(p.id, -1); }}
                                className="h-6 w-6 rounded bg-gray-800 border border-white/5 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-colors"
                              >
                                -
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleStockUpdate(p.id, 1); }}
                                className="h-6 w-6 rounded bg-gray-800 border border-white/5 flex items-center justify-center hover:bg-emerald-500/20 hover:text-emerald-500 transition-colors"
                              >
                                +
                              </button>
                           </div>
                        </div>
                      </td>
                      <td className={`px-6 py-4 ${isRTL ? 'text-left' : 'text-right'}`}>
                        <div className={`flex items-center gap-1 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="h-8 w-8 text-gray-500 hover:text-white hover:bg-white/5">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="h-8 w-8 text-gray-500 hover:text-red-500 hover:bg-red-500/5">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
        <div>
          {t.tableShowing} <span className="text-white font-medium">{initialProducts.length > 0 ? (currentPage - 1) * 10 + 1 : 0}</span> {t.tableTo} <span className="text-white font-medium">{Math.min(currentPage * 10, total)}</span> {t.tableOf} <span className="text-white font-medium">{total}</span> {t.tableResults}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-gray-800 border-white/10 text-white hover:bg-gray-700 disabled:opacity-50"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            {isRTL ? (
              <><ChevronLeft className="h-4 w-4 ml-1 rotate-180" /> {t.tablePrevious}</>
            ) : (
              <><ChevronLeft className="h-4 w-4 mr-1" /> {t.tablePrevious}</>
            )}
          </Button>
          <div className="px-4 py-1.5 bg-gray-800 rounded-md border border-white/10 text-white font-medium">
            {t.tablePage} {currentPage} {t.tableOf} {totalPages}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-gray-800 border-white/10 text-white hover:bg-gray-700 disabled:opacity-50"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            {isRTL ? (
              <>{t.tableNext} <ChevronRight className="h-4 w-4 mr-1 rotate-180" /></>
            ) : (
              <>{t.tableNext} <ChevronRight className="h-4 w-4 ml-1" /></>
            )}
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
