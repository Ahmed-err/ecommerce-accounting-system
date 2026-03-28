import { prisma as db } from "./prisma";
import { auth } from "@/auth";

export async function logAction(actionName, details = null) {
  try {
    const session = await auth();
    const userId = session?.user?.id || null;

    await db.auditLog.create({
      data: {
        userId,
        action: actionName,
        details: typeof details === "string" ? details : JSON.stringify(details),
      },
    });
    return true;
  } catch (error) {
    console.error("Failed to write to AuditLog:", error.message);
    return false;
  }
}
