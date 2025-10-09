-- AlterTable
ALTER TABLE "Article" ADD COLUMN "canonicalUrl" TEXT;
ALTER TABLE "Article" ADD COLUMN "noindex" BOOLEAN;
ALTER TABLE "Article" ADD COLUMN "ogImage" TEXT;
ALTER TABLE "Article" ADD COLUMN "seoDescription" TEXT;
ALTER TABLE "Article" ADD COLUMN "seoTitle" TEXT;
