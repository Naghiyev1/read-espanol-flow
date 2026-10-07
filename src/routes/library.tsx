import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { BookCard } from "@/components/BookCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchBooks } from "@/lib/books.functions";
import { parseEpub, parseTxt } from "@/lib/epub";
import { addUpload, getUploads, putStoredBook, removeUpload, type BookMeta } from "@/lib/storage";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library — Hundreds of free Spanish books | Lector" },
      { name: "description", content: "Browse complete public-domain Spanish books or upload your own EPUB to read with tap-to-translate." },
      { property: "og:title", content: "Library — Free Spanish books | Lector" },
      { property: "og:description", content: "Hundreds of full Spanish classics, plus your own EPUB uploads." },
    ],
  }),
  component: Library,
});

function Library() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [uploads, setUploads] = useState<BookMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const search = useServerFn(searchBooks);

  useEffect(() => { getUploads().then(setUploads); }, []);

  const query = useInfiniteQuery({
    queryKey: ["catalog", term],
    queryFn: ({ pageParam }) => search({ data: { search: term || undefined, page: pageParam } }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.hasMore ? all.length + 1 : undefined),
    staleTime: 1000 * 60 * 30,
  });
  const books = query.data?.pages.flatMap((p) => p.books) ?? [];

  async function onFile(f: File) {
    setBusy(true);
    try {
      const parsed = f.name.toLowerCase().endsWith(".txt") ? await parseTxt(f) : await parseEpub(f);
      const key = `u-${crypto.randomUUID().slice(0, 8)}`;
      await putStoredBook({ key, title: parsed.title, author: parsed.author, paragraphs: parsed.paragraphs });
      await addUpload({ key, title: parsed.title, author: parsed.author });
      navigate({ to: "/read/$bookId", params: { bookId: key } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open that file");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold">Biblioteca</h1>
            <p className="mt-1 text-muted-foreground">{query.data?.pages[0]?.count ?? "…"} free Spanish books from Project Gutenberg.</p>
          </div>
          <div>
            <input ref={fileRef} type="file" accept=".epub,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" />{busy ? "Opening…" : "Upload EPUB"}
            </Button>
          </div>
        </div>

        {uploads.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold">Your uploads</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {uploads.map((u) => (
                <div key={u.key} className="relative">
                  <BookCard id={u.key} title={u.title} author={u.author} sub="Saved on this device" />
                  <button aria-label="Delete upload" className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:text-destructive"
                    onClick={async () => { await removeUpload(u.key); setUploads(await getUploads()); }}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <form className="mt-8 flex gap-2" onSubmit={(e) => { e.preventDefault(); setTerm(q.trim()); }}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title or author (e.g. Galdós, cuentos)" />
          <Button type="submit">Buscar</Button>
        </form>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((b) => (
            <BookCard key={b.id} id={`g-${b.id}`} title={b.title} author={b.author} cover={b.cover} />
          ))}
        </div>
        {query.isLoading && <p className="mt-6 text-muted-foreground">Loading books…</p>}
        {query.isError && <p className="mt-6 text-destructive">The catalog is not responding right now. Try again in a moment.</p>}
        {query.hasNextPage && (
          <div className="mt-8 text-center">
            <Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
              {query.isFetchingNextPage ? "Loading…" : "Show more books"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
