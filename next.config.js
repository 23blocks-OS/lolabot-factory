/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Skip API routes in static export — they're only for local dev.
  // In production, Lambda functions handle /api/* via API Gateway.
}

module.exports = nextConfig
