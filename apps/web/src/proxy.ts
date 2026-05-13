import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ShortLink } from "@/lib/site-config";
import { DEFAULT_SHORT_LINKS, SITE } from "@/lib/site-config";

/**
 * Proxy — handle redirect untuk go.mulaiplus.id
 *
 * go.mulaiplus.id/tt    → 302 redirect dengan UTM params
 * go.mulaiplus.id/      → 302 redirect ke mulaiplus.id
 * go.mulaiplus.id/xxx   → 404 kalau slug gak dikenal
 */

const API_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";

async function getLinks(): Promise<Record<string, ShortLink>> {
  try {
    const res = await fetch(`${API_URL}/rpc/shortLinks.getAll`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return DEFAULT_SHORT_LINKS;
    return await res.json();
  } catch {
    return DEFAULT_SHORT_LINKS;
  }
}

function buildRedirectUrl(link: ShortLink): string {
  const qs = new URLSearchParams({
    utm_source: link.utm_source,
    utm_medium: link.utm_medium,
    utm_campaign: link.utm_campaign,
  }).toString();
  return `${link.to}?${qs}`;
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  // ─── Bukan go subdomain → skip ─────────────────────────
  if (!host.startsWith("go.") && host !== `go.${SITE.url.replace(/https?:\/\//, "")}`) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const slug = pathname.replace(/^\//, ""); // "/tt" → "tt", "/" → ""

  // Root → redirect ke main domain
  if (!slug) {
    const mainHost = host.replace(/^go\./, "").replace(/:\d+$/, "");
    const port = request.nextUrl.port ? `:${request.nextUrl.port}` : "";
    return NextResponse.redirect(new URL(`${request.nextUrl.protocol}//${mainHost}${port}`));
  }

  // Cari link berdasarkan slug
  const links = await getLinks();
  const link = links[slug];

  if (!link) {
    return NextResponse.next(); // 404 dari Next.js
  }

  return NextResponse.redirect(new URL(buildRedirectUrl(link), request.nextUrl.origin));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
