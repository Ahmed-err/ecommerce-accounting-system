// Wipes every application table. Only call after assertSafeSeedTarget().
export async function truncateAll(prisma) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  );
  if (!rows.length) return;
  const tables = rows.map((r) => `"public"."${r.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}
