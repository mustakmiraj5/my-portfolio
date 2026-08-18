import { BlogPost } from "@/lib/medium";
import { revealDelay } from "@/lib/reveal";

export default function Blogs({ posts }: { posts: BlogPost[] }) {
  return (
    <section id="blogs" className="grid gap-8">
      <div data-reveal>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Writing
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-[color:var(--text)]">
          Notes on engineering
        </h2>
      </div>
      <div className="grid gap-4">
        {posts.length > 0 ? (
          posts.map((post, index) => (
            <a
              key={post.link}
              href={post.link}
              target="_blank"
              rel="noreferrer"
              data-reveal
              style={revealDelay(index * 90)}
              className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-6 transition duration-300 hover:-translate-y-1 hover:border-[color:var(--accent)]"
            >
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                <span>{post.date}</span>
                <span>{post.read}</span>
              </div>
              <h3 className="text-lg font-semibold text-[color:var(--text)]">
                {post.title}
              </h3>
            </a>
          ))
        ) : (
          <div data-reveal className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-6 text-sm text-[color:var(--muted)]">
            Blog posts will appear here once the Medium feed is reachable.
          </div>
        )}
      </div>
    </section>
  );
}
