import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Volume2, X, Bookmark, Minus, Plus, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBookText } from "@/lib/books.functions";
import { addReadingSeconds, getAllProgress, getProgress, getStoredBook, putStoredBook, saveProgress, saveWord, type StoredBook } from "@/lib/storage";
import { sentenceAround, speak, translate } from "@/lib/translate";
import { useReadingPath } from "@/hooks/use-path";

export const Route = createFileRoute("/read/$bookId")({
  head: () => ({
    meta: [
      { title: "Reading — Lector" },
      { name: "description", content: "Read a full Spanish book with tap-to-translate and audio." },
      { property: "og:title", content: "Reading — Lector" },
      { property: "og:description", content: "Tap any word for its English meaning in context." },
    ],
  }),
  component: Reader,
});

const PAGE_CHARS = 1800;

function paginate(paragraphs: string[]) {
  const pages: string[][] = [];
  let cur: string[] = [];
  let len = 0;
  for (const p of paragraphs) {
    if (len > 0 && len + p.length > PAGE_CHARS) {
      pages.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(p);
    len += p.length;
  }
  if (cur.length) pages.push(cur);
  return pages;
}

type Picked = { word: string; sentence: string };

function Reader() {
  const { bookId } = Route.useParams();
  const fetchText = useServerFn(getBookText);
  const [book, setBook] = useState<StoredBook | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [size, setSize] = useState(20);
  const [finished, setFinished] = useState(false);
  const path = useReadingPath();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let b = await getStoredBook(bookId);
        if (!b && bookId.startsWith("g-")) {
          const res = await fetchText({ data: { id: Number(bookId.slice(2)) } });
          b = {
            key: bookId,
            title: res.meta?.title ?? "Libro",
            author: res.meta?.author ?? "",
            cover: res.meta?.cover,
            paragraphs: res.paragraphs,
          };
          await putStoredBook(b);
        }
        if (!b) throw new Error("This book isn't on this device anymore.");
        if (!alive) return;
        setBook(b);
        setPage(getProgress(bookId)?.page ?? 0);
        setSize(Number(localStorage.getItem("lector.size")) || 20);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Could not load this book");
      }
    })();
    return () => { alive = false; };
  }, [bookId, fetchText, attempt]);

  const pages = useMemo(() => (book ? paginate(book.paragraphs) : []), [book]);

  // Save position
  useEffect(() => {
    if (!book || !pages.length) return;
    const prev = getProgress(book.key);
    saveProgress({ key: book.key, title: book.title, author: book.author, cover: book.cover, page, totalPages: pages.length, updatedAt: Date.now(), finished: prev?.finished });
    window.scrollTo({ top: 0 });
  }, [book, page, pages.length]);

  // Track reading time while the tab is visible
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") addReadingSeconds(15); }, 15000);
    return () => clearInterval(t);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setPage((p) => Math.min(p + 1, pages.length - 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(p - 1, 0));
      if (e.key === "Escape") setPicked(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pages.length]);

  function changeSize(d: number) {
    const s = Math.max(15, Math.min(30, size + d));
    setSize(s);
    localStorage.setItem("lector.size", String(s));
  }

  function finish() {
    if (!book) return;
    saveProgress({ key: book.key, title: book.title, author: book.author, cover: book.cover, page, totalPages: pages.length, updatedAt: Date.now(), finished: true });
    setFinished(true);
  }

  if (error) return (
    <Centered>
      <p className="text-destructive">{error}</p>
      <p className="mt-2 text-sm text-muted-foreground">Gutenberg can be slow sometimes — trying again usually works.</p>
      <div className="mt-4 flex gap-2">
        {bookId.startsWith("g-") && <Button onClick={() => { setError(""); setAttempt((a) => a + 1); }}>Reintentar</Button>}
        <Button asChild variant="outline"><Link to="/library">Back to library</Link></Button>
      </div>
    </Centered>
  );
  if (!book) return <Centered><p className="font-display text-xl">Abriendo el libro…</p><p className="mt-2 text-sm text-muted-foreground">The first time can take a few seconds.</p></Centered>;

  if (finished) {
    const progress = getAllProgress();
    const next = path.find((s) => s.book && `g-${s.book.id}` !== book.key && !progress[`g-${s.book.id}`]?.finished);
    return (
      <Centered>
        <PartyPopper className="h-10 w-10 text-primary" />
        <h1 className="mt-4 text-3xl font-semibold">¡Enhorabuena!</h1>
        <p className="mt-2 text-muted-foreground">You finished <em>{book.title}</em>.</p>
        {next?.book && (
          <div className="mt-6 rounded-lg border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Up next · {next.level}</p>
            <p className="mt-1 font-display text-xl font-semibold">{next.book.title}</p>
            <Button asChild className="mt-4"><Link to="/read/$bookId" params={{ bookId: `g-${next.book.id}` }}>Start reading</Link></Button>
          </div>
        )}
        <Link to="/" className="mt-6 text-sm text-muted-foreground underline">Back home</Link>
      </Centered>
    );
  }

  const isLast = page >= pages.length - 1;

  return (
    <div className="min-h-screen pb-40">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link to="/" aria-label="Back" className="rounded p-1 hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display font-semibold">{book.title}</p>
            <p className="text-xs text-muted-foreground">Page {page + 1} of {pages.length}</p>
          </div>
          <button aria-label="Smaller text" onClick={() => changeSize(-1)} className="rounded p-1 hover:bg-secondary"><Minus className="h-4 w-4" /></button>
          <button aria-label="Larger text" onClick={() => changeSize(1)} className="rounded p-1 hover:bg-secondary"><Plus className="h-4 w-4" /></button>
        </div>
        <div className="h-0.5 bg-secondary"><div className="h-full bg-primary" style={{ width: `${((page + 1) / pages.length) * 100}%` }} /></div>
      </header>

      <article className="mx-auto max-w-2xl px-5 py-8 font-reading leading-relaxed" style={{ fontSize: size }}>
        {pages[page]?.map((p, i) => (
          <Paragraph key={`${page}-${i}`} text={p} activeWord={picked?.word} onPick={setPicked} />
        ))}
      </article>

      <div className="mx-auto flex max-w-2xl items-center justify-between px-5">
        <Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" />Anterior</Button>
        {isLast ? (
          <Button onClick={finish}>Terminar el libro</Button>
        ) : (
          <Button onClick={() => setPage(page + 1)}>Siguiente<ChevronRight className="h-4 w-4" /></Button>
        )}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">Tap any word to see its meaning.</p>

      {picked && <WordSheet picked={picked} onClose={() => setPicked(null)} />}
    </div>
  );
}

