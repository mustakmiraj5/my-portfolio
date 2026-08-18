# Mustak Sahariar Miraj — Portfolio

Personal portfolio site built with Next.js, Tailwind CSS, and TypeScript. Features light/dark theme, dynamic blog posts from Medium, and a component-based architecture.

**Live site:** [mustakmiraj.vercel.app](https://mustakmiraj.vercel.app/)

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS 4
- **Language:** TypeScript
- **Blog Feed:** Medium RSS via fast-xml-parser
- **Fonts:** Space Grotesk, JetBrains Mono

## Project Structure

```
src/
├── app/
│   ├── globals.css        # Theme variables and base styles
│   ├── layout.tsx         # Root layout with fonts
│   └── page.tsx           # Home page composing all sections
├── components/
│   ├── header.tsx         # Sticky nav bar with theme toggle
│   ├── hero.tsx           # Hero section with CTAs
│   ├── about.tsx          # About section
│   ├── experience.tsx     # Work experience
│   ├── projects.tsx       # Featured projects
│   ├── skills.tsx         # Skills grid
│   ├── blogs.tsx          # Medium blog posts
│   ├── education.tsx      # Achievements and education
│   ├── contact.tsx        # Contact section
│   ├── footer.tsx         # Footer with social links
│   └── theme-toggle.tsx   # Light/dark theme switcher
└── lib/
    ├── medium.ts          # Medium RSS feed fetching
    └── social-links.tsx   # Shared social link icons
```
