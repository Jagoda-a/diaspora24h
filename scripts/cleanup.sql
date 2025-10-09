UPDATE "Article"
SET "coverImage" = NULL
WHERE "coverImage" LIKE '%.mp4%'
   OR "coverImage" LIKE '%.m3u8%'
   OR "coverImage" LIKE '%.webm%'
   OR "coverImage" LIKE '%.mov%';
