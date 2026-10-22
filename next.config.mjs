// webpack dev chunks run through eval(); production never gets 'unsafe-eval'.
const scriptSrc = process.env.NODE_ENV === 'development' ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";

const securityHeaders = [
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Content-Security-Policy', value: `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://res.cloudinary.com https://placehold.co https://images.unsplash.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://res.cloudinary.com; frame-src 'self' https://www.google.com https://*.google.com https://maps.google.com; frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self';` },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    // Cloudinary resizes product photos itself; see src/lib/image-loader.js.
    loader: 'custom',
    loaderFile: './src/lib/image-loader.js',
    qualities: [75, 90],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    // Files in /public have no content hash, so Vercel serves them with max-age=0 and every
    // repeat visit re-requests them. These change rarely: let browsers and the CDN keep them a
    // day and serve a stale copy for a week while refreshing in the background.
    const publicAssetCache = [
      { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
    ];
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      { source: '/images/:path*', headers: publicAssetCache },
      { source: '/icons/:path*', headers: publicAssetCache },
      { source: '/:file(favicon.ico|favicon.png|favicon-48.png|og-image.png)', headers: publicAssetCache },
    ];
  },
  async redirects() {
    return [{ source: '/shop', destination: '/products', permanent: true }];
  },
};

export default nextConfig;
