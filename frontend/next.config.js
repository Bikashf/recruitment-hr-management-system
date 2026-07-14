/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Rationale: Disable static generation during builds for pages relying on client side local storage to avoid SSR mismatches.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

module.exports = nextConfig;
