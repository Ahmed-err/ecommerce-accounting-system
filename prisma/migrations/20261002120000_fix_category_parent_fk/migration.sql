-- Align Category.parentId FK with schema.prisma (ON UPDATE CASCADE was missing
-- from 20260906120000_add_hierarchical_categories).
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_parentId_fkey";

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
