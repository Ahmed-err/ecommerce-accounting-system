/**
 * Admin Category by ID API
 * GET: Fetch single category with hierarchy info
 * PUT: Update category (name, description, parentId)
 * DELETE: Delete category
 */

import { prisma } from '@/lib/prisma';
import {
  getCategoryWithHierarchy,
  moveCategory,
  deleteCategory,
  wouldCreateCircularRelationship,
} from '@/lib/categoryHierarchy';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    const { id } = params;

    const category = await getCategoryWithHierarchy(id);

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Include product and children count
    const [productCount, childCount] = await Promise.all([
      prisma.product.count({ where: { categoryId: id } }),
      prisma.category.count({ where: { parentId: id } }),
    ]);

    return NextResponse.json({
      data: {
        ...category,
        _count: {
          products: productCount,
          children: childCount,
        },
      },
      success: true,
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category', message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { name, nameAr, description, image, parentId } = body;

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // If name is being changed, check uniqueness
    if (name && name !== category.name) {
      const existing = await prisma.category.findUnique({
        where: { name },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Category name already exists' },
          { status: 400 }
        );
      }
    }

    // Validate parent if provided and different
    if (parentId !== undefined && parentId !== category.parentId) {
      if (parentId) {
        // Check if parent exists
        const parent = await prisma.category.findUnique({
          where: { id: parentId },
        });

        if (!parent) {
          return NextResponse.json(
            { error: 'Parent category not found' },
            { status: 404 }
          );
        }

        // Check for circular relationships
        const isCircular = await wouldCreateCircularRelationship(id, parentId);
        if (isCircular) {
          return NextResponse.json(
            {
              error: 'Cannot set parent: this would create a circular relationship',
            },
            { status: 400 }
          );
        }
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(nameAr !== undefined && { nameAr: nameAr || null }),
        ...(description !== undefined && { description: description || null }),
        ...(image !== undefined && { image: image || null }),
        ...(parentId !== undefined && { parentId: parentId || null }),
      },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      data: updatedCategory,
      message: 'Category updated successfully',
      success: true,
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if category has products
    const productCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete category with products',
          details: `This category has ${productCount} product(s). Please reassign or delete them first.`,
        },
        { status: 409 }
      );
    }

    // Delete using utility (handles orphaning of children)
    const deleted = await deleteCategory(id);

    return NextResponse.json({
      data: deleted,
      message: 'Category deleted successfully',
      success: true,
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category', message: error.message },
      { status: 500 }
    );
  }
}
