import path from "node:path";
import type { NextConfig } from "next";

// The project keeps a single .env at the repo root; Next only reads its own folder.
try {
  process.loadEnvFile(path.resolve(process.cwd(), "../.env"));
} catch {
  // Falls back to frontend/.env.local or the defaults in lib/api-client.ts.
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Cypress runs beside the normal dev server, so it needs an independent lock/build directory.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  images: {
    // Open Food Facts serves product photos from its own image CDN.
    remotePatterns: [{ protocol: "https", hostname: "images.openfoodfacts.org" }],
  },
  async redirects() {
    return [{ source: "/", destination: "/en", permanent: false }];
  },
};

export default nextConfig;
