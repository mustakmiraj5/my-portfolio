import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name} — ${SITE.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Rendered once at build time into the static OG card used by LinkedIn,
// X, Slack and iMessage previews.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "linear-gradient(135deg, #071615 0%, #0b2e2b 55%, #0f766e 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 26,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "#2dd4bf",
            marginBottom: 28,
          }}
        >
          {SITE.role}
        </div>
        <div style={{ fontSize: 82, fontWeight: 700, lineHeight: 1.1 }}>
          {SITE.name}
        </div>
        <div
          style={{
            fontSize: 30,
            lineHeight: 1.45,
            color: "#d6f5f1",
            marginTop: 30,
            maxWidth: 900,
          }}
        >
          Building and operating AWS-hosted SaaS with TypeScript, NestJS and
          MySQL.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 48,
            fontSize: 24,
            letterSpacing: 3,
            color: "#2dd4bf",
          }}
        >
          mustakmiraj.vercel.app
        </div>
      </div>
    ),
    size
  );
}
