import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/schema-registry",
  images: { unoptimized: true },
};

export default nextConfig;
