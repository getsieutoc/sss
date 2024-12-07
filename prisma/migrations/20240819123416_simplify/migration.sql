/*
  Warnings:

  - You are about to drop the column `hashedSecretKey` on the `ApiKey` table. All the data in the column will be lost.
  - You are about to drop the column `publicKey` on the `ApiKey` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[value]` on the table `ApiKey` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `value` to the `ApiKey` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ApiKey_hashedSecretKey_idx";

-- DropIndex
DROP INDEX "ApiKey_hashedSecretKey_key";

-- DropIndex
DROP INDEX "ApiKey_publicKey_idx";

-- DropIndex
DROP INDEX "ApiKey_publicKey_key";

-- AlterTable
ALTER TABLE "ApiKey" DROP COLUMN "hashedSecretKey",
DROP COLUMN "publicKey",
ADD COLUMN     "value" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_value_key" ON "ApiKey"("value");

-- CreateIndex
CREATE INDEX "ApiKey_value_idx" ON "ApiKey"("value");
