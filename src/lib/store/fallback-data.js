export const FALLBACK_CATEGORIES = [
  {
    id: "cat-lighting",
    name: "Lighting",
    nameAr: "الإضاءة",
    description: "LED panels, bulbs, fixtures, and smart lighting solutions",
    image: "/images/categories/lighting.jpg",
  },
  {
    id: "cat-cables",
    name: "Cables & Wires",
    nameAr: "الكابلات والأسلاك",
    description: "Power cables, data cables, and fiber optic wiring",
    image: "/images/categories/cables.jpg",
  },
  {
    id: "cat-switches",
    name: "Switches & Sockets",
    nameAr: "المفاتيح والمقابس",
    description: "Wall switches, power sockets, dimmers, and smart controls",
    image: "/images/categories/switches.jpg",
  },
  {
    id: "cat-connectors",
    name: "Connectors",
    nameAr: "الموصلات",
    description: "Plugs, adapters, junction boxes, and terminal blocks",
    image: "/images/categories/connectors.jpg",
  },
  {
    id: "cat-power",
    name: "Power Systems",
    nameAr: "أنظمة الطاقة",
    description: "Generators, UPS units, inverters, and power distribution",
    image: "/images/categories/power.jpg",
  },
  {
    id: "cat-safety",
    name: "Safety Gear",
    nameAr: "معدات السلامة",
    description: "Circuit breakers, fuses, PPE, and safety equipment",
    image: "/images/categories/safety.jpg",
  },
];

