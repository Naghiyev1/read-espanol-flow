import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type CatalogBook = {
  id: number;
  title: string;
  author: string;
  summary: string;
  downloads: number;
  cover?: string;
};

type GutendexBook = {
  id: number;
  title: string;
  authors: { name: string }[];
  summaries?: string[];
  download_count: number;
  formats: Record<string, string>;
};

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

export const searchBooks = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({ search: z.string().max(100).optional(), page: z.number().int().min(1).max(200).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const url = new URL("https://gutendex.com/books/");
    url.searchParams.set("languages", "es");
    if (data.search) url.searchParams.set("search", data.search);
    if (data.page) url.searchParams.set("page", String(data.page));
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Catalog unavailable (${res.status})`);
    const json = (await res.json()) as { count: number; next: string | null; results: GutendexBook[] };
    return { count: json.count, hasMore: !!json.next, books: json.results.map(mapBook) };
  });

export const getBookText = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const urls = [
      `https://www.gutenberg.org/cache/epub/${data.id}/pg${data.id}.txt`,
      `https://www.gutenberg.org/ebooks/${data.id}.txt.utf-8`,
    ];
    let text = "";
    for (const u of urls) {
      const r = await fetch(u, { redirect: "follow" });
      if (r.ok) {
        text = await r.text();
        break;
      }
    }
    if (!text) throw new Error("Could not download this book");
    const start = text.search(/\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG[^\n]*\n/i);
    if (start >= 0) text = text.slice(text.indexOf("\n", start) + 1);
    const end = text.search(/\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG/i);
    if (end >= 0) text = text.slice(0, end);
    const paragraphs = text
      .replace(/\r/g, "")
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s*\n\s*/g, " ").replace(/_/g, "").trim())
      .filter((p) => p.length > 0);
    return { paragraphs };
  });
