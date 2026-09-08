/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Ensures Prisma client & ioredis run only on Node.js, not bundled for the browser
    serverComponentsExternalPackages: ['@prisma/client', 'ioredis'],
  },
}

module.exports = nextConfig