export const FALLBACK_PRODUCTS = [
  {
    id: "fallback-led-panel",
    name: "LED Panel Light 60W",
    nameEn: "LED Panel Light 60W",
    nameAr: "كشاف LED لوح ٦٠ واط",
    description: "Ultra-slim LED panel light, 60W, warm white",
    descriptionEn: "Ultra-slim LED panel light, 60W, warm white",
    descriptionAr: "كشاف LED لوح ٦٠ واط",
    sku: "LED-PNL-60W",
    barcode: "6281234567890",
    unit: "pcs",
    purchasePrice: 25,
    sellingPrice: 45.99,
    stock: 50,
    minStock: 10,
    images: ["/images/products/led-panel.png"],
    compareAtPrice: 59.99,
    specs: null,
    highlights: null,
    isActive: true,
    categoryId: "cat-lighting",
    category: FALLBACK_CATEGORIES[0],
  },
  {
    id: "fallback-smart-switch",
    name: "Smart Switch 3-Gang",
    nameEn: "Smart Switch 3-Gang",
    nameAr: "مفتاح ذكي ٣ خطوط",
    description: "Touch-sensitive smart wall switch, 3-gang, WiFi",
    descriptionEn: "Touch-sensitive smart wall switch, 3-gang, WiFi",
    descriptionAr: "مفتاح ذكي ٣ خطوط",
    sku: "SW-SMART-3G",
    barcode: "6281234567891",
    unit: "pcs",
    purchasePrice: 18,
    sellingPrice: 34.99,
    stock: 75,
    minStock: 10,
    images: ["/images/products/smart-switch.png"],
    compareAtPrice: 44.99,
    specs: null,
    highlights: null,
    isActive: true,
    categoryId: "cat-switches",
    category: FALLBACK_CATEGORIES[2],
  },
  {
    id: "fallback-industrial-cable",
    name: "Industrial Cable 100m",
    nameEn: "Industrial Cable 100m",
    nameAr: "كابل صناعي ١٠٠ م",
    description: "Heavy-duty industrial cable, 100m roll, 2.5mm²",
    descriptionEn: "Heavy-duty industrial cable, 100m roll, 2.5mm²",
    descriptionAr: "كابل صناعي ١٠٠ م",
    sku: "CBL-IND-100M",
    barcode: "6281234567892",
    unit: "roll",
    purchasePrice: 55,
    sellingPrice: 89.99,
    stock: 30,
    minStock: 5,
    images: ["/images/products/ethernet.jpg"],
    compareAtPrice: 119.99,
    specs: null,
    highlights: null,
    isActive: true,
    categoryId: "cat-cables",
    category: FALLBACK_CATEGORIES[1],
  },
  {
    id: "fallback-power-inverter",
    name: "Power Inverter 3000W",
    nameEn: "Power Inverter 3000W",
    nameAr: "عاكس طاقة ٣٠٠٠ واط",
    description: "Pure sine wave power inverter, 3000W, 24V DC",
    descriptionEn: "Pure sine wave power inverter, 3000W, 24V DC",
    descriptionAr: "عاكس طاقة ٣٠٠٠ واط",
    sku: "PWR-INV-3000",
    barcode: "6281234567896",
    unit: "pcs",
    purchasePrice: 180,
    sellingPrice: 299.99,
    stock: 15,
    minStock: 3,
    images: ["/images/products/inverter.jpg"],
    compareAtPrice: 349.99,
    specs: null,
    highlights: null,
    isActive: true,
    categoryId: "cat-power",
    category: FALLBACK_CATEGORIES[4],
  },
  {
    id: "fallback-circuit-breaker",
    name: "Circuit Breaker 32A",
    nameEn: "Circuit Breaker 32A",
    nameAr: "قاطع دائرة ٣٢ أمبير",
    description: "Miniature circuit breaker, 32A, single pole",
    descriptionEn: "Miniature circuit breaker, 32A, single pole",
    descriptionAr: "قاطع دائرة ٣٢ أمبير",
    sku: "CB-MCB-32A",
    barcode: "6281234567895",
    unit: "pcs",
    purchasePrice: 12,
    sellingPrice: 24.99,
    stock: 120,
    minStock: 20,
    images: ["/images/products/circuit.jpg"],
    compareAtPrice: 34.99,
    specs: null,
    highlights: null,
    isActive: true,
    categoryId: "cat-safety",
    category: FALLBACK_CATEGORIES[5],
  },
  {
    id: "fallback-connector-kit",
    name: "Connector Kit Pro",
    nameEn: "Connector Kit Pro",
    nameAr: "طقم موصلات احترافي",
    description: "Compact connector kit for junction boxes and terminal blocks",
    descriptionEn: "Compact connector kit for junction boxes and terminal blocks",
    descriptionAr: "طقم موصلات احترافي",
    sku: "CONN-KIT-PRO",
    barcode: "6281234567898",
    unit: "box",
    purchasePrice: 36,
    sellingPrice: 54.99,
    stock: 80,
    minStock: 15,
    images: ["/images/products/ethernet.jpg"],
    compareAtPrice: 69.99,
    specs: null,
    highlights: null,
    isActive: true,
    categoryId: "cat-connectors",
    category: FALLBACK_CATEGORIES[3],
  },
];

export function getFallbackCategories() {
  return FALLBACK_CATEGORIES.map((category) => ({
    ...category,
    productCount: FALLBACK_PRODUCTS.filter((product) => product.categoryId === category.id).length,
  }));
}

export function getFallbackCatalogProducts({ search = "", category = "", limit = 12 } = {}) {
  const normalizedSearch = String(search || "").trim().toLowerCase();
  const normalizedCategory = String(category || "").trim();

  const filtered = FALLBACK_PRODUCTS.filter((product) => {
    const matchesSearch = !normalizedSearch || [product.name, product.nameAr, product.description, product.descriptionAr, product.sku].some((value) => (value || "").toLowerCase().includes(normalizedSearch));
    const matchesCategory = !normalizedCategory || normalizedCategory === "all" || product.categoryId === normalizedCategory || product.category?.name === normalizedCategory || product.category?.nameAr === normalizedCategory;
    return matchesSearch && matchesCategory;
  });

  return {
    products: filtered.slice(0, limit).map((product) => ({ ...product })),
    total: filtered.length,
  };
}

export function getFallbackStorefrontProductBySlug(slug) {
  const normalized = String(slug || "").trim();
  if (!normalized) return null;

  return FALLBACK_PRODUCTS.find((product) => product.id === normalized || product.sku === normalized || product.name === normalized || product.nameAr === normalized) || null;
}
