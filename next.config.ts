import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  experimental: {
    serverActions: {
      // Bill scans (PDF / image) are uploaded through server actions.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
