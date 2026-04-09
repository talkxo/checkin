/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep dev and production build artifacts separate so running `next build`
  // does not corrupt an active `next dev` session with missing chunk files.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
};

module.exports = nextConfig;
