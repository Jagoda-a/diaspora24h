import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const token = (process.env.INGEST_TOKEN ?? '').trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Missing INGEST_TOKEN' }, { status: 500 });
  }

  // Vercel u prod okruženju postavlja VERCEL_URL (npr. diaspora24h.com ili *.vercel.app)
  const base =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

  const url = `${base}/api/ingest?limit=12`;

  try {
    const r = await fetch(url, {
      headers: {
        'x-ingest-token': token,
      },
      // izbegni posredni keš
      cache: 'no-store',
    });

    const data = await r.json().catch(() => ({}));
    return NextResponse.json({ ok: r.ok, status: r.status, data });
  } catch (e) {
    console.error('cron ingest error', e);
    return NextResponse.json({ ok: false, error: 'Cron call failed' }, { status: 500 });
  }
}
