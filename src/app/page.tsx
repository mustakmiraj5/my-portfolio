import Header from "@/components/header";
import Hero from "@/components/hero";
import About from "@/components/about";
import Projects from "@/components/projects";
import Skills from "@/components/skills";
import Blogs from "@/components/blogs";
import Contact from "@/components/contact";
import Footer from "@/components/footer";
import { fetchMediumPosts } from "@/lib/medium";

export const dynamic = "force-dynamic";

export default async function Home() {
  const posts = await fetchMediumPosts();

  return (
    <div className="relative min-h-screen text-[color:var(--text)]">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-6 py-16">
        <Hero />
        <About />
        <Projects />
        <Skills />
        <Blogs posts={posts} />
        <Contact />
      </main>

      <Footer />
    </div>
  );
}
