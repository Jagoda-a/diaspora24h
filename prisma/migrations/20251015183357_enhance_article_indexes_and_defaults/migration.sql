-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "categoryPrev" TEXT,
ADD COLUMN     "reclassifiedAt" TIMESTAMP(3),
ALTER COLUMN "category" SET DEFAULT 'drustvo';

-- CreateIndex
CREATE INDEX "idx_article_category_only" ON "Article"("category");

-- CreateIndex
CREATE INDEX "idx_article_published_created" ON "Article"("publishedAt", "createdAt");

-- CreateIndex
CREATE INDEX "idx_article_country" ON "Article"("country");

-- CreateIndex
CREATE INDEX "idx_article_language" ON "Article"("language");
