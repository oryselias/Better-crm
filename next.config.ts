import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Double-renders every component in dev — disable to halve memory pressure
  reactStrictMode: !isDev,
};

export default nextConfig;
