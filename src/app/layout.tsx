import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const title = `${SITE.name} | ${SITE.role}`;
const alt = `${SITE.name} — ${SITE.role}`;
const description = `${SITE.name} — ${SITE.description} Explore my experience, projects, and skills.`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title,
  description,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  keywords: [
    "Mustak Sahariar Miraj",
    "Software Engineer",
    "Backend Developer",
    "NestJS",
    "TypeScript",
    "Next.js",
    "AWS",
    "Dhaka",
    "Bangladesh",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: SITE.name,
    title,
    description,
    locale: "en_US",
    // Pinned explicitly: the file-convention URL is inferred from the
    // serving origin, which resolves to localhost outside Vercel.
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    creator: "@MustakSahariar",
    images: [{ url: "/opengraph-image", alt }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var stored = localStorage.getItem("theme");
                  var preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
                  var next = stored === "light" || stored === "dark" ? stored : preferred;
                  document.documentElement.classList.toggle("dark", next === "dark");
                } catch (e) {}
                // Arm scroll-reveal only when JS is running, so the content
                // is never left hidden for no-JS visitors or crawlers.
                document.documentElement.classList.add("js-reveal");
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
