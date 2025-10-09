// app/api/imgx/route.ts
import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 50 * 1024 * 1024;
const FALLBACK_IMAGE = "/nepoznato.jpg";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
  };
}

function parseParams(req: Request) {
  const u = new URL(req.url);
  const url = u.searchParams.get("url") || u.searchParams.get("u");
  const w = Math.max(1, Math.min(4096, Number(u.searchParams.get("w") || 1200) || 1200));
  const fmt = (u.searchParams.get("format") || "webp").toLowerCase(); // webp|jpeg|png|avif
  const q = Math.max(1, Math.min(100, Number(u.searchParams.get("q") || 82) || 82));
  return { url, w, fmt, q };
}

function isHttpLink(s?: string | null) {
  return !!s && /^https?:\/\//i.test(s);
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: cors() });
}

export async function GET(req: Request) {
  const { url, w, fmt, q } = parseParams(req);
  if (!isHttpLink(url)) {
    return NextResponse.redirect(FALLBACK_IMAGE);
  }

  let target: URL;
  try {
    target = new URL(url!);
  } catch {
    return NextResponse.redirect(FALLBACK_IMAGE);
  }

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);

  try {
    const r = await fetch(target, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": "https://www.google.com/",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      redirect: "follow",
      signal: ac.signal,
    });
    clearTimeout(t);

    if (!r.ok) {
      console.warn("imgx: upstream fetch failed", r.status, url);
      return NextResponse.redirect(FALLBACK_IMAGE);
    }

    const lenStr = r.headers.get("content-length");
    if (lenStr) {
      const len = Number(lenStr);
      if (Number.isFinite(len) && len > MAX_BYTES) {
        console.warn("imgx: file too large", len, url);
        return NextResponse.redirect(FALLBACK_IMAGE);
      }
    }

    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      console.warn("imgx: buffer too large", buf.byteLength, url);
      return NextResponse.redirect(FALLBACK_IMAGE);
    }

    let img = sharp(buf, { failOn: "none", limitInputPixels: false })
      .resize({ width: w, withoutEnlargement: true, fit: "inside" })
      .gamma(1.01)
      .modulate({ saturation: 1.01 });

    let contentType = "image/webp";
    if (fmt === "jpeg" || fmt === "jpg") {
      img = img.jpeg({ quality: q, mozjpeg: true });
      contentType = "image/jpeg";
    } else if (fmt === "png") {
      img = img.png({ compressionLevel: 9 });
      contentType = "image/png";
    } else if (fmt === "avif") {
      img = img.avif({ quality: q });
      contentType = "image/avif";
    } else {
      img = img.webp({ quality: q });
      contentType = "image/webp";
    }

    const out = await img.toBuffer();
    const body = new Uint8Array(out);

    return new NextResponse(body, {
      status: 200,
      headers: {
        ...cors(),
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (e: any) {
    clearTimeout(t);
    console.warn("imgx error:", e?.message || e);
    return NextResponse.redirect(FALLBACK_IMAGE);
  }
}
