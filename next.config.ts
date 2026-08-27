import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  serverExternalPackages: ['sharp'],
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'date-fns',
      'zod',
      '@simplewebauthn/browser',
      '@simplewebauthn/server',
      'class-variance-authority',
    ],
  },
};

export default nextConfig;
