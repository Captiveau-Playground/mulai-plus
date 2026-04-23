import "@mulai-plus/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: true,
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: 'lh3.googleusercontent.com"',
        port: "",
      },
    ],
  },
};

export default nextConfig;
