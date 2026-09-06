/**
 * Admin Categories API
 * GET: List all categories (flat or tree)
 * POST: Create new category
 */

import { prisma } from '@/lib/prisma';
import { getCategoryTree, wouldCreateCircularRelationship } from '@/lib/categoryHierarchy';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tree = searchParams.get('tree') === 'true';

    if (tree) {
      // Return hierarchical tree view
      const categories = await getCategoryTree();
      return NextResponse.json({ data: categories, success: true });
    }

    // Return flat list (backward compatible)
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { products: true, children: true } },
        parent: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: categories, success: true });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, nameAr, description, image, parentId } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check if category name already exists
    const existing = await prisma.category.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Category name already exists' },
        { status: 400 }
      );
    }

    // Validate parent if provided
    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
      });

      if (!parent) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 404 }
        );
      }
    }

    const category = await prisma.category.create({
      data: {
        name,
        nameAr: nameAr || null,
        description: description || null,
        image: image || null,
        parentId: parentId || null,
      },
      include: {
        parent: { select: { id: true, name: true } },
        children: true,
      },
    });

    return NextResponse.json(
      { data: category, message: 'Category created successfully', success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category', message: error.message },
      { status: 500 }
    );
  }
}
