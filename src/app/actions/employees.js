"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function getEmployees({
  search = "",
  role = "all",
  department = "",
  page = 1,
  limit = 10,
} = {}) {
  try {
    const where = {
      role: { not: "CUSTOMER" },
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(role && role !== "all" ? { role: role.toUpperCase() } : {}),
      ...(department && department !== "all"
        ? { department: { equals: department, mode: "insensitive" } }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [employees, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          salary: true,
          hireDate: true,
          department: true,
          avatar: true,
          createdAt: true,
        },
      }),
      db.user.count({ where }),
    ]);

    return { employees, total };
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    return { employees: [], total: 0 };
  }
}

export async function getDepartments() {
  try {
    const rows = await db.user.findMany({
      where: { role: { not: "CUSTOMER" }, department: { not: null } },
      select: { department: true },
      distinct: ["department"],
      orderBy: { department: "asc" },
    });
    return rows.map((r) => r.department).filter(Boolean);
  } catch (error) {
    console.error("Failed to fetch departments:", error);
    return [];
  }
}

export async function createEmployee(data) {
  try {
    if (!data.email || !data.firstName || !data.lastName || !data.password) {
      return { success: false, error: "Missing required fields." };
    }

    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return { success: false, error: "A user with this email already exists." };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const employee = await db.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        password: hashedPassword,
        phone: data.phone || null,
        role: data.role || "CASHIER",
        salary: data.salary ? parseFloat(data.salary) : null,
        hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
        department: data.department || null,
      },
    });

    revalidatePath("/admin/employees");
    return { success: true, employee };
  } catch (error) {
    console.error("Failed to create employee:", error);
    return { success: false, error: error.message };
  }
}

export async function updateEmployee(id, data) {
  try {
    const updateData = {
      firstName: data.firstName,
      lastName: data.lastName,
      name: `${data.firstName} ${data.lastName}`,
      phone: data.phone || null,
      role: data.role,
      salary: data.salary ? parseFloat(data.salary) : null,
      hireDate: data.hireDate ? new Date(data.hireDate) : null,
      department: data.department || null,
    };

    // Only update password if provided
    if (data.password && data.password.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(data.password, salt);
    }

    const employee = await db.user.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/admin/employees");
    return { success: true, employee };
  } catch (error) {
    console.error("Failed to update employee:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteEmployee(id) {
  try {
    await db.user.delete({ where: { id } });
    revalidatePath("/admin/employees");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete employee:", error);
    return { success: false, error: error.message };
  }
}
