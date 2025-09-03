/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors. We are making this trade-off to ensure
    // build stability in resource-constrained environments. Type checking
    // should be enforced in a separate CI/CD step.
    ignoreBuildErrors: true,
  },

  eslint: {
    // We also disable ESLint for the same reason.
    ignoreDuringBuilds: true,
  },

  webpack: (config, { dev, isServer }) => {
    // Reduce CPU usage in development by ignoring node_modules from being watched.
    if (dev && !isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /node_modules/,
      };
    }
    return config;
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // The destination is the Docker service name and port
        destination: 'http://api:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;