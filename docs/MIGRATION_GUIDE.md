## Hierarchical Categories - Migration Guide & Quick Reference

### Quick Start

**For Developers:**
```bash
# 1. Pull latest changes
git pull origin main

# 2. Install dependencies (if needed)
npm install

# 3. Run database migration
npx prisma migrate deploy

# 4. Run tests
npm run test:unit -- categoryHierarchy.test.js

# 5. Start development server
npm run dev
```

**For DevOps/Database Admins:**
```bash
# Verify migration applied
psql your_db -c "SELECT column_name FROM information_schema.columns WHERE table_name='Category' AND column_name='parentId';"

# Expected output: parentId column exists
```

---

## Implementation Summary

### What Changed

| Aspect | Before | After |
|--------|--------|-------|
| **Category Structure** | Flat list only | Hierarchical tree |
| **Database Field** | N/A | `parentId` added (nullable) |
| **Parent-Child** | Not supported | Full support with validation |
| **Product Queries** | Single category only | Category + descendants |
| **API Endpoints** | 3 endpoints | 5 endpoints |
| **Circular Prevention** | N/A | Automatic validation |

### Files Added/Modified

**New Files:**
- ✅ `src/lib/categoryHierarchy.js` - Core utilities
- ✅ `src/app/api/admin/categories/route.js` - Admin list/create (MODIFIED)
- ✅ `src/app/api/admin/categories/[id]/route.js` - Admin by ID (NEW)
- ✅ `src/app/api/categories/tree/route.js` - Public tree (NEW)
- ✅ `tests/categoryHierarchy.test.js` - Test suite
- ✅ `docs/HIERARCHICAL_CATEGORIES.md` - Full documentation
- ✅ `prisma/migrations/20260906120000_add_hierarchical_categories/` - DB migration

**Modified Files:**
- ✅ `prisma/schema.prisma` - Added parentId and relations

### Database Changes

```sql
-- Added to Category table
ALTER TABLE "Category" ADD COLUMN "parentId" TEXT;
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" 
  FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL;
```

**What this means:**
- All existing categories automatically get `parentId = null` (root level)
- No data loss
- No breaking changes
- Fully reversible

---

## Usage Guide

### For Product Managers / Category Admins

#### Creating a Hierarchy

**Scenario:** Organize "Electronics" category

```
Electronics (root)
├── Computers
│   ├── Laptops
│   ├── Desktops
│   └── Tablets
├── Mobile Devices
│   ├── Phones
│   └── Smartwatches
└── Accessories
    ├── Cables
    └── Cases
```

**Steps:**

1. Create "Electronics" as root category (leave parentId empty)
2. Create "Computers" with parentId = "Electronics"
3. Create "Laptops" with parentId = "Computers"
4. Continue for other branches

**Using Admin UI:**
- Go to Categories
- Click "Add Category"
- Enter name: "Laptops"
- Select parent: "Computers" (dropdown shows existing categories)
- Save

#### Moving Categories

**Scenario:** Move "Tablets" from Computers to Mobile Devices

1. Go to Categories
2. Find "Tablets"
3. Click "Edit"
4. Change parent to "Mobile Devices"
5. Save

**System validates:** "This won't create a circular relationship" ✅

#### Deleting Categories

**Rules:**
- ✅ Can delete empty categories
- ❌ Cannot delete categories with products
- ⚠️ Children become root-level if parent deleted

**Before deleting category with products:**
```
Electronics > Computers > Laptops (has 42 products)

Option 1: Delete all products first
Option 2: Move products to different category first
Option 3: Move category instead of deleting
```

### For Frontend Developers

#### Display Navigation Menu

```javascript
// Fetch category tree
async function loadCategoryMenu() {
  const response = await fetch('/api/categories/tree');
  const { data } = await response.json();
  
  // data is already hierarchical
  return data;
}

// Render recursively
function CategoryMenu({ categories }) {
  return (
    <ul>
      {categories.map(cat => (
        <li key={cat.id}>
          <Link href={`/category/${cat.id}`}>
            {cat.name} <span className="count">({cat.productCount})</span>
          </Link>
          {cat.children.length > 0 && (
            <CategoryMenu categories={cat.children} />
          )}
        </li>
      ))}
    </ul>
  );
}
```

#### Display Breadcrumbs

