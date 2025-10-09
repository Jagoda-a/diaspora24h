// app/a/[slug]/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const slug = params.slug;
  const url = new URL(req.url);
  const base = `${url.protocol}//${url.host}`;
  return NextResponse.redirect(`${base}/vesti/${encodeURIComponent(slug)}`, 308);
}
