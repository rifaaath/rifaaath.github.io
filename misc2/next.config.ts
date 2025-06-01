
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure @sparticuz/chromium is not bundled by Next.js server-side.
      // It will be require()'d from node_modules at runtime.
      config.externals = [...config.externals, '@sparticuz/chromium'];
    }
    return config;
  },
};

export default nextConfig;
