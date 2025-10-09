-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "country" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "coverImage" TEXT,
    "sourceUrl" TEXT,
    "sourcesJson" TEXT,
    "language" TEXT NOT NULL DEFAULT 'sr',
    "publishedAt" DATETIME,
    "content" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Article" ("content", "country", "coverImage", "createdAt", "id", "language", "publishedAt", "slug", "sourceUrl", "sourcesJson", "summary", "title", "updatedAt") SELECT "content", "country", "coverImage", "createdAt", "id", "language", "publishedAt", "slug", "sourceUrl", "sourcesJson", "summary", "title", "updatedAt" FROM "Article";
DROP TABLE "Article";
ALTER TABLE "new_Article" RENAME TO "Article";
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
