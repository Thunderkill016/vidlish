import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
};

export default withWorkflow(nextConfig);
