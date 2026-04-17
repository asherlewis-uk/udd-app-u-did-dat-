function requiredInProduction(key, devFallback) {
  const value = process.env[key];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required production environment variable: ${key}`);
  }
  return devFallback;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@udd/contracts'],
  experimental: {
    typedRoutes: true,
  },
  eslint: {
    // Lint is enforced via `pnpm lint`; avoid duplicating during build.
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Monaco Editor requires its workers to be available on the client
    if (!isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        fs: false,
      };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/preview/:path*',
        // GATEWAY_URL points to the gateway service (port 3000), not to this web app (port 3007).
        destination: `${requiredInProduction('GATEWAY_URL', 'http://localhost:3000')}/preview/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
