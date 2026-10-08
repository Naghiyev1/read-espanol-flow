import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type CatalogBook = {
  id: number;
  title: string;
  author: string;
  summary: string;
  downloads: number;
  cover?: string | undefined;
};

type GutendexBook = {
  id: number;
  title: string;
  authors: { name: string }[];
  summaries?: string[];
  download_count: number;
  media_type?: string;
  formats: Record<string, string>;
};

function isReadable(b: GutendexBook) {
  if (b.media_type && b.media_type !== "Text") return false;
  return Object.keys(b.formats).some(
    (k) => k.startsWith("text/plain") || k.startsWith("application/epub") || k.startsWith("text/html"),
  );
}

function mapBook(b: GutendexBook): CatalogBook {
  return {
    id: b.id,
    title: b.title,
    author: b.authors[0]?.name ?? "Anónimo",
    summary: b.summaries?.[0] ?? "",
    downloads: b.download_count,
    cover: b.formats["image/jpeg"],
  };
}

async function fetchWithTimeout(url: string, ms = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { redirect: "follow", signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export const searchBooks = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({ search: z.string().max(100).optional(), page: z.number().int().min(1).max(200).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const url = new URL("https://gutendex.com/books/");
    url.searchParams.set("languages", "es");
    url.searchParams.set("mime_type", "text/");
    if (data.search) url.searchParams.set("search", data.search);
    if (data.page) url.searchParams.set("page", String(data.page));
    const res = await fetchWithTimeout(url.toString());
    if (!res.ok) throw new Error(`Catalog unavailable (${res.status})`);
    const json = (await res.json()) as { count: number; next: string | null; results: GutendexBook[] };
    return { count: json.count, hasMore: !!json.next, books: json.results.filter(isReadable).map(mapBook) };
  });

export const getBookMeta = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const r = await fetchWithTimeout(`https://gutendex.com/books/${data.id}`, 15000);
    if (!r.ok) return null;
    return mapBook((await r.json()) as GutendexBook);
  });

async function decode(r: Response, hint: string) {
  const buf = await r.arrayBuffer();
  const ct = (r.headers.get("content-type") ?? "") + " " + hint;
  if (/iso-8859-1|latin-?1/i.test(ct)) return new TextDecoder("iso-8859-1").decode(buf);
  const utf = new TextDecoder("utf-8").decode(buf);
  // Mis-detected Latin-1 shows up as replacement characters.
  const bad = (utf.match(/\uFFFD/g) ?? []).length;
  return bad > 5 ? new TextDecoder("iso-8859-1").decode(buf) : utf;
}

export const getBookText = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const id = data.id;
    const meta = await fetchWithTimeout(`https://gutendex.com/books/${id}`, 10000)
      .then((r) => (r.ok ? (r.json() as Promise<GutendexBook>) : null))
      .catch(() => null);
    if (meta && meta.media_type && meta.media_type !== "Text") {
      throw new Error("This item is an audiobook, not a text book");
    }
    const candidates: { url: string; hint: string }[] = [];
    if (meta) {
      for (const [k, v] of Object.entries(meta.formats)) {
        if (k.startsWith("text/plain") && !v.endsWith(".zip")) candidates.push({ url: v, hint: k });
      }
      candidates.sort((a, b) => Number(b.hint.includes("utf-8")) - Number(a.hint.includes("utf-8")));
    }
    candidates.push(
      { url: `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`, hint: "" },
      { url: `https://www.gutenberg.org/files/${id}/${id}-0.txt`, hint: "utf-8" },
      { url: `https://www.gutenberg.org/ebooks/${id}.txt.utf-8`, hint: "utf-8" },
      { url: `https://www.gutenberg.org/files/${id}/${id}.txt`, hint: "" },
    );
    let text = "";
    const seen = new Set<string>();
    for (const c of candidates) {
      if (seen.has(c.url)) continue;
      seen.add(c.url);
      try {
        const r = await fetchWithTimeout(c.url);
        if (!r.ok) continue;
        const t = await decode(r, c.hint);
        if (t.trim().length > 500) {
          text = t;
          break;
        }
      } catch {
        /* try next source */
      }
    }
    if (!text) throw new Error("Could not download this book");
    const headTitle = text.slice(0, 5000).match(/^Title:\s*(.+)$/m)?.[1]?.trim();
    const headAuthor = text.slice(0, 5000).match(/^Author:\s*(.+)$/m)?.[1]?.trim();
    const start = text.search(/\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG[^\n]*\n/i);
    if (start >= 0) text = text.slice(text.indexOf("\n", start) + 1);
    const end = text.search(/\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG/i);
    if (end >= 0) text = text.slice(0, end);
    const paragraphs = text
      .replace(/^\uFEFF/, "")
      .replace(/\r/g, "")
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s*\n\s*/g, " ").replace(/_/g, "").trim())
      .filter((p) => p.length > 0);
    const fallback: CatalogBook | null = headTitle
      ? { id, title: headTitle, author: headAuthor ?? "Anónimo", summary: "", downloads: 0, cover: `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg` }
      : null;
    return { paragraphs, meta: meta ? mapBook(meta) : fallback };
  });
