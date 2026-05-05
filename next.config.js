/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    // pdfjs-dist uses canvas for node.js rendering — not needed in browser
    config.resolve.alias.canvas = false;
    return config;
  },
}
module.exports = nextConfig
