import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // StrictMode helps catch bugs during development via double-rendering.
  // It has zero runtime effect in production.
  reactStrictMode: true,
  // Keep pdfkit out of the webpack bundle so its font .afm files and fs calls
  // work via native node require at runtime.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
