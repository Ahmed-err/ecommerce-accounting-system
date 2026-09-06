## Hierarchical Categories Implementation

### Overview

This document describes the implementation of hierarchical (parent-child) category relationships in the e-commerce system. Categories can now be organized in a tree structure, enabling better product organization and improved navigation.

### Architecture

#### Database Schema Changes

```prisma
model Category {
  id          String    @id @default(cuid())
  name        String    @unique
  nameAr      String?
  description String?
  image       String?
  parentId    String?   @default(null)           // NEW: Reference to parent category
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  products    Product[]
  parent      Category? @relation("CategoryHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children    Category[]  @relation("CategoryHierarchy")

  @@index([parentId])
}
```

**Key Points:**
- `parentId` is nullable - null means root-level category
- Self-referential relationship via "CategoryHierarchy" relation
- Cascade behavior: `onDelete: SetNull` orphans subcategories to root level
- Index on `parentId` for efficient queries

#### Migration

File: `prisma/migrations/20260906120000_add_hierarchical_categories/migration.sql`

```sql
ALTER TABLE "Category" ADD COLUMN "parentId" TEXT;
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" 
  FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL;
```

### Core Utilities

**File:** `src/lib/categoryHierarchy.js`

#### Key Functions

##### `wouldCreateCircularRelationship(categoryId, parentId)`
Prevents circular references by checking if the proposed parent is a descendant of the category.

```javascript
// Example: Prevent Electronics > Computers > Electronics
const isCircular = await wouldCreateCircularRelationship('electronics-id', 'computers-id');
if (isCircular) throw new Error('Circular relationship detected');
```

##### `getCategoryTree(parentId = null)`
Builds a complete hierarchical tree structure.

```javascript
// Get all root categories and their tree
const tree = await getCategoryTree();

// Get subtree for specific category
const subtree = await getCategoryTree('computers-id');
```

**Response:**
```json
[
  {
    "id": "cat-1",
    "name": "Electronics",
    "children": [
      {
        "id": "cat-2",
        "name": "Computers",
        "children": [
          {
            "id": "cat-3",
            "name": "Laptops",
            "children": []
          }
        ]
      }
    ]
  }
]
```

##### `getCategoryWithHierarchy(categoryId)`
Returns a category with breadcrumb path and all ancestors.

```javascript
const category = await getCategoryWithHierarchy('laptops-id');
// Returns: { id, name, ..., breadcrumb: [{id, name}, ...], ancestors: [...] }
```

##### `getAllDescendants(categoryId)`
Gets all descendant categories recursively.

```javascript
const descendants = await getAllDescendants('electronics-id');
// Returns all categories under Electronics (Computers, Laptops, etc.)
```

##### `getAllAncestors(categoryId)`
Gets all ancestor categories up to root.

```javascript
const ancestors = await getAllAncestors('laptops-id');
// Returns [Computers, Electronics]
```

##### `getProductsInCategoryTree(categoryId, options)`
Gets products in a category AND all its descendants with pagination.

```javascript
const { products, total } = await getProductsInCategoryTree('electronics-id', {
  skip: 0,
  take: 20,
  where: { isActive: true },
  orderBy: { createdAt: 'desc' }
});
```

##### `getProductsInCategory(categoryId, options)`
Gets products in a SINGLE category only (no descendants).

```javascript
const { products, total } = await getProductsInCategory('laptops-id', {
  skip: 0,
  take: 20
});
```

##### `moveCategory(categoryId, newParentId)`
Moves a category to a new parent with circular relationship validation.

```javascript
// Move Laptops under Electronics instead of Computers
await moveCategory('laptops-id', 'electronics-id');

// Move category to root level
await moveCategory('laptops-id', null);
```

##### `deleteCategory(categoryId)`
Deletes a category. Orphans children to parent level. Prevents deletion if products exist.

```javascript
try {
  await deleteCategory('empty-category-id');
} catch (error) {
  // Error if category has products
}
```

### API Endpoints

#### 1. Admin Categories List/Create
**Endpoint:** `POST/GET /api/admin/categories`

**GET Parameters:**
- `tree=true` - Return hierarchical tree instead of flat list

**GET Response (Flat List):**
```json
{
  "data": [
    {
      "id": "cat-1",
      "name": "Electronics",
      "nameAr": "الإلكترونيات",
      "parentId": null,
      "_count": {
        "products": 15,
        "children": 3
      }
    }
  ],
  "success": true
}
```

