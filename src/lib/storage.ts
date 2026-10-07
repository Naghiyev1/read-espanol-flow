import { get, set, del } from "idb-keyval";

export type BookMeta = {
  key: string; // "g-123" (Gutenberg) or "u-xxxx" (upload)
  title: string;
  author: string;
  cover?: string;
};

export type Progress = BookMeta & {
  page: number;
  totalPages: number;
  updatedAt: number;
  finished?: boolean;
};

const PROGRESS = "lector.progress";
const DAYS = "lector.days"; // { "2026-10-07": seconds }
const GOAL = "lector.goal"; // minutes
const SAVED = "lector.words";

const read = <T,>(k: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));

export const getAllProgress = () => read<Record<string, Progress>>(PROGRESS, {});
export const getProgress = (key: string) => getAllProgress()[key];
export function saveProgress(p: Progress) {
  const all = getAllProgress();
  all[p.key] = p;
  write(PROGRESS, all);
}
export function removeProgress(key: string) {
  const all = getAllProgress();
  delete all[key];
  write(PROGRESS, all);
}

export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const getDays = () => read<Record<string, number>>(DAYS, {});
export function addReadingSeconds(s: number) {
  const days = getDays();
  const k = dayKey();
  days[k] = (days[k] ?? 0) + s;
  write(DAYS, days);
}
export const getGoal = () => read<number>(GOAL, 10);
export const setGoal = (m: number) => write(GOAL, m);

export function getStreak() {
  const days = getDays();
  const goal = getGoal() * 60;
  let streak = 0;
  const d = new Date();
  if ((days[dayKey(d)] ?? 0) < goal) d.setDate(d.getDate() - 1); // today not done yet doesn't break streak
  while ((days[dayKey(d)] ?? 0) >= goal) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export type SavedWord = { word: string; translation: string; sentence: string; at: number };
export const getSavedWords = () => read<SavedWord[]>(SAVED, []);
export function saveWord(w: SavedWord) {
  const list = getSavedWords().filter((x) => x.word !== w.word);
  write(SAVED, [w, ...list].slice(0, 500));
}
export function removeWord(word: string) {
  write(SAVED, getSavedWords().filter((x) => x.word !== word));
}

// Big content lives in IndexedDB
export type StoredBook = BookMeta & { paragraphs: string[] };
export const getStoredBook = (key: string) => get<StoredBook>(`book:${key}`);
export const putStoredBook = (b: StoredBook) => set(`book:${b.key}`, b);
export const deleteStoredBook = (key: string) => del(`book:${key}`);
export const getUploads = async () => (await get<BookMeta[]>("uploads")) ?? [];
export async function addUpload(m: BookMeta) {
  const list = await getUploads();
  await set("uploads", [m, ...list.filter((x) => x.key !== m.key)]);
}
export async function removeUpload(key: string) {
  await set("uploads", (await getUploads()).filter((x) => x.key !== key));
  await deleteStoredBook(key);
  removeProgress(key);
}
