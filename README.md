# Diaspora 24h – Srpske vesti za dijasporu (Next.js + Prisma + RSS)

Potpuno funkcionalan MVP:
- Next.js 14 (App Router)
- Prisma + SQLite
- Ingest RSS iz više srpskih izvora: `GET /api/ingest`
- AI sažetak (opciono OpenAI, gasi se ako nema ključa)
- Ručno postavljeni AdSense slotovi (2 bannera + 1 in-article)
- `public/ads.txt` – zameni publisher ID
- Brendiranje: `diaspora24h.com`

## Pokretanje
1. `cp .env.example .env`
2. U `.env` postavi:
   - `DATABASE_URL="file:./dev.db"`
   - `NEXT_PUBLIC_ADSENSE_CLIENT="ca-pub-..."` (tvoj)
   - (opciono) `OPENAI_API_KEY` i `OPENAI_MODEL=gpt-5-mini`
3. `npm install`
4. `npx prisma migrate dev --name init`
5. `npm run dev`
6. Otvori `http://localhost:3000`
7. `GET /api/ingest` da popuni članke, pa osveži home

## Deploy (Vercel)
- Env varijable kao gore
- Vercel Cron: svakih 5–10 min `GET /api/ingest`
- Produkcijski DB: Postgres (Supabase/Neon), ažuriraj `DATABASE_URL`

## Pravila
- Linkujemo izvore, ne kopiramo pun tekst.
- AI sažetak kombinuje više izvora i ostaje neutralan.
- Ne koristimo zabranjene AdSense prakse (nema pop-up/back-ads).
