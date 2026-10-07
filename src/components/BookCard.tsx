import { Link } from "@tanstack/react-router";

export function BookCard({ id, title, author, cover, sub }: { id: string; title: string; author: string; cover?: string | undefined; sub?: string }) {
  return (
    <Link to="/read/$bookId" params={{ bookId: id }} className="group flex gap-4 rounded-lg border border-border bg-card p-3 transition hover:border-primary">
      <div className="h-24 w-16 shrink-0 overflow-hidden rounded bg-secondary">
        {cover ? (
          <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center p-1 text-center font-display text-xs text-secondary-foreground">{title.slice(0, 30)}</div>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug group-hover:text-primary">{title}</h3>
        <p className="mt-1 truncate text-sm text-muted-foreground">{author}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </div>
    </Link>
  );
}
