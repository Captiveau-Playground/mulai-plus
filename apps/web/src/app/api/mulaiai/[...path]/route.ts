import { env } from "@mulai-plus/env/server";
import { type NextRequest, NextResponse } from "next/server";

// Proxy same-origin utk admin Mul.ai — cookie admin di-web diteruskan ke API
// (hindari 403 cross-origin karena cookie host-only tidak ikut ke api.*)
const API = (process.env.NEXT_PUBLIC_SERVER_URL || env.NEXT_PUBLIC_SERVER_URL || "").replace(/\/$/, "");

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const qs = req.nextUrl.search;
  const target = `${API}/ai/admin/${path.join("/")}${qs}`;
  const res = await fetch(target, { headers: { Cookie: req.headers.get("cookie") || "" } });
  return new NextResponse(res.body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const target = `${API}/ai/admin/${path.join("/")}`;
  const body = await req.text();
  const res = await fetch(target, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: req.headers.get("cookie") || "" },
    body,
  });
  return new NextResponse(res.body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
  });
}
