/**
 * Category hierarchy utilities
 * Handles validation, tree building, and circular relationship prevention
 */

import { prisma } from '@/lib/prisma';

/**
 * Check if assigning parentId to a category would create a circular relationship
 * @param {string} categoryId - The category being modified
 * @param {string} parentId - The proposed parent category ID
 * @returns {Promise<boolean>} true if circular relationship would occur
 */
export async function wouldCreateCircularRelationship(categoryId, parentId) {
  if (!parentId) return false;
  if (categoryId === parentId) return true; // Self-reference

  // Get all descendants of the category being modified
  const descendants = await getAllDescendants(categoryId);
  
  // If the proposed parent is a descendant, it would create a cycle
  return descendants.some(d => d.id === parentId);
}

/**
 * Get all descendant categories recursively
 * @param {string} categoryId - The parent category ID
 * @returns {Promise<Array>} Array of descendant categories
 */
export async function getAllDescendants(categoryId) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { children: true },
  });

  if (!category || !category.children.length) {
    return [];
  }

  let descendants = [...category.children];
  
  for (const child of category.children) {
    const childDescendants = await getAllDescendants(child.id);
    descendants = [...descendants, ...childDescendants];
  }

  return descendants;
}

/**
 * Get all ancestor categories recursively
 * @param {string} categoryId - The child category ID
 * @returns {Promise<Array>} Array of ancestor categories
 */
export async function getAllAncestors(categoryId) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { parent: true },
  });

  if (!category || !category.parent) {
    return [];
  }

  let ancestors = [category.parent];
  const parentAncestors = await getAllAncestors(category.parent.id);
  ancestors = [...ancestors, ...parentAncestors];

  return ancestors;
}

/**
 * Build a hierarchical tree of categories
 * @param {string} parentId - Optional parent ID to build tree for. If null, returns root categories
 * @returns {Promise<Array>} Array of category trees
 */
export async function getCategoryTree(parentId = null) {
  const categories = await prisma.category.findMany({
    where: { parentId },
    include: { children: true },
    orderBy: { name: 'asc' },
  });

  // Recursively build tree
  const buildTree = async (cats) => {
    return Promise.all(
      cats.map(async (cat) => ({
        ...cat,
        children: await buildTree(cat.children),
      }))
    );
  };

  return buildTree(categories);
}

/**
 * Get a category with full hierarchy information
 * @param {string} categoryId - The category ID
 * @returns {Promise<Object>} Category with breadcrumb ancestors and descendants
 */
export async function getCategoryWithHierarchy(categoryId) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      parent: true,
      children: {
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!category) {
    return null;
  }

  // Get full ancestor chain for breadcrumbs
  const ancestors = await getAllAncestors(categoryId);

  return {
    ...category,
    ancestors, // Full breadcrumb path
    breadcrumb: [
      ...ancestors.reverse(),
      { id: categoryId, name: category.name },
    ].map(c => ({ id: c.id, name: c.name, nameAr: c.nameAr })),
  };
}

/**
 * Get all products in a category and its descendants
 * @param {string} categoryId - The category ID
 * @param {Object} options - Query options (skip, take, where, orderBy, etc.)
 * @returns {Promise<Object>} { products, total }
 */
export async function getProductsInCategoryTree(categoryId, options = {}) {
  const { skip = 0, take = 20, where = {}, orderBy = { createdAt: 'desc' } } = options;

  // Get the category and all its descendants
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    return { products: [], total: 0 };
  }

  const descendants = await getAllDescendants(categoryId);
  const allCategoryIds = [categoryId, ...descendants.map(d => d.id)];

  // Get products in all these categories
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: {
        categoryId: { in: allCategoryIds },
        ...where,
      },
      skip,
      take,
      orderBy,
    }),
    prisma.product.count({
      where: {
        categoryId: { in: allCategoryIds },
        ...where,
      },
    }),
  ]);

  return { products, total };
}

/**
 * Get products in a single category only (not descendants)
 * @param {string} categoryId - The category ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} { products, total }
 */
export async function getProductsInCategory(categoryId, options = {}) {
  const { skip = 0, take = 20, where = {}, orderBy = { createdAt: 'desc' } } = options;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: {
        categoryId,
        ...where,
      },
      skip,
      take,
      orderBy,
    }),
    prisma.product.count({
      where: {
        categoryId,
        ...where,
      },
    }),
  ]);

  return { products, total };
}

/**
 * Move a category to a new parent
 * @param {string} categoryId - The category to move
 * @param {string|null} newParentId - The new parent ID (null for root)
 * @returns {Promise<Object>} Updated category
 */
export async function moveCategory(categoryId, newParentId) {
  // Validation: prevent self-assignment
  if (categoryId === newParentId) {
    throw new Error('A category cannot be its own parent');
  }

  // Validation: prevent circular relationships
  if (newParentId) {
    const isCircular = await wouldCreateCircularRelationship(categoryId, newParentId);
    if (isCircular) {
      throw new Error(
        'Cannot move category: this would create a circular relationship'
      );
    }
  }

  return prisma.category.update({
    where: { id: categoryId },
    data: { parentId: newParentId },
    include: { parent: true, children: true },
  });
}

/**
 * Delete a category and handle orphaning of subcategories
 * Strategy: Move all direct children to parent level
 * @param {string} categoryId - The category to delete
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteCategory(categoryId) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { children: true },
  });

  if (!category) {
    throw new Error('Category not found');
  }

  // Check if category has products
  const productCount = await prisma.product.count({
    where: { categoryId },
  });

  if (productCount > 0) {
    throw new Error(
      `Cannot delete category with ${productCount} product(s). Please reassign or delete products first.`
    );
  }

  // Move all children to parent level (onDelete: SetNull in schema handles this)
  // But we can optionally move them explicitly
  if (category.children.length > 0 && category.parentId) {
    await prisma.category.updateMany({
      where: { id: { in: category.children.map(c => c.id) } },
      data: { parentId: category.parentId },
    });
  }

  // Delete the category
  return prisma.category.delete({
    where: { id: categoryId },
  });
}
