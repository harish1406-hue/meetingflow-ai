import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: [
    "ffmpeg-static",
    "meyda",
  ],
};

export default nextConfig;