```javascript
// Get category with breadcrumb
async function loadCategory(id) {
  const response = await fetch(`/api/admin/categories/${id}`);
  const { data } = await response.json();
  
  // data.breadcrumb contains full path
  return data;
}

// Render
function Breadcrumb({ category }) {
  return (
    <nav className="breadcrumb">
      {category.breadcrumb.map((item, idx) => (
        <span key={item.id}>
          <Link href={`/category/${item.id}`}>{item.name}</Link>
          {idx < category.breadcrumb.length - 1 && ' / '}
        </span>
      ))}
    </nav>
  );
}
```

#### Display Products in Category & Subcategories

```javascript
import { getProductsInCategoryTree } from '@/lib/categoryHierarchy';

// Server-side: Get all products in category + subcategories
async function loadCategoryProducts(categoryId, page = 1) {
  const { products, total } = await getProductsInCategoryTree(
    categoryId,
    {
      skip: (page - 1) * 20,
      take: 20,
      where: { isActive: true },
      orderBy: { name: 'asc' }
    }
  );
  
  return { products, total, pages: Math.ceil(total / 20) };
}

// Example: Electronics > Computers shows:
// - Products directly in "Computers" category
// - Plus products in "Laptops", "Desktops", "Tablets" (children)
```

### For Backend Developers

#### Query Products in Category Tree

```javascript
import { getProductsInCategoryTree, getProductsInCategory } from '@/lib/categoryHierarchy';

// Include products from subcategories
const { products, total } = await getProductsInCategoryTree('electronics-id', {
  skip: 0,
  take: 50,
  where: { isActive: true }
});

// Only direct products in this category
const { products, total } = await getProductsInCategory('laptops-id', {
  skip: 0,
  take: 50
});
```

#### Build Category Tree

```javascript
import { getCategoryTree } from '@/lib/categoryHierarchy';

// Get entire tree
const allCategories = await getCategoryTree();

// Get subtree for specific category
const subtree = await getCategoryTree('computers-id');
```

#### Get Category Hierarchy Info

```javascript
import { getCategoryWithHierarchy, getAllAncestors, getAllDescendants } from '@/lib/categoryHierarchy';

// Get category with breadcrumb
const category = await getCategoryWithHierarchy('laptops-id');
console.log(category.breadcrumb); // [Electronics, Computers, Laptops]

// Get all parents up to root
const ancestors = await getAllAncestors('laptops-id');
console.log(ancestors); // [Computers, Electronics]

// Get all children recursively
const descendants = await getAllDescendants('electronics-id');
console.log(descendants); // [Computers, Laptops, Desktops, ...]
```

#### Prevent Circular Relationships

```javascript
import { wouldCreateCircularRelationship } from '@/lib/categoryHierarchy';

// Validate before moving
const isCircular = await wouldCreateCircularRelationship(
  'electronics-id',    // category to move
  'laptops-id'         // proposed parent
);

if (isCircular) {
  throw new Error('Cannot set parent: would create circular relationship');
}

// Safe to update
await prisma.category.update({
  where: { id: 'electronics-id' },
  data: { parentId: 'laptops-id' }
});
```

#### Delete Category Safely

```javascript
import { deleteCategory } from '@/lib/categoryHierarchy';

try {
  const deleted = await deleteCategory('category-id');
  console.log('Deleted:', deleted);
} catch (error) {
  if (error.message.includes('product')) {
    console.error('Category has products - cannot delete');
  }
}
```

#### Move Category

```javascript
import { moveCategory } from '@/lib/categoryHierarchy';

try {
  const moved = await moveCategory('category-id', 'new-parent-id');
  console.log('Moved to:', moved.parentId);
} catch (error) {
  if (error.message.includes('circular')) {
    console.error('Would create circular relationship');
  }
}
```

---

## API Reference

### Admin: List Categories
```
GET /api/admin/categories
GET /api/admin/categories?tree=true

Response:
{
  "data": [{ id, name, nameAr, parentId, _count: { products, children } }],
  "success": true
}
```

### Admin: Create Category
```
POST /api/admin/categories

Body:
{
  "name": "Laptops",
  "nameAr": "أجهزة محمولة",
  "description": "...",
  "parentId": "computers-id"  // optional
}

Response:
{
  "data": { id, name, parentId, parent, children },
  "message": "Category created successfully",
  "success": true
}
```

### Admin: Get Category by ID
```
GET /api/admin/categories/[id]

Response:
{
  "data": {
    "id": "cat-1",
    "name": "Laptops",
    "breadcrumb": [{ id, name }, ...],
    "ancestors": [...],
    "_count": { "products": 42, "children": 0 }
  },
  "success": true
}
```

