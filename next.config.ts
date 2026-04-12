import type { NextConfig } from "next";

const securityHeaders = [
  // Block clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disable client-side DNS prefetching
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // Control referrer info sent with requests
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict browser feature access
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // StrictMode helps catch bugs during development via double-rendering.
  // It has zero runtime effect in production.
  reactStrictMode: true,
  // Keep pdfkit out of the webpack bundle so its font .afm files and fs calls
  // work via native node require at runtime.
  serverExternalPackages: ["pdfkit"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
