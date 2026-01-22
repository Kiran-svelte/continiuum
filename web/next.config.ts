import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  // Disable turbopack to avoid thread panic issues
  // Using webpack for stability
};

export default nextConfig;
