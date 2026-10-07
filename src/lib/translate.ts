// Free translation via MyMemory (no key, runs in the browser).
const cache = new Map<string, Promise<{ main: string; alternatives: string[] }>>();

export function translate(text: string) {
  const key = text.toLowerCase();
  if (!cache.has(key)) {
    const p = fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=es|en`,
    )
      .then((r) => r.json())
      .then((j) => {
        const main: string = j?.responseData?.translatedText ?? "";
        const alts = new Set<string>();
        for (const m of j?.matches ?? []) {
          const t = String(m.translation ?? "").trim();
          if (t && t.toLowerCase() !== main.toLowerCase() && t.length < 60 && !/[<>]/.test(t)) alts.add(t);
        }
        return { main, alternatives: Array.from(alts).slice(0, 4) };
      });
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return cache.get(key)!;
}

export function speak(text: string, rate = 0.85) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-ES";
  u.rate = rate;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("es"));
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

export function sentenceAround(paragraph: string, offset: number) {
  const before = paragraph.slice(0, offset);
  const s = Math.max(before.lastIndexOf(". "), before.lastIndexOf("? "), before.lastIndexOf("! "), before.lastIndexOf("; ")) + 1;
  const rest = paragraph.slice(offset);
  const m = rest.search(/[.?!;](\s|$)/);
  const e = m >= 0 ? offset + m + 1 : paragraph.length;
  return paragraph.slice(s, e).trim().slice(0, 450);
}
