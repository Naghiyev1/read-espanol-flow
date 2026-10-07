import JSZip from "jszip";

export async function parseEpub(file: File) {
  const zip = await JSZip.loadAsync(file);
  const container = await zip.file("META-INF/container.xml")?.async("text");
  if (!container) throw new Error("Not a valid EPUB file");
  const dp = new DOMParser();
  const opfPath = dp.parseFromString(container, "application/xml").querySelector("rootfile")?.getAttribute("full-path");
  if (!opfPath) throw new Error("EPUB is missing its table of contents");
  const opfText = await zip.file(opfPath)!.async("text");
  const opf = dp.parseFromString(opfText, "application/xml");
  const base = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";
  const title = opf.getElementsByTagName("dc:title")[0]?.textContent?.trim() || file.name.replace(/\.epub$/i, "");
  const author = opf.getElementsByTagName("dc:creator")[0]?.textContent?.trim() || "Desconocido";
  const manifest = new Map<string, string>();
  opf.querySelectorAll("manifest > item").forEach((i) => manifest.set(i.getAttribute("id")!, i.getAttribute("href")!));
  const paragraphs: string[] = [];
  for (const ref of Array.from(opf.querySelectorAll("spine > itemref"))) {
    const href = manifest.get(ref.getAttribute("idref")!);
    if (!href) continue;
    const html = await zip.file(decodeURIComponent(base + href))?.async("text");
    if (!html) continue;
    const doc = dp.parseFromString(html, "text/html");
    doc.querySelectorAll("p, h1, h2, h3, h4, li, blockquote").forEach((el) => {
      if (el.querySelector("p")) return;
      const t = el.textContent?.replace(/\s+/g, " ").trim();
      if (t) paragraphs.push(t);
    });
  }
  if (!paragraphs.length) throw new Error("No readable text found in this EPUB");
  return { title, author, paragraphs };
}

export async function parseTxt(file: File) {
  const text = await file.text();
  const paragraphs = text
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
  return { title: file.name.replace(/\.txt$/i, ""), author: "Desconocido", paragraphs };
}