**GET Response (Tree):**
```json
{
  "data": [
    {
      "id": "cat-1",
      "name": "Electronics",
      "children": [
        {
          "id": "cat-2",
          "name": "Computers",
          "children": [...]
        }
      ]
    }
  ],
  "success": true
}
```

**POST Request:**
```json
{
  "name": "Laptops",
  "nameAr": "أجهزة محمولة",
  "description": "Portable computers",
  "image": "https://...",
  "parentId": "computers-id"  // Optional
}
```

**POST Response:**
```json
{
  "data": {
    "id": "cat-3",
    "name": "Laptops",
    "parentId": "computers-id",
    "parent": {
      "id": "computers-id",
      "name": "Computers"
    },
    "children": []
  },
  "message": "Category created successfully",
  "success": true
}
```

#### 2. Admin Category by ID
**Endpoint:** `GET/PUT/DELETE /api/admin/categories/[id]`

**GET Response:**
```json
{
  "data": {
    "id": "cat-3",
    "name": "Laptops",
    "breadcrumb": [
      { "id": "cat-1", "name": "Electronics" },
      { "id": "cat-2", "name": "Computers" },
      { "id": "cat-3", "name": "Laptops" }
    ],
    "ancestors": [...],
    "_count": {
      "products": 42,
      "children": 0
    }
  },
  "success": true
}
```

**PUT Request:**
```json
{
  "name": "Updated Name",
  "nameAr": "الاسم المحدث",
  "description": "New description",
  "image": "https://new-image.jpg",
  "parentId": "new-parent-id"  // Optional - triggers circular check
}
```

**PUT Response:**
```json
{
  "data": { /* updated category */ },
  "message": "Category updated successfully",
  "success": true
}
```

**DELETE Response:**
```json
{
  "data": { /* deleted category */ },
  "message": "Category deleted successfully",
  "success": true
}
```

**Error Responses:**
```json
// Category has products
{
  "error": "Cannot delete category with products",
  "details": "This category has 15 product(s). Please reassign or delete them first.",
  "status": 409
}

// Circular relationship
{
  "error": "Cannot set parent: this would create a circular relationship",
  "status": 400
}

// Parent not found
{
  "error": "Parent category not found",
  "status": 404
}
```

#### 3. Public Category Tree
**Endpoint:** `GET /api/categories/tree`

**Query Parameters:**
- `categoryId` - Optional: get subtree for specific category

**Response:**
```json
{
  "data": [
    {
      "id": "cat-1",
      "name": "Electronics",
      "nameAr": "الإلكترونيات",
      "description": "Electronic devices",
      "image": "https://...",
      "productCount": 150,
      "childCount": 3,
      "children": [
        {
          "id": "cat-2",
          "name": "Computers",
          "productCount": 45,
          "childCount": 2,
          "children": [...]
        }
      ]
    }
  ],
  "success": true,
  "timestamp": "2026-09-06T12:00:00.000Z"
}
```

**Cache:**
- Responses cached for 5 minutes (`Cache-Control: public, max-age=300`)

### Usage Examples

#### Frontend: Display Category Navigation

```javascript
// Fetch category tree
const response = await fetch('/api/categories/tree');
const { data: categoryTree } = await response.json();

// Render recursive menu
function renderCategoryMenu(categories) {
  return categories.map(cat => (
    <div key={cat.id}>
      <a href={`/category/${cat.id}`}>
        {cat.name} ({cat.productCount})
      </a>
      {cat.children.length > 0 && (
        <ul>
          {renderCategoryMenu(cat.children)}
        </ul>
      )}
    </div>
  ));
}
```

#### Frontend: Display Breadcrumbs

```javascript
// Fetch category with hierarchy
const response = await fetch(`/api/admin/categories/${categoryId}`);
const { data: category } = await response.json();

// Render breadcrumb
function renderBreadcrumb(breadcrumb) {
  return breadcrumb.map((item, index) => (
    <span key={item.id}>
      <a href={`/category/${item.id}`}>{item.name}</a>
      {index < breadcrumb.length - 1 && ' > '}
    </span>
  ));
}
```

#### Admin: Create Subcategory

```javascript
async function createSubcategory(parentId, categoryData) {
  const response = await fetch('/api/admin/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...categoryData,
      parentId
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return response.json();
}
```

#### Admin: Move Category

