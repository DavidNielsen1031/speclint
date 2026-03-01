import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // groombacklog.com → speclint.ai (301 permanent)
      {
        source: "/:path*",
        has: [{ type: "host", value: "groombacklog.com" }],
        destination: "https://speclint.ai/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.groombacklog.com" }],
        destination: "https://speclint.ai/:path*",
        permanent: true,
      },
      // refinebacklog.com → speclint.ai (301 permanent)
      {
        source: "/:path*",
        has: [{ type: "host", value: "refinebacklog.com" }],
        destination: "https://speclint.ai/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.refinebacklog.com" }],
        destination: "https://speclint.ai/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
