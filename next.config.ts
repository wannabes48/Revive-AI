import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // ...preserve existing experimental options
    agentUpgrade: "security",
    // The task wizard sends an items CSV (capped at 4 MB) with the save; the default is 1 MB.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
