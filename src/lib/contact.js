import { prisma as db } from "@/lib/prisma";

export async function getUnreadContactMessageCount() {
  try {
    return db.contactMessage.count({ where: { status: "NEW" } });
  } catch {
    return 0;
  }
}

export async function listActiveFaqs() {
  try {
    return db.faq.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch {
    return [];
  }
}

export async function createContactMessageRecord(data) {
  return db.contactMessage.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      subject: data.subject,
      message: data.message,
    },
  });
}

export async function listContactMessagesAdmin({ status, from, to, skip = 0, take = 50 } = {}) {
  const where = {
    ...(status && status !== "all" ? { status } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.contactMessage.count({ where }),
  ]);
  return { rows, total };
}

export async function getContactMessageById(id) {
  return db.contactMessage.findUnique({ where: { id } });
}

export async function markContactMessageRead(id) {
  return db.contactMessage.update({
    where: { id },
    data: { status: "READ" },
  });
}

export async function replyToContactMessage(id, adminReply) {
  return db.contactMessage.update({
    where: { id },
    data: { adminReply, status: "REPLIED" },
  });
}

export async function deleteContactMessage(id) {
  return db.contactMessage.delete({ where: { id } });
}
