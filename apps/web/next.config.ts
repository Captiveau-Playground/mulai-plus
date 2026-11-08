import { execSync } from "node:child_process";
import "@mulai-plus/env/web";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import pkg from "./package.json" with { type: "json" };

/**
 * Versi yang ditampilkan UI — diambil dari sumber nyata, TIDAK hardcode:
 *   1) NEXT_PUBLIC_RELEASE_TAG (di-set CI dari git tag, mis. "v0.48.0"),
 *   2) `git describe --tags` saat build lokal (butuh repo git),
 *   3) versi package.json sebagai fallback terakhir.
 */
function resolveAppVersion(): string {
  const ci = (process.env.NEXT_PUBLIC_RELEASE_TAG ?? "").trim();
  if (ci) return ci;
  try {
    const tag = execSync("git describe --tags --abbrev=0", {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    if (tag) return tag;
  } catch {
    /* bukan repo git / git tidak tersedia */
  }
  return `v${pkg.version}`;
}

const nextConfig: NextConfig = {
  // Versi asli aplikasi (dari package.json) di-inline ke klien supaya footer TIDAK hardcode.
  // CI tetap bisa menimpa dengan NEXT_PUBLIC_RELEASE_TAG (tag rilis, mis. "v1.4.0-staging.2").
  env: {
    NEXT_PUBLIC_APP_VERSION: resolveAppVersion(),
  },
  // "standalone" dipakai untuk deploy (Docker/Cloudflare). Untuk e2e lokal kita pakai
  // `next build && next start` (lebih cepat & SSR-nya normal) → set NEXT_STANDALONE=0.
  output: process.env.NEXT_STANDALONE === "0" ? undefined : "standalone",
  typedRoutes: true,
  reactCompiler: true,
  images: {
    unoptimized: true,
    // Custom loader untuk R2/CDN - bypass optimization proxy
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "cdn.mulaiplus.id",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
    ],
  },
};

const sentryConfig = {
  ...nextConfig,
  async redirects() {
    return [
      { source: "/universities/:path*", destination: "/explore/universities/:path*", permanent: true },
      { source: "/study-programs/:path*", destination: "/explore/study-programs/:path*", permanent: true },
      { source: "/explore/universities/:slug/prodi", destination: "/explore/universities/:slug", permanent: true },
      { source: "/explore/universities/:slug/prodi/", destination: "/explore/universities/:slug", permanent: true },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/ai/:path*",
        destination: `${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000"}/ai/:path*`,
      },
    ];
  },
};

export default withSentryConfig(sentryConfig, {
  silent: true,
  widenClientFileUpload: true,
  reactComponentAnnotation: { enabled: true },
  disableLogger: true,
  automaticVercelMonitors: false,
});
