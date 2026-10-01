import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Reuse route shells when switching back to a recently visited workspace.
    // Business data is still fetched by the page's client queries, not this cache.
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
