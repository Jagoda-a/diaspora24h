// app/api/cron/ingest/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Izvuci bazni URL iz request header-a (radi i za custom domen)
function getBaseFromHeaders(h: Headers): string {
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    process.env.VERCEL_URL ??
    "localhost:3000";
  return `${proto}://${host}`;
}

export async function GET(req: Request) {
  const token = (process.env.INGEST_TOKEN ?? "").trim();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing INGEST_TOKEN" },
      { status: 500 }
    );
  }

  const hdrs = new Headers(req.headers);
  const requestBase = getBaseFromHeaders(hdrs);

  // Pored base iz zaglavlja, probaj i tvrdi produkcioni domen kao fallback
  const bases = Array.from(
    new Set([
      requestBase,
      "https://diaspora24h.com",
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
    ].filter(Boolean))
  );

  let lastError: unknown = null;

  for (const base of bases) {
    const url = `${base}/api/ingest?limit=12`; // ovde promeni broj ako želiš manji/veći limit
    try {
      const r = await fetch(url, {
        method: "GET",
        headers: {
          "x-ingest-token": token,              // tvoja ingest ruta prihvata ovo
          authorization: `Bearer ${token}`,     // i ovo (za svaki slučaj)
          "user-agent": "diaspora24h-cron/1.0",
        },
        cache: "no-store",
      });

      const data = await r.json().catch(() => ({}));
      // vrati prvi odgovor (čak i ako je npr. 401 – da odmah vidiš status i target)
      return NextResponse.json({
        ok: r.ok,
        status: r.status,
        target: base,
        data,
      });
    } catch (e) {
      lastError = e;
      // probaj sledeći base
    }
  }

  return NextResponse.json(
    { ok: false, error: "Cron call failed", detail: String(lastError ?? "") },
    { status: 500 }
  );
}
