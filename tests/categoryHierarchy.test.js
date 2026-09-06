/**
 * Category Hierarchy Tests
 * Tests for parent-child relationships, circular prevention, and tree operations
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  getCategoryTree,
  getCategoryWithHierarchy,
  getAllDescendants,
  getAllAncestors,
  wouldCreateCircularRelationship,
  getProductsInCategoryTree,
  getProductsInCategory,
  moveCategory,
  deleteCategory,
} from '@/lib/categoryHierarchy';

describe('Category Hierarchy Tests', () => {
  let rootCategory, childCategory, grandchildCategory, productCategory;
  let testProduct;

  beforeAll(async () => {
    // Clean up test data
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});

    // Create test hierarchy
    rootCategory = await prisma.category.create({
      data: {
        name: 'Electronics',
        nameAr: 'الإلكترونيات',
        description: 'Electronic devices',
      },
    });

    childCategory = await prisma.category.create({
      data: {
        name: 'Computers',
        nameAr: 'الحواسيب',
        parentId: rootCategory.id,
      },
    });

    grandchildCategory = await prisma.category.create({
      data: {
        name: 'Laptops',
        nameAr: 'أجهزة محمولة',
        parentId: childCategory.id,
      },
    });

    productCategory = await prisma.category.create({
      data: {
        name: 'Appliances',
        nameAr: 'الأجهزة المنزلية',
      },
    });

    // Create test product
    testProduct = await prisma.product.create({
      data: {
        name: 'Test Laptop',
        sku: 'TEST-001',
        purchasePrice: 500,
        sellingPrice: 800,
        categoryId: grandchildCategory.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
  });

  describe('Category Tree Building', () => {
    it('should build complete category tree from root', async () => {
      const tree = await getCategoryTree();

      expect(tree).toBeDefined();
      expect(tree.length).toBeGreaterThan(0);

      const electronics = tree.find(c => c.id === rootCategory.id);
      expect(electronics).toBeDefined();
      expect(electronics.children).toBeDefined();
      expect(electronics.children.length).toBe(1);
      expect(electronics.children[0].name).toBe('Computers');
    });

    it('should build subtree for specific category', async () => {
      const tree = await getCategoryTree(childCategory.id);

      expect(tree).toBeDefined();
      expect(tree[0].id).toBe(childCategory.id);
      expect(tree[0].children.length).toBe(1);
      expect(tree[0].children[0].name).toBe('Laptops');
    });
  });

  describe('Hierarchy Navigation', () => {
    it('should get all ancestors for a category', async () => {
      const ancestors = await getAllAncestors(grandchildCategory.id);

      expect(ancestors.length).toBe(2);
      expect(ancestors[0].id).toBe(childCategory.id);
      expect(ancestors[1].id).toBe(rootCategory.id);
    });

    it('should get all descendants for a category', async () => {
      const descendants = await getAllDescendants(rootCategory.id);

      expect(descendants.length).toBe(2);
      const descendantIds = descendants.map(d => d.id);
      expect(descendantIds).toContain(childCategory.id);
      expect(descendantIds).toContain(grandchildCategory.id);
    });

    it('should return empty array for leaf categories', async () => {
      const descendants = await getAllDescendants(grandchildCategory.id);
      expect(descendants.length).toBe(0);
    });

    it('should return category with breadcrumb hierarchy', async () => {
      const category = await getCategoryWithHierarchy(grandchildCategory.id);

      expect(category).toBeDefined();
      expect(category.breadcrumb).toBeDefined();
      expect(category.breadcrumb.length).toBe(3);
      expect(category.breadcrumb[0].name).toBe('Electronics');
      expect(category.breadcrumb[1].name).toBe('Computers');
      expect(category.breadcrumb[2].name).toBe('Laptops');
    });
  });

  describe('Circular Relationship Prevention', () => {
    it('should detect self-reference', async () => {
      const isCircular = await wouldCreateCircularRelationship(
        rootCategory.id,
        rootCategory.id
      );
      expect(isCircular).toBe(true);
    });

    it('should detect child as parent (immediate)', async () => {
      const isCircular = await wouldCreateCircularRelationship(
        rootCategory.id,
        childCategory.id
      );
      expect(isCircular).toBe(true);
    });

    it('should detect grandchild as parent (indirect)', async () => {
      const isCircular = await wouldCreateCircularRelationship(
        rootCategory.id,
        grandchildCategory.id
      );
      expect(isCircular).toBe(true);
    });

    it('should allow valid parent assignment', async () => {
      const isCircular = await wouldCreateCircularRelationship(
        childCategory.id,
        productCategory.id
      );
      expect(isCircular).toBe(false);
    });

    it('should allow null parent (root level)', async () => {
      const isCircular = await wouldCreateCircularRelationship(childCategory.id, null);
      expect(isCircular).toBe(false);
    });
  });

  describe('Category Moving', () => {
    it('should move category to new parent', async () => {
      const newParent = await prisma.category.create({
        data: {
          name: 'Mobile Devices',
          nameAr: 'الأجهزة المحمولة',
        },
      });

      const movedCategory = await prisma.category.create({
        data: {
          name: 'Phones',
          nameAr: 'الهواتف',
          parentId: rootCategory.id,
        },
      });

      const result = await moveCategory(movedCategory.id, newParent.id);

      expect(result.parentId).toBe(newParent.id);

      // Cleanup
      await prisma.category.delete({ where: { id: newParent.id } });
      await prisma.category.delete({ where: { id: movedCategory.id } });
    });

    it('should throw error on circular relationship during move', async () => {
      try {
        await moveCategory(rootCategory.id, childCategory.id);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('circular');
      }
    });

    it('should throw error on self-assignment', async () => {
      try {
        await moveCategory(rootCategory.id, rootCategory.id);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('cannot be its own parent');
      }
    });
  });

  describe('Product Querying', () => {
    it('should get products in single category only', async () => {
      const result = await getProductsInCategory(grandchildCategory.id);

      expect(result.products).toBeDefined();
      expect(result.total).toBe(1);
      expect(result.products[0].id).toBe(testProduct.id);
    });

    it('should get products in category and descendants', async () => {
      // Add another product to child category
      const anotherProduct = await prisma.product.create({
        data: {
          name: 'Desktop Computer',
          sku: 'TEST-002',
          purchasePrice: 800,
          sellingPrice: 1200,
          categoryId: childCategory.id,
        },
      });

      const result = await getProductsInCategoryTree(childCategory.id);

      expect(result.total).toBe(2); // Laptop in Laptops + Desktop in Computers
      expect(result.products.length).toBe(2);

      // Cleanup
      await prisma.product.delete({ where: { id: anotherProduct.id } });
    });

    it('should respect pagination in product queries', async () => {
      const result = await getProductsInCategory(grandchildCategory.id, {
        skip: 0,
        take: 10,
      });

      expect(result.products).toBeDefined();
      expect(result.total).toBeDefined();
    });
  });

  describe('Category Deletion', () => {
    it('should prevent deletion of category with products', async () => {
      try {
        await deleteCategory(grandchildCategory.id);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('product');
      }
    });

    it('should delete empty category', async () => {
      const emptyCategory = await prisma.category.create({
        data: {
          name: 'Empty Category',
          nameAr: 'فئة فارغة',
        },
      });

      const result = await deleteCategory(emptyCategory.id);

      expect(result.id).toBe(emptyCategory.id);

      const deleted = await prisma.category.findUnique({
        where: { id: emptyCategory.id },
      });

      expect(deleted).toBeNull();
    });

    it('should handle orphaned children gracefully', async () => {
      const parent = await prisma.category.create({
        data: {
          name: 'Parent Category',
          nameAr: 'فئة الأب',
        },
      });

      const child = await prisma.category.create({
        data: {
          name: 'Child Category',
          nameAr: 'فئة الطفل',
          parentId: parent.id,
        },
      });

      const grandchild = await prisma.category.create({
        data: {
          name: 'Grandchild Category',
          nameAr: 'فئة الحفيد',
          parentId: child.id,
        },
      });

      // Delete parent - children should be orphaned
      await deleteCategory(parent.id);

      const orphanedChild = await prisma.category.findUnique({
        where: { id: child.id },
      });

      // Child should have parentId = null (orphaned to root level)
      expect(orphanedChild.parentId).toBeNull();

      // Cleanup
      await prisma.category.deleteMany({
        where: { id: { in: [child.id, grandchild.id] } },
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should allow creating category without parent (root level)', async () => {
      const category = await prisma.category.create({
        data: {
          name: 'New Root Category',
          nameAr: 'فئة جذر جديدة',
        },
      });

      expect(category.parentId).toBeNull();

      await prisma.category.delete({ where: { id: category.id } });
    });

    it('should maintain existing category functionality', async () => {
      const category = await prisma.category.findUnique({
        where: { id: rootCategory.id },
      });

      expect(category.id).toBe(rootCategory.id);
      expect(category.name).toBe('Electronics');
      expect(category.nameAr).toBe('الإلكترونيات');
      expect(category.description).toBe('Electronic devices');
    });

    it('should allow updating category without affecting parent', async () => {
      const updated = await prisma.category.update({
        where: { id: rootCategory.id },
        data: {
          description: 'Updated description',
        },
      });

      expect(updated.description).toBe('Updated description');
      expect(updated.parentId).toBeNull();
    });
  });
});
