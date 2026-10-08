import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBookMeta, searchBooks, type CatalogBook } from "@/lib/books.functions";
import { PATH } from "@/lib/path";

export function useReadingPath() {
  const meta = useServerFn(getBookMeta);
  const search = useServerFn(searchBooks);
  return useQueries({
    queries: PATH.map((step) => ({
      queryKey: ["path", step.id],
      queryFn: async (): Promise<CatalogBook | null> => {
        try {
          const b = await meta({ data: { id: step.id } });
          if (b) return b;
        } catch {
          /* fall through */
        }
        try {
          return (await search({ data: { search: step.search } })).books[0] ?? null;
        } catch {
          return null;
        }
      },
      staleTime: Infinity,
    })),
  }).map((q, i) => ({ ...PATH[i]!, book: q.data ?? null, loading: q.isLoading }));
}
