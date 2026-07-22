import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // NAMING RULE (D-08, PERF-11): any future clip re-render MUST ship
        // under a NEW filename — this header caches l{N}-{mood}.{mp4,webm}
        // FOREVER; a same-name replacement is invisible to returning users
        // until their cache clears, which for `immutable` assets may be
        // effectively never. Companion doc: scripts/render-habitat-clips.mjs.
        source: "/habitat/clips/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
