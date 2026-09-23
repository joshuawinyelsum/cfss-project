import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { execSync } from "child_process";

// Use the current git commit hash as a deterministic build-time revision.
// This ensures Serwist can safely invalidate precached pages when the build changes,
// while keeping the revision value stable across multiple builds of the same commit.
// If git is unavailable (e.g. CI without git), fall back to build timestamp.
let buildRevision: string;
try {
  buildRevision = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
} catch {
  buildRevision = Date.now().toString(36);
}

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [
    { url: "/dashboard", revision: buildRevision },
    { url: "/dashboard/work", revision: buildRevision },
    { url: "/dashboard/surveys/drafts", revision: buildRevision },
    { url: "/dashboard/surveys/submitted", revision: buildRevision },
    { url: "/dashboard/sync", revision: buildRevision },
    { url: "/dashboard/more", revision: buildRevision },
    { url: "/surveys", revision: buildRevision },
    { url: "/surveys/household", revision: buildRevision },
    { url: "/surveys/education", revision: buildRevision },
    { url: "/surveys/health", revision: buildRevision },
    { url: "/surveys/governance", revision: buildRevision },
    { url: "/surveys/household/fill", revision: buildRevision },
    { url: "/surveys/education/fill", revision: buildRevision },
    { url: "/surveys/health/fill", revision: buildRevision },
    { url: "/surveys/governance/fill", revision: buildRevision },
    { url: "/~offline", revision: buildRevision },
    { url: "/profile", revision: buildRevision },
    { url: "/settings", revision: buildRevision },
  ],
});

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*'
      }
    ]
  }
};

export default withSerwist(nextConfig);
