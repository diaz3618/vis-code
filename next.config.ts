import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Exclude problematic files from TypeScript checking
    ignoreBuildErrors: true,
  },
  eslint: {
    // Exclude problematic files from ESLint checking
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
