import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flame, Check, BookOpen } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useReadingPath } from "@/hooks/use-path";
import { dayKey, getAllProgress, getDays, getGoal, getStreak, setGoal, type Progress } from "@/lib/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lector — Your daily Spanish reading" },
      { name: "description", content: "Pick up where you left off, keep your streak, and follow a reading path from easy to advanced Spanish books." },
      { property: "og:title", content: "Lector — Your daily Spanish reading" },
      { property: "og:description", content: "Learn Spanish by reading full books, a few pages a day." },
    ],
  }),
  component: Home,
});

function Home() {
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [days, setDays] = useState<Record<string, number>>({});
  const [goal, setGoalState] = useState(10);
  const [streak, setStreak] = useState(0);
  const path = useReadingPath();

  useEffect(() => {
    setProgress(getAllProgress());
    setDays(getDays());
    setGoalState(getGoal());
    setStreak(getStreak());
  }, []);

  const current = Object.values(progress).filter((p) => !p.finished).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const todayMin = Math.floor((days[dayKey()] ?? 0) / 60);
  const pct = Math.min(100, (todayMin / goal) * 100);
  const nextStep = path.find((s) => s.book && !progress[`g-${s.book.id}`]?.finished);

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { label: d.toLocaleDateString("es", { weekday: "narrow" }), done: (days[dayKey(d)] ?? 0) >= goal * 60 };
  });

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="text-4xl font-semibold md:text-5xl">¡Hola! Ready to read?</h1>
        <p className="mt-2 text-muted-foreground">A few pages every day is all it takes.</p>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 md:col-span-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Continue reading</p>
            {current ? (
              <div className="mt-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-semibold">{current.title}</h2>
                  <p className="text-sm text-muted-foreground">{current.author} · page {current.page + 1} of {current.totalPages}</p>
                  <div className="mt-3 h-1.5 w-full max-w-sm rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${((current.page + 1) / current.totalPages) * 100}%` }} />
                  </div>
                </div>
                <Button asChild size="lg">
                  <Link to="/read/$bookId" params={{ bookId: current.key }}>Seguir</Link>
                </Button>
              </div>
            ) : nextStep?.book ? (
              <div className="mt-3 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">{nextStep.book.title}</h2>
                  <p className="text-sm text-muted-foreground">Suggested first book · {nextStep.level}</p>
                </div>
                <Button asChild size="lg">
                  <Link to="/read/$bookId" params={{ bookId: `g-${nextStep.book.id}` }}>Empezar</Link>
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-muted-foreground">Loading suggestions…</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              <span className="font-display text-2xl font-semibold">{streak}</span>
              <span className="text-sm text-muted-foreground">day streak</span>
            </div>
            <p className="mt-3 text-sm">Today: {todayMin} / {goal} min</p>
            <div className="mt-2 h-1.5 rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-4 flex justify-between">
              {week.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className={`h-6 w-6 rounded-full ${d.done ? "bg-primary" : "bg-secondary"}`} />
                  <span className="text-[10px] uppercase text-muted-foreground">{d.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              Daily goal:
              {[5, 10, 20, 30].map((m) => (
                <button key={m} onClick={() => { setGoal(m); setGoalState(m); setStreak(getStreak()); }}
                  className={`rounded px-2 py-0.5 ${goal === m ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{m}</button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Your reading path</h2>
          <p className="mt-1 text-sm text-muted-foreground">Start easy and work your way up. Finish one, and the next is waiting.</p>
          <ol className="mt-6 space-y-3">
            {path.map((s, i) => {
              const done = s.book && progress[`g-${s.book.id}`]?.finished;
              const isNext = s === nextStep;
              return (
                <li key={s.search} className={`flex items-center gap-4 rounded-lg border p-4 ${isNext ? "border-primary bg-card" : "border-border"}`}>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display ${done ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-semibold">{s.book?.title ?? (s.loading ? "…" : s.search)}</p>
                    <p className="text-sm text-muted-foreground">{s.level} · {s.note}</p>
                  </div>
                  {s.book && (
                    <Button asChild variant={isNext ? "default" : "outline"} size="sm">
                      <Link to="/read/$bookId" params={{ bookId: `g-${s.book.id}` }}><BookOpen className="h-4 w-4" />Leer</Link>
                    </Button>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      </main>
    </div>
  );
}
