import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Volume2, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { getSavedWords, removeWord, type SavedWord } from "@/lib/storage";
import { speak } from "@/lib/translate";

export const Route = createFileRoute("/words")({
  head: () => ({
    meta: [
      { title: "My words — Saved Spanish vocabulary | Lector" },
      { name: "description", content: "Review the Spanish words you saved while reading, with their sentences." },
      { property: "og:title", content: "My words | Lector" },
      { property: "og:description", content: "Your personal Spanish vocabulary list, collected from real books." },
    ],
  }),
  component: Words,
});

function Words() {
  const [words, setWords] = useState<SavedWord[]>([]);
  useEffect(() => setWords(getSavedWords()), []);
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-4xl font-semibold">Mis palabras</h1>
        <p className="mt-1 text-muted-foreground">{words.length} words saved while reading.</p>
        {words.length === 0 && <p className="mt-8 text-muted-foreground">Tap a word while reading and press “Save” to collect it here.</p>}
        <ul className="mt-6 space-y-3">
          {words.map((w) => (
            <li key={w.word} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p><span className="font-display text-xl font-semibold">{w.word}</span> <span className="text-muted-foreground">— {w.translation}</span></p>
                <div className="flex gap-1">
                  <button aria-label="Listen" onClick={() => speak(w.word)} className="rounded p-1.5 hover:bg-secondary"><Volume2 className="h-4 w-4" /></button>
                  <button aria-label="Remove" onClick={() => { removeWord(w.word); setWords(getSavedWords()); }} className="rounded p-1.5 hover:bg-secondary"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="mt-2 font-reading text-sm italic text-muted-foreground">“{w.sentence}”</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
