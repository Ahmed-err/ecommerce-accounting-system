"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadButton } from "@/lib/uploadthing";
import { createProduct, updateProduct } from "@/app/actions/inventory";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export default function ProductForm({ isOpen, onClose, product, categories }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const isEditing = !!product;
  
  const [formData, setFormData] = useState({
    name: "", description: "", sku: "", 
    purchasePrice: 0, sellingPrice: 0, 
    stock: 0, minStock: 5, categoryId: "", images: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        description: product.description || "",
        sku: product.sku || "",
        purchasePrice: product.purchasePrice || 0,
        sellingPrice: product.sellingPrice || 0,
        stock: product.stock || 0,
        minStock: product.minStock || 5,
        categoryId: product.categoryId || "",
        images: product.images || []
      });
    } else {
      setFormData({
        name: "", description: "", sku: "", 
        purchasePrice: 0, sellingPrice: 0, 
        stock: 0, minStock: 5, categoryId: "", images: []
      });
    }
    setError("");
  }, [product, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (val) => {
    setFormData(prev => ({ ...prev, categoryId: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      if (!formData.categoryId) throw new Error(t.inventorySelectCategoryError);
      
      const res = isEditing 
        ? await updateProduct(product.id, formData)
        : await createProduct(formData);
        
      if (res.success) {
        onClose();
      } else {
        setError(res.error || t.inventorySaveError);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side={isRTL ? "right" : "left"} className={`bg-gray-900 border-white/10 text-white w-full sm:max-w-2xl overflow-y-auto pb-24 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? "rtl" : "ltr"}>
        <SheetHeader>
          <SheetTitle className={`text-white ${isRTL ? 'text-right' : 'text-left'}`}>{isEditing ? t.inventoryEditProduct : t.inventoryAddNewProduct}</SheetTitle>
          <SheetDescription className={`text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isEditing ? t.inventoryUpdateDetails : t.inventoryFillDetails}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8 px-2 pb-6">
          {error && <div className="p-3 bg-red-500/20 text-red-400 rounded-md text-sm text-center">{error}</div>}
          
          {/* --- Basic Information --- */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t.inventoryBasicInfo}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`text-sm font-medium ${isRTL ? 'mr-1' : 'ml-1'}`}>{t.inventoryProductName}</label>
                <Input name="name" value={formData.name} onChange={handleChange} required className={`bg-gray-800 border-white/10 ${isRTL ? 'text-right' : 'text-left'}`} placeholder={lang === 'ar' ? "مثال: كشاف إضاءة LED" : "e.g. LED Flashlight"} />
              </div>
              <div className="space-y-2">
                <label className={`text-sm font-medium ${isRTL ? 'mr-1' : 'ml-1'}`}>{t.inventorySkuModel}</label>
                <Input name="sku" value={formData.sku} onChange={handleChange} required className={`bg-gray-800 border-white/10 ${isRTL ? 'text-right' : 'text-left'}`} placeholder={lang === 'ar' ? "مثال: LP-60W-01" : "e.g. LP-60W-01"} />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className={`text-sm font-medium ${isRTL ? 'mr-1' : 'ml-1'}`}>{t.categoriesTab}</label>
              <Select value={formData.categoryId?.toString()} onValueChange={handleCategoryChange}>
                <SelectTrigger className={`bg-gray-800 border-white/10 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? "rtl" : "ltr"}>
                  <SelectValue placeholder={t.inventorySelectCategory}>
                    {formData.categoryId && categories.find(c => c.id.toString() === formData.categoryId.toString())?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className={`bg-gray-800 border-white/10 text-white ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? "rtl" : "ltr"}>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* --- Pricing & Inventory --- */}
          <div className="pt-2 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t.inventoryPriceStock}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`text-sm font-medium text-amber-500/80 ${isRTL ? 'mr-1' : 'ml-1'}`}>{t.inventoryPurchasePrice}</label>
                <Input type="number" step="0.01" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} required className={`bg-gray-800 border-white/10 focus:border-amber-500/50 ${isRTL ? 'text-right' : 'text-left'}`} />
              </div>
              <div className="space-y-2">
                <label className={`text-sm font-medium text-emerald-500/80 ${isRTL ? 'mr-1' : 'ml-1'}`}>{t.inventorySellingPrice}</label>
                <Input type="number" step="0.01" name="sellingPrice" value={formData.sellingPrice} onChange={handleChange} required className={`bg-gray-800 border-white/10 focus:border-emerald-500/50 ${isRTL ? 'text-right' : 'text-left'}`} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`text-sm font-medium ${isRTL ? 'mr-1' : 'ml-1'}`}>{t.inventoryCurrentStock}</label>
                <Input type="number" name="stock" value={formData.stock} onChange={handleChange} required className={`bg-gray-800 border-white/10 ${isRTL ? 'text-right' : 'text-left'}`} />
              </div>
              <div className="space-y-2">
                <label className={`text-sm font-medium ${isRTL ? 'mr-1' : 'ml-1'}`}>{t.inventoryMinStockAlert}</label>
                <Input type="number" name="minStock" value={formData.minStock} onChange={handleChange} required className={`bg-gray-800 border-white/10 ${isRTL ? 'text-right' : 'text-left'}`} />
              </div>
            </div>
          </div>

          {/* --- Images --- */}
          <div className="pt-2 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t.inventoryProductImages}</h4>
              <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{formData.images.length}/4</span>
            </div>
            
            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                {formData.images.map((img, i) => (
                  <div key={i} className="relative group aspect-square">
                    <img src={img} alt="Product" className="h-full w-full object-cover rounded-lg border border-white/10" />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, index) => index !== i) }))}
                      className="absolute -top-1 -left-1 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-[10px] shadow-lg hover:scale-110 transition-transform"
                    >
                      ×
                    </button>
                    {i === 0 && (
                      <span className={`absolute bottom-1 ${isRTL ? 'right-1' : 'left-1'} bg-black/60 text-[8px] text-white px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter`}>{t.inventoryImagePrimary}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="p-6 border-2 border-dashed border-white/10 rounded-xl bg-gray-800/30 hover:bg-gray-800/50 hover:border-amber-500/30 transition-all flex flex-col items-center justify-center gap-2">
               <UploadButton
                endpoint="productImage"
                content={{
                  button: ({ ready }) => ready ? t.inventoryUploadImages : t.saving,
                  allowedContent: t.inventoryUploadLimit
                }}
                className="ut-button:bg-amber-500 ut-button:ut-readying:bg-amber-500/50 ut-button:text-black ut-button:font-bold ut-allowed-content:text-gray-500"
                onClientUploadComplete={(res) => {
                  if (res && res.length > 0) {
                    const newUrls = res.map(f => f.url);
                    setFormData(prev => ({ ...prev, images: [...prev.images, ...newUrls] }));
                  }
                }}
                onUploadError={(error) => {
                  setError(`${lang === 'ar' ? 'فشل الرفع' : 'Upload failed'}: ${error.message}`);
                }}
              />
            </div>
          </div>

          <div className="pt-8 pb-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="hover:bg-white/10">
              {t.cancel}
            </Button>
            <Button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              {loading ? t.saving : t.inventorySaveProduct}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
