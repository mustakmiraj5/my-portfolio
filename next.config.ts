import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // The CV carries a phone number, so keep it out of search results.
        // The file stays publicly downloadable from the Contact section —
        // this only tells crawlers not to index it.
        source: "/resume.pdf",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