function Paragraph({ text, activeWord, onPick }: { text: string; activeWord?: string | undefined; onPick: (p: Picked) => void }) {
  const parts = useMemo(() => {
    const out: { t: string; word: boolean; offset: number }[] = [];
    const re = /[\p{L}\p{M}]+/gu;
    let last = 0;
    for (const m of text.matchAll(re)) {
      if (m.index! > last) out.push({ t: text.slice(last, m.index), word: false, offset: last });
      out.push({ t: m[0], word: true, offset: m.index! });
      last = m.index! + m[0].length;
    }
    if (last < text.length) out.push({ t: text.slice(last), word: false, offset: last });
    return out;
  }, [text]);
  return (
    <p className="mb-5">
      {parts.map((p, i) =>
        p.word ? (
          <span key={i} role="button" tabIndex={0}
            onClick={() => onPick({ word: p.t, sentence: sentenceAround(text, p.offset) })}
            className={`cursor-pointer rounded-sm transition-colors hover:bg-accent ${activeWord === p.t ? "bg-accent" : ""}`}>
            {p.t}
          </span>
        ) : (
          <span key={i}>{p.t}</span>
        ),
      )}
    </p>
  );
}

function WordSheet({ picked, onClose }: { picked: Picked; onClose: () => void }) {
  const [word, setWord] = useState<{ main: string; alternatives: string[] } | null>(null);
  const [sentence, setSentence] = useState<string | null>(null);
  const [loadingSentence, setLoadingSentence] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setWord(null); setSentence(null); setSaved(false); setFailed(false);
    translate(picked.word).then(setWord).catch(() => setFailed(true));
  }, [picked]);

  async function showSentence() {
    setLoadingSentence(true);
    try { setSentence((await translate(picked.sentence)).main); } catch { setSentence("Translation unavailable right now."); }
    setLoadingSentence(false);
  }

  const highlighted = picked.sentence.split(new RegExp(`(${picked.word})`)).map((s, i) =>
    s === picked.word ? <mark key={i} className="rounded-sm bg-accent px-0.5 text-foreground">{s}</mark> : s,
  );

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-popover shadow-2xl">
      <div className="mx-auto max-w-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold">{picked.word}</h2>
            <button aria-label="Hear the word" onClick={() => speak(picked.word)} className="rounded-full p-1.5 text-primary hover:bg-secondary"><Volume2 className="h-5 w-5" /></button>
          </div>
          <button aria-label="Close" onClick={onClose} className="rounded p-1 hover:bg-secondary"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-1 text-lg">
          {failed ? "Translation unavailable right now." : word ? word.main : <span className="text-muted-foreground">Translating…</span>}
        </p>
        {word && word.alternatives.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">Also: {word.alternatives.join(" · ")}</p>
        )}

        <div className="mt-4 rounded-md bg-muted p-3">
          <div className="flex items-start gap-2">
            <p className="flex-1 font-reading text-sm italic">{highlighted}</p>
            <button aria-label="Hear the sentence" onClick={() => speak(picked.sentence)} className="rounded p-1 text-primary hover:bg-secondary"><Volume2 className="h-4 w-4" /></button>
          </div>
          {sentence ? (
            <p className="mt-2 border-t border-border pt-2 text-sm">{sentence}</p>
          ) : (
            <button onClick={showSentence} disabled={loadingSentence} className="mt-2 text-sm font-medium text-primary hover:underline">
              {loadingSentence ? "Translating…" : "Translate the whole sentence for context"}
            </button>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button size="sm" variant={saved ? "secondary" : "outline"} disabled={!word || saved}
            onClick={() => { saveWord({ word: picked.word.toLowerCase(), translation: word!.main, sentence: picked.sentence, at: Date.now() }); setSaved(true); }}>
            <Bookmark className="h-4 w-4" />{saved ? "Saved" : "Save word"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center px-5 text-center">{children}</div>;
}
