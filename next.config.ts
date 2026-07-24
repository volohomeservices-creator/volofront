import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  compress: true,
  transpilePackages: ["@volo/shared-lib", "@volo/shared-types"],
  experimental: {
    cpus: 1,
    workerThreads: false,
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts', 'react-icons', 'lodash'],
  },

  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.voloapp.in';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Content-Security-Policy", value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https: blob: wss:;" }
        ]
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "false" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ],
      },
    ];
  },
};

const withBundleAnalyzer = process.env.ANALYZE === "true"
  ? require("@next/bundle-analyzer")({ enabled: true })
  : (config: NextConfig) => config;

export default withBundleAnalyzer(nextConfig);