### Admin: Update Category
```
PUT /api/admin/categories/[id]

Body:
{
  "name": "Updated Name",
  "parentId": "new-parent-id"  // optional
}

Response:
{
  "data": { /* updated category */ },
  "message": "Category updated successfully",
  "success": true
}
```

### Admin: Delete Category
```
DELETE /api/admin/categories/[id]

Response:
{
  "data": { /* deleted category */ },
  "message": "Category deleted successfully",
  "success": true
}

Errors:
- 404: Category not found
- 409: Category has products (cannot delete)
- 400: Circular relationship
```

### Public: Category Tree
```
GET /api/categories/tree
GET /api/categories/tree?categoryId=cat-id

Response:
{
  "data": [{
    "id": "cat-1",
    "name": "Electronics",
    "productCount": 150,
    "childCount": 3,
    "children": [...]
  }],
  "success": true,
  "timestamp": "2026-09-06T12:00:00.000Z"
}

Caching: 5 minutes (public, max-age=300)
```

---

## Common Scenarios

### Scenario 1: Display Products for "Electronics" Category

**Goal:** Show all products in Electronics, Computers, Mobile Devices, etc.

**Solution:**
```javascript
const { products, total } = await getProductsInCategoryTree('electronics-id', {
  skip: 0,
  take: 20,
  where: { isActive: true }
});

// Returns products from:
// - Electronics (direct)
// - Electronics > Computers (and its children)
// - Electronics > Mobile Devices (and its children)
// - Electronics > Accessories (and its children)
```

### Scenario 2: Filter Products by "Laptops" Only

**Goal:** Show only products directly in Laptops category

**Solution:**
```javascript
const { products, total } = await getProductsInCategory('laptops-id', {
  skip: 0,
  take: 20,
  where: { isActive: true }
});

// Returns products directly in Laptops only
// Does NOT include any subcategories
```

### Scenario 3: Display Breadcrumb Navigation

**Goal:** Show path: Electronics > Computers > Laptops

**Solution:**
```javascript
const category = await getCategoryWithHierarchy('laptops-id');

category.breadcrumb.map(item => (
  <a href={`/category/${item.id}`}>{item.name}</a>
));

// Output: Electronics > Computers > Laptops
```

### Scenario 4: Create New Subcategory

**Goal:** Add "Gaming Laptops" under "Laptops"

**Solution:**
```javascript
await fetch('/api/admin/categories', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Gaming Laptops',
    parentId: 'laptops-id'
  })
});
```

### Scenario 5: Reorganize Category Structure

**Goal:** Move "Tablets" from Computers to Mobile Devices

**Solution:**
```javascript
await fetch('/api/admin/categories/tablets-id', {
  method: 'PUT',
  body: JSON.stringify({
    parentId: 'mobile-devices-id'
  })
});

// System automatically validates:
// - New parent exists
// - Won't create circular relationship
// - Updates all references
```

---

## Backward Compatibility Checklist

✅ Existing categories work as-is (parentId = null)
✅ Product-Category relationships unchanged
✅ All existing queries still work
✅ No breaking API changes
✅ Graceful orphaning on parent deletion
✅ Full rollback possible if needed

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Circular relationship" error | Ensure parent is not a descendant of the category |
| "Cannot delete - has products" | Move/delete products first, or move category |
| Products not showing in tree | Verify product's `categoryId` and use `getProductsInCategoryTree()` |
| Category not in dropdown | Parent must exist and not be self |
| Performance issues | Use pagination, cache tree endpoint |

---

## Testing

**Run all tests:**
```bash
npm run test:unit -- categoryHierarchy.test.js
```

**Test coverage:**
- ✅ 15+ test cases
- ✅ Tree building
- ✅ Circular prevention
- ✅ Product queries
- ✅ Category deletion
- ✅ Backward compatibility

---

## Next Steps

1. ✅ Deploy database migration
2. ✅ Test with sample data
3. ✅ Update frontend to use new tree endpoints
4. ✅ Update admin panel with category hierarchy UI
5. ✅ Monitor performance
6. ✅ Consider caching strategies

---

## Support Resources

- **Full Documentation:** `docs/HIERARCHICAL_CATEGORIES.md`
- **Core Library:** `src/lib/categoryHierarchy.js`
- **Tests:** `tests/categoryHierarchy.test.js`
- **API Code:** `src/app/api/admin/categories/` and `src/app/api/categories/`

## Version Info

- **Implementation Date:** September 6, 2026
- **Database Compatibility:** PostgreSQL 12+
- **Node.js Version:** 16+
- **Prisma Version:** 5.0+
