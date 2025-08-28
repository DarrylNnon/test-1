/** @type {import('next').NextConfig} */
const nextConfig = {
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