import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }]
  },
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
