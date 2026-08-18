import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mustak Sahariar Miraj | Portfolio",
  description:
    "Mustak Sahariar Miraj — Software Engineer in Dhaka, Bangladesh, building and operating AWS-hosted SaaS with TypeScript, NestJS, MySQL and React. Explore my experience, projects, and skills.",
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
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
