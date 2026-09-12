import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const basePath = "/fitness-pwa-nextjs";
const revision = process.env.GITHUB_SHA ?? "local-build";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

const withSerwist = withSerwistInit({
  additionalPrecacheEntries: [
    { url: `${basePath}/`, revision },
    { url: `${basePath}/history/`, revision },
    { url: `${basePath}/settings/`, revision },
    { url: `${basePath}/training/`, revision },
    { url: `${basePath}/manifest.webmanifest`, revision },
  ],
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  swUrl: "/sw.js",
  scope: "/fitness-pwa-nextjs/",
  register: false,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
