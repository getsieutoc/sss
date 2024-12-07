/*
  Warnings:

  - You are about to drop the column `value` on the `ApiKey` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[publicKey]` on the table `ApiKey` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[hashedSecretKey]` on the table `ApiKey` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hashedSecretKey` to the `ApiKey` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicKey` to the `ApiKey` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ApiKey_value_idx";

-- DropIndex
DROP INDEX "ApiKey_value_key";

-- AlterTable
ALTER TABLE "ApiKey" DROP COLUMN "value",
ADD COLUMN     "hashedSecretKey" TEXT NOT NULL,
ADD COLUMN     "publicKey" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_publicKey_key" ON "ApiKey"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_hashedSecretKey_key" ON "ApiKey"("hashedSecretKey");

-- CreateIndex
CREATE INDEX "ApiKey_publicKey_idx" ON "ApiKey"("publicKey");

-- CreateIndex
CREATE INDEX "ApiKey_hashedSecretKey_idx" ON "ApiKey"("hashedSecretKey");
