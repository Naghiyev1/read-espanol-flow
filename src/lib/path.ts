// Reading path: verified Gutenberg IDs (full Spanish text), easiest first.
// `search` is only a fallback if the pinned ID's metadata can't be fetched.
export type Level = "Principiante" | "Intermedio" | "Avanzado";
export const PATH: { level: Level; id: number; search: string; note: string }[] = [
  { level: "Principiante", id: 55206, search: "fábulas", note: "Very short fables with simple morals" },
  { level: "Principiante", id: 55514, search: "cuentos de amor", note: "Short stories, one sitting each" },
  { level: "Principiante", id: 320, search: "Lazarillo de Tormes", note: "A short, funny classic novel" },
  { level: "Intermedio", id: 10814, search: "Bécquer", note: "Atmospheric legends, short chapters" },
  { level: "Intermedio", id: 17340, search: "Marianela", note: "Galdós at his most readable" },
  { level: "Intermedio", id: 17223, search: "Pepita Jiménez", note: "A charming novel in letters" },
  { level: "Avanzado", id: 17073, search: "La Regenta", note: "A rich, long 19th-century novel" },
  { level: "Avanzado", id: 2000, search: "Don Quijote", note: "The great one — take your time" },
];
