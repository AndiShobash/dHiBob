/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ['pdfjs-dist'],
  },
  webpack: (config, { isServer }) => {
    // pdfjs-dist uses canvas for node.js rendering — not needed in browser
    config.resolve.alias.canvas = false;
    // Don't bundle pdfjs-dist worker on server
    if (isServer) {
      config.externals.push('pdfjs-dist');
    }
    return config;
  },
}
module.exports = nextConfig
