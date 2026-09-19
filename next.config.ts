import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Avoid serving a stale admin tab (e.g. members list) after mutations.
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
    // Listing photo uploads (up to 6 compressed JPEGs) need >1MB default.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
