import "@mulai-plus/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: true,
  reactCompiler: true,
  images: {
    domains: ["fastly.picsum.photos"],
  },
};

export default nextConfig;
