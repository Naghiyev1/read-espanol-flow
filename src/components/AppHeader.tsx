import { Link } from "@tanstack/react-router";

export function AppHeader() {
  const cls = "text-sm text-muted-foreground hover:text-foreground transition-colors";
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link to="/" className="font-display text-2xl font-semibold text-foreground">
          Lector<span className="text-primary">.</span>
        </Link>
        <nav className="flex gap-5">
          <Link to="/" className={cls} activeProps={{ className: "text-foreground font-medium" }} activeOptions={{ exact: true }}>Hoy</Link>
          <Link to="/library" className={cls} activeProps={{ className: "text-foreground font-medium" }}>Biblioteca</Link>
          <Link to="/words" className={cls} activeProps={{ className: "text-foreground font-medium" }}>Palabras</Link>
        </nav>
      </div>
    </header>
  );
}
