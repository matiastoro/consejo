import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["@react-pdf/renderer"],
  typescript: { ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === "true" },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ucampus.uchile.cl" },
    ],
  },
};

export default nextConfig;
