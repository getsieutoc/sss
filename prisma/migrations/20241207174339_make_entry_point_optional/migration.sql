-- AlterTable
ALTER TABLE "Function" ALTER COLUMN "entryPoint" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Function_name_idx" ON "Function"("name");
