import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { searchBooks } from "@/lib/books.functions";
import { PATH } from "@/lib/path";

export function useReadingPath() {
  const search = useServerFn(searchBooks);
  return useQueries({
    queries: PATH.map((step) => ({
      queryKey: ["path", step.search],
      queryFn: async () => (await search({ data: { search: step.search } })).books[0] ?? null,
      staleTime: Infinity,
    })),
  }).map((q, i) => ({ ...PATH[i], book: q.data ?? null, loading: q.isLoading }));
}