```javascript
async function moveCategory(categoryId, newParentId) {
  const response = await fetch(`/api/admin/categories/${categoryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentId: newParentId })
  });
  
  if (!response.ok) {
    const error = await response.json();
    if (error.error.includes('circular')) {
      throw new Error('Cannot move: this would create a circular relationship');
    }
    throw new Error(error.error);
  }
  
  return response.json();
}
```

#### Admin: Get Products in Category Tree

```javascript
import { getProductsInCategoryTree } from '@/lib/categoryHierarchy';

async function displayCategoryProducts(categoryId) {
  const { products, total } = await getProductsInCategoryTree(categoryId, {
    skip: 0,
    take: 20,
    where: { isActive: true },
    orderBy: { name: 'asc' }
  });
  
  console.log(`Found ${total} products in ${categoryId} and subcategories`);
  return products;
}
```

### Backward Compatibility

✅ **Fully Backward Compatible**

- Existing categories without `parentId` work as before (treated as root)
- All existing queries and relations remain functional
- `Product-Category` relationship unchanged
- No breaking changes to existing APIs

**Migration Path:**
1. Deploy schema changes
2. Run database migration
3. Existing categories automatically get `parentId = null`
4. Begin organizing categories into hierarchy as needed
5. No downtime required

### Data Integrity & Validation

#### Circular Relationship Prevention

The system automatically prevents circular relationships:

```
❌ Electronics > Computers > Electronics  // Prevented
❌ A > B > C > A                          // Prevented
✅ Electronics > Computers > Laptops      // Allowed
```

#### Product Cascading

When querying products in a category:

```javascript
// Includes Laptops in addition to direct Computers products
const products = await getProductsInCategoryTree('computers-id');

// Only direct products in Computers
const products = await getProductsInCategory('computers-id');
```

#### Deletion Safety

```javascript
// ✅ Category is empty - deletion succeeds
await deleteCategory('empty-cat-id');

// ❌ Category has products - deletion fails
// Error: "Cannot delete category with 15 product(s)..."
await deleteCategory('cat-with-products');

// Children are orphaned to parent level on deletion
// Electronics > Computers > Laptops
// Delete Computers → Laptops becomes root level
```

### Performance Considerations

#### Indexing
- `Category.parentId` indexed for efficient parent lookups
- `Product.categoryId` indexed (existing)

#### Query Optimization
```javascript
// Efficient: Uses indexed parentId
const children = await prisma.category.findMany({
  where: { parentId: 'cat-id' }
});

// Use pagination for large result sets
const { products, total } = await getProductsInCategoryTree(categoryId, {
  skip: 0,
  take: 50
});
```

#### Caching
- Public tree endpoint cached for 5 minutes
- Consider caching in frontend for navigation

### Testing

Comprehensive test suite: `tests/categoryHierarchy.test.js`

**Run tests:**
```bash
npm run test:unit -- categoryHierarchy.test.js
```

**Test Coverage:**
- ✅ Tree building
- ✅ Ancestor/descendant navigation
- ✅ Circular relationship prevention
- ✅ Category moving
- ✅ Product querying
- ✅ Category deletion
- ✅ Backward compatibility

### Troubleshooting

#### Circular Relationship Error
```
Error: "Cannot move category: this would create a circular relationship"
```
**Solution:** Ensure you're not moving a category under itself or its descendants.

#### "Cannot delete category with products"
```
Error: "Cannot delete category with 15 product(s)..."
```
**Solution:** 
1. Move products to different category, OR
2. Delete the products first

#### Missing Products in Tree Query
**Check:**
- Product's `categoryId` matches expected category
- Product has `isActive: true`
- Using `getProductsInCategoryTree()` vs `getProductsInCategory()`

### Migration & Rollback

#### Forward Migration (Applied)
```bash
npx prisma migrate deploy
```

#### Rollback (if needed)
```bash
# Reset database to previous state
npx prisma migrate resolve --rolled-back "20260906120000_add_hierarchical_categories"

# OR manually:
# 1. Delete migration folder: prisma/migrations/20260906120000_*
# 2. Remove parentId column from schema
# 3. Delete parent/children relations
# 4. npx prisma migrate deploy
```

### Future Enhancements

1. **Category Sorting** - Add `sortOrder` field for manual ordering
2. **Soft Deletes** - Archive categories instead of hard delete
3. **Analytics** - Track category popularity by product views
4. **SEO** - Breadcrumb schema markup
5. **Performance** - Materialized path for faster ancestor queries
6. **Bulk Operations** - Move multiple categories at once

### Support

For issues or questions:
1. Check this documentation
2. Review test cases in `tests/categoryHierarchy.test.js`
3. Check error messages in API responses
4. Review `src/lib/categoryHierarchy.js` inline documentation
