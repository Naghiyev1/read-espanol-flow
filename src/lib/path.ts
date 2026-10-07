// Reading path: curated searches against the free Gutenberg catalog, easiest first.
export type Level = "Principiante" | "Intermedio" | "Avanzado";
export const PATH: { level: Level; search: string; note: string }[] = [
  { level: "Principiante", search: "fábulas", note: "Very short fables with simple morals" },
  { level: "Principiante", search: "cuentos de amor", note: "Short stories, one sitting each" },
  { level: "Principiante", search: "Lazarillo de Tormes", note: "A short, funny classic novel" },
  { level: "Intermedio", search: "Bécquer leyendas", note: "Atmospheric legends, short chapters" },
  { level: "Intermedio", search: "Marianela", note: "Galdós at his most readable" },
  { level: "Intermedio", search: "Pepita Jiménez", note: "A charming novel in letters" },
  { level: "Avanzado", search: "La Regenta", note: "A rich, long 19th-century novel" },
  { level: "Avanzado", search: "Don Quijote", note: "The great one — take your time" },
];
