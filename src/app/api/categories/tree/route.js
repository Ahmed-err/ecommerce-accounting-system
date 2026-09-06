/**
 * Public Category Tree API
 * GET: Fetch hierarchical category tree with product counts
 * Used by storefront for navigation, menus, breadcrumbs
 */

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * Recursively build category tree with product counts
 */
async function buildCategoryTreeWithCounts(categories) {
  return Promise.all(
    categories.map(async (category) => {
      // Count products in this category
      const productCount = await prisma.product.count({
        where: {
          categoryId: category.id,
          isActive: true,
        },
      });

      // Recursively build children
      const children = category.children?.length
        ? await buildCategoryTreeWithCounts(category.children)
        : [];

      return {
        id: category.id,
        name: category.name,
        nameAr: category.nameAr,
        description: category.description,
        image: category.image,
        parentId: category.parentId,
        productCount,
        childCount: children.length,
        children,
      };
    })
  );
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const categoryId = searchParams.get('categoryId'); // Optional: get subtree for specific category

    let rootCategories;

    if (categoryId) {
      // Get tree for specific category (subtree)
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: {
          children: {
            orderBy: { name: 'asc' },
            include: {
              children: {
                orderBy: { name: 'asc' },
              },
            },
          },
        },
      });

      if (!category) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 }
        );
      }

      rootCategories = [category];
    } else {
      // Get all root categories (parentId is null)
      rootCategories = await prisma.category.findMany({
        where: { parentId: null },
        include: {
          children: {
            orderBy: { name: 'asc' },
            include: {
              children: {
                orderBy: { name: 'asc' },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    }

    // Build tree with product counts
    const tree = await buildCategoryTreeWithCounts(rootCategories);

    return NextResponse.json(
      {
        data: tree,
        success: true,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        },
      }
    );
  } catch (error) {
    console.error('Error fetching category tree:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category tree', message: error.message },
      { status: 500 }
    );
  }
}
