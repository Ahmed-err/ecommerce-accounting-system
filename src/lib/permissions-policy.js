import { prisma as db } from "@/lib/prisma";
import { PERMISSION_MODULES, getDefaultPermissionFlags } from "@/lib/permission-defaults";

const STAFF_ROLES_FOR_PERMS = ["ADMIN", "MANAGER", "CASHIER"];

export async function ensurePermissionRows() {
  for (const role of STAFF_ROLES_FOR_PERMS) {
    for (const mod of PERMISSION_MODULES) {
      const existing = await db.permission.findUnique({
        where: { role_module: { role, module: mod } },
      });
      if (existing) continue;
      const flags = getDefaultPermissionFlags(role, mod);
      await db.permission.create({
        data: {
          role,
          module: mod,
          canView: flags.canView,
          canCreate: flags.canCreate,
          canEdit: flags.canEdit,
          canDelete: flags.canDelete,
        },
      });
    }
  }
}

export async function getNavPermissionMap(role) {
  const r = String(role || "").toUpperCase();
  if (r === "ADMIN") {
    return Object.fromEntries(PERMISSION_MODULES.map((m) => [m, { canView: true, canCreate: true, canEdit: true, canDelete: true }]));
  }
  if (r === "CUSTOMER" || !STAFF_ROLES_FOR_PERMS.includes(r)) {
    return {};
  }
  await ensurePermissionRows();
  const rows = await db.permission.findMany({
    where: { role: r },
  });
  const map = {};
  for (const m of PERMISSION_MODULES) {
    map[m] = { canView: false, canCreate: false, canEdit: false, canDelete: false };
  }
  for (const row of rows) {
    if (!PERMISSION_MODULES.includes(row.module)) continue;
    map[row.module] = {
      canView: !!row.canView,
      canCreate: !!row.canCreate,
      canEdit: !!row.canEdit,
      canDelete: !!row.canDelete,
    };
  }
  return map;
}

export async function staffCanViewModule(role, module) {
  const r = String(role || "").toUpperCase();
  if (r === "ADMIN") return true;
  if (r === "CUSTOMER" || !r) return false;
  if (!["MANAGER", "CASHIER"].includes(r)) return false;
  return roleHasModuleCapability(r, module, "view");
}

export async function roleHasModuleCapability(role, module, capability) {
  const r = String(role || "").toUpperCase();
  if (r === "ADMIN") return true;
  const mod = String(module || "").toLowerCase();
  const cap = String(capability || "").toLowerCase();
  const key = { view: "canView", create: "canCreate", edit: "canEdit", delete: "canDelete" }[cap];
  if (!key) return false;
  await ensurePermissionRows();
  const row = await db.permission.findUnique({
    where: { role_module: { role: r, module: mod } },
  });
  if (!row) return false;
  return !!row[key];
}
