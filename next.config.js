/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep dev and production build artifacts separate so running `next build`
  // does not corrupt an active `next dev` session with missing chunk files.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',

  // Security response headers applied to every route.
  // Note: intentionally no Content-Security-Policy here — this app loads
  // fonts from Google Fonts, Font Awesome from cdnjs.cloudflare.com, images
  // from Vercel Blob storage, and talks to Supabase, OpenRouter, and
  // Basecamp webhooks. A CSP added without careful allowlisting would
  // likely break these at runtime in ways `next build` won't catch.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // geolocation stays allowed for self — the app has a
          // location-based check-in feature using the browser geolocation API.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
