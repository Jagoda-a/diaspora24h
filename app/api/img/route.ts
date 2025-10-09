// app/api/img/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Podesivo
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const TIMEOUT_MS = 10_000; // 10s

function pickUrl(req: Request) {
  const { searchParams } = new URL(req.url);
  // podrži i ?url= i ?u= (back-compat)
  return searchParams.get('url') || searchParams.get('u');
}

function isHttp(u: string) {
  return /^https?:\/\//i.test(u);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders() });
}

export async function HEAD(req: Request) {
  const raw = pickUrl(req);
  if (!raw || !isHttp(raw)) {
    return new NextResponse(null, { status: 400, headers: corsHeaders() });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new NextResponse(null, { status: 400, headers: corsHeaders() });
  }

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);

  try {
    const r = await fetch(target, {
      method: 'HEAD',
      cache: 'no-store',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: `${target.protocol}//${target.host}/`,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: ac.signal,
    });
    clearTimeout(t);

    if (!r.ok) {
      return new NextResponse(null, { status: 502, headers: corsHeaders() });
    }

    const headers = new Headers(corsHeaders());
    // Propusti korisna zaglavlja
    const pass = ['content-type', 'content-length', 'etag', 'last-modified', 'cache-control'] as const;
    for (const k of pass) {
      const v = r.headers.get(k);
      if (v) {
        // normalizuj na Title-Case
        const key =
          k === 'content-type' ? 'Content-Type' :
          k === 'content-length' ? 'Content-Length' :
          k === 'etag' ? 'ETag' :
          k === 'last-modified' ? 'Last-Modified' :
          'Cache-Control';
        headers.set(key, v);
      }
    }
    return new NextResponse(null, { status: 200, headers });
  } catch {
    clearTimeout(t);
    return new NextResponse(null, { status: 502, headers: corsHeaders() });
  }
}

export async function GET(req: Request) {
  const raw = pickUrl(req);
  if (!raw) {
    return NextResponse.json({ ok: false, error: 'missing_url' }, { status: 400, headers: corsHeaders() });
  }
  if (!isHttp(raw)) {
    return NextResponse.json({ ok: false, error: 'invalid_url' }, { status: 400, headers: corsHeaders() });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_url' }, { status: 400, headers: corsHeaders() });
  }

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);

  try {
    const r = await fetch(target, {
      cache: 'no-store',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: `${target.protocol}//${target.host}/`,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: ac.signal,
    });

    clearTimeout(t);

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: 'upstream_error', status: r.status },
        { status: 502, headers: corsHeaders() }
      );
    }

    // veličina (ako je poznata) – odbij prevelike
    const lenStr = r.headers.get('content-length');
    if (lenStr) {
      const len = Number(lenStr);
      if (Number.isFinite(len) && len > MAX_BYTES) {
        return NextResponse.json(
          { ok: false, error: 'too_large', max: MAX_BYTES },
          { status: 413, headers: corsHeaders() }
        );
      }
    }

    // content-type sanity
    let ct = r.headers.get('content-type') || '';
    const isImageish = /^(image\/|application\/octet-stream)/i.test(ct);
    if (!isImageish) ct = 'image/jpeg';

    // Ako nema body stream, fallback na buffer
    if (!r.body) {
      const buf = await r.arrayBuffer();
      if (buf.byteLength > MAX_BYTES) {
        return NextResponse.json(
          { ok: false, error: 'too_large', max: MAX_BYTES },
          { status: 413, headers: corsHeaders() }
        );
      }
      return new NextResponse(buf, {
        status: 200,
        headers: {
          ...corsHeaders(),
          'Content-Type': ct,
          'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600',
        },
      });
    }

    // Imamo stream – uzmi reader bez opcionalnog ?
    const reader = r.body.getReader();

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let total = 0;
        const pump = (): void => {
          reader.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }
            if (value) {
              total += value.byteLength;
              if (total > MAX_BYTES) {
                controller.error(new Error('too_large'));
                return;
              }
              controller.enqueue(value);
            }
            pump();
          }).catch(err => controller.error(err));
        };
        pump();
      },
    });

    const headersOut = new Headers({
      ...corsHeaders(),
      'Content-Type': ct,
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600',
    });

    // Propusti korisna validation/caching zaglavlja
    const pass = ['etag', 'last-modified'] as const;
    for (const k of pass) {
      const v = r.headers.get(k);
      if (v) {
        const key = k === 'etag' ? 'ETag' : 'Last-Modified';
        headersOut.set(key, v);
      }
    }

    return new NextResponse(stream, { status: 200, headers: headersOut });
  } catch (e: any) {
    clearTimeout(t);
    const aborted = e?.name === 'AbortError';
    return NextResponse.json(
      { ok: false, error: aborted ? 'timeout' : 'fetch_failed' },
      { status: 502, headers: corsHeaders() }
    );
  }
}
