import "@mulai-plus/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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

export default {
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
