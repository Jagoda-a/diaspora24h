/*
  Warnings:

  - A unique constraint covering the columns `[topicKey,country]` on the table `Article` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "topicKey" TEXT;

-- CreateIndex
CREATE INDEX "Article_createdAt_idx" ON "Article"("createdAt");

-- CreateIndex
CREATE INDEX "Article_sourceUrl_idx" ON "Article"("sourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Article_topicKey_country_key" ON "Article"("topicKey", "country");
