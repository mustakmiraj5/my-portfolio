const achievements = [
  "Published “Inside NGINX Architecture”",
  "130+ problems solved on LeetCode",
  "3rd place — FLAG HUNT 2021 (CTF Community Bangladesh)",
  "38th place — Cyber Drill 2021 (BGD e-GOV CIRT)",
];

const education = [
  {
    school: "Bangladesh University of Textiles",
    degree: "B.Sc. in Industrial & Production Engineering",
    period: "2019 – 2024",
  },
  {
    school: "Dinajpur Government College",
    degree: "Higher Secondary Certificate",
    period: "2016 – 2018",
  },
];

export default function Education() {
  return (
    <section id="education" className="grid gap-8 lg:grid-cols-2">
      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-8 shadow-[var(--shadow)]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Publications & Achievements
        </p>
        <ul className="mt-5 grid gap-3">
          {achievements.map((item) => (
            <li
              key={item}
              className="flex gap-3 text-sm leading-6 text-[color:var(--muted)]"
            >
              <span
                aria-hidden
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--accent)]"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-8 shadow-[var(--shadow)]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Education
        </p>
        <div className="mt-5 grid gap-5">
          {education.map((item) => (
            <div key={item.school}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold text-[color:var(--text)]">
                  {item.school}
                </h3>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  {item.period}
                </span>
              </div>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                {item.degree}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
