"use server";

import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";
import { PERMISSION_MODULES, getDefaultPermissionFlags } from "@/lib/permission-defaults";
import { ensurePermissionRows } from "@/lib/permissions-policy";

async function ensureAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin only.");
  }
  return session.user;
}

export async function listRolePermissions() {
  try {
    await ensureAdmin();
    await ensurePermissionRows();
    const rows = await db.permission.findMany({
      orderBy: [{ module: "asc" }, { role: "asc" }],
    });
    return { success: true, permissions: rows };
  } catch (e) {
    console.error("listRolePermissions:", e);
    return { success: false, error: e.message, permissions: [] };
  }
}

export async function updateRolePermission(id, patch) {
  try {
    await ensureAdmin();
    if (!id || typeof patch !== "object" || patch === null) {
      return { success: false, error: "Invalid payload." };
    }
    const row = await db.permission.findUnique({ where: { id } });
    if (!row) return { success: false, error: "Permission not found." };
    if (row.role === "ADMIN") {
      return { success: false, error: "Admin permissions cannot be changed." };
    }
    const data = {};
    if ("canView" in patch) data.canView = !!patch.canView;
    if ("canCreate" in patch) data.canCreate = !!patch.canCreate;
    if ("canEdit" in patch) data.canEdit = !!patch.canEdit;
    if ("canDelete" in patch) data.canDelete = !!patch.canDelete;
    if (Object.keys(data).length === 0) {
      return { success: false, error: "No fields to update." };
    }
    const updated = await db.permission.update({
      where: { id },
      data,
    });
    await logAction("UPDATE_ROLE_PERMISSION", {
      permissionId: id,
      role: row.role,
      module: row.module,
      ...data,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/employees");
    return { success: true, permission: updated };
  } catch (e) {
    console.error("updateRolePermission:", e);
    return { success: false, error: e.message };
  }
}

export async function resetRolePermissionsToDefaults(role) {
  try {
    await ensureAdmin();
    const r = String(role || "").toUpperCase();
    if (r === "ADMIN") {
      return { success: false, error: "Cannot reset admin role." };
    }
    if (!["MANAGER", "CASHIER"].includes(r)) {
      return { success: false, error: "Invalid role." };
    }
    await ensurePermissionRows();
    for (const mod of PERMISSION_MODULES) {
      const flags = getDefaultPermissionFlags(r, mod);
      await db.permission.update({
        where: { role_module: { role: r, module: mod } },
        data: flags,
      });
    }
    await logAction("RESET_ROLE_PERMISSIONS", { role: r });
    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/employees");
    const rows = await db.permission.findMany({
      where: { role: r },
      orderBy: { module: "asc" },
    });
    return { success: true, permissions: rows };
  } catch (e) {
    console.error("resetRolePermissionsToDefaults:", e);
    return { success: false, error: e.message };
  }
}
