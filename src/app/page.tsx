import Header from "@/components/header";
import Hero from "@/components/hero";
import About from "@/components/about";
import Experience from "@/components/experience";
import Projects from "@/components/projects";
import Lab from "@/components/lab";
import Skills from "@/components/skills";
import Blogs from "@/components/blogs";
import Education from "@/components/education";
import Contact from "@/components/contact";
import Footer from "@/components/footer";
import ScrollReveal from "@/components/scroll-reveal";
import { fetchMediumPosts } from "@/lib/medium";

export const dynamic = "force-dynamic";

export default async function Home() {
  const posts = await fetchMediumPosts();

  return (
    <div className="relative min-h-screen text-[color:var(--text)]">
      <ScrollReveal />
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-6 py-16">
        <Hero />
        <About />
        <Experience />
        <Projects />
        <Lab />
        <Skills />
        <Blogs posts={posts} />
        <Education />
        <Contact />
      </main>

      <Footer />
    </div>
  );
}
