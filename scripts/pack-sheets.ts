/**
 * SETAPAK - Lembar kontak ringkas untuk kurasi visual (docs/ASSET_PIPELINE.md, langkah 7).
 * Menggabungkan beberapa kelompok kandidat (target + key) ke satu halaman gambar supaya puluhan
 * kelompok baru bisa diperiksa satu per satu dengan tool Read tanpa ratusan berkas.
 *
 * Pemakaian: tsx scripts/pack-sheets.ts [--groups=3] [--cols=6] [--only=target1,target2] [--skip-curated]
 * Hasil: scripts/.cache/pages/page-NN.jpg dan page-NN.txt (legenda cid | judul | lisensi | pembuat).
 */
import fs from "node:fs";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import type { Candidate } from "./fetch-assets";

const ROOT = process.cwd();
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const PER_PAGE = Number(arg("groups") ?? 3);
const COLS = Number(arg("cols") ?? 6);
const ONLY = arg("only")?.split(",");
const SKIP_CURATED = process.argv.includes("--skip-curated");
const FILE = arg("file") === "trace" ? "trace-candidates.json" : arg("file") ? `${arg("file")}.json` : "candidates.json";
const GROUP_BY_KEY = arg("group-by") === "key";
const TW = 290;
const TH = 190;
const LABEL_H = 22;
const HEAD_H = 26;

const esc = (s: string) => s.replace(/[<>&"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[ch] as string);
const svg = (w: number, h: number, body: string) => Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`);

async function main(): Promise<void> {
  const cands = (JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", ".cache", FILE), "utf8")) as Candidate[]).filter(
    (c) => c.role !== "audio" && c.rawFile && (!ONLY || ONLY.includes(c.target))
  );
  let curated = new Set<string>();
  if (SKIP_CURATED && fs.existsSync(path.join(ROOT, "data", "asset-curation.json"))) {
    const cur = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "asset-curation.json"), "utf8")) as { accepted: { cid: string }[] };
    curated = new Set(cur.accepted.map((a) => a.cid));
  }
  const groups = new Map<string, Candidate[]>();
  for (const c of cands) {
    const g = GROUP_BY_KEY ? c.key : `${c.target}__${c.key}`;
    groups.set(g, [...(groups.get(g) ?? []), c]);
  }
  // kelompok yang sudah punya aset diterima di kurasi dilewati bila diminta
  const list = [...groups.entries()].filter(([, l]) => !SKIP_CURATED || !l.some((c) => curated.has(c.cid)));
  const outDir = path.join(ROOT, "scripts", ".cache", "pages");
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  let page = 0;
  for (let i = 0; i < list.length; i += PER_PAGE) {
    const slice = list.slice(i, i + PER_PAGE);
    page++;
    const rows = slice.map(([, l]) => Math.ceil(l.length / COLS));
    const H = slice.reduce((a, _, k) => a + HEAD_H + rows[k] * (TH + LABEL_H), 0);
    const W = COLS * TW;
    const comp: OverlayOptions[] = [];
    const legend: string[] = [];
    let y = 0;
    for (let g = 0; g < slice.length; g++) {
      const [name, items] = slice[g];
      comp.push({ input: svg(W, HEAD_H, `<rect width="100%" height="100%" fill="#2a2a2a"/><text x="8" y="18" font-family="monospace" font-size="15" fill="#9fe3ff">${esc(name)}</text>`), left: 0, top: y });
      y += HEAD_H;
      legend.push(`## ${name}`);
      for (let k = 0; k < items.length; k++) {
        const c = items[k];
        const x = (k % COLS) * TW;
        const top = y + Math.floor(k / COLS) * (TH + LABEL_H);
        try {
          const tile = await sharp(path.join(ROOT, c.rawFile!)).rotate().resize(TW - 6, TH - 6, { fit: "contain", background: "#1b1b1b" }).jpeg({ quality: 68 }).toBuffer();
          comp.push({ input: tile, left: x + 3, top: top + 3 });
        } catch {
          /* berkas rusak: kotak kosong */
        }
        comp.push({ input: svg(TW, LABEL_H, `<rect width="100%" height="100%" fill="#000"/><text x="5" y="16" font-family="monospace" font-size="13" fill="#ffd27a">${k + 1}. ${esc(c.cid.split("-").pop() ?? "")} ${c.year ?? ""} ${Math.max(c.width, c.height)}px</text>`), left: x, top: top + TH });
        legend.push(`${k + 1}. ${c.cid} | ${(c as { traceName?: string }).traceName ? `[${(c as { traceName?: string }).traceName}] ` : ""}${c.title.replace(/^File:/, "")} | ${c.license} | ${c.author.slice(0, 50)}`);
      }
      y += rows[g] * (TH + LABEL_H);
    }
    const name = `page-${String(page).padStart(2, "0")}`;
    await sharp({ create: { width: W, height: H, channels: 3, background: "#111" } }).composite(comp).jpeg({ quality: 70 }).toFile(path.join(outDir, `${name}.jpg`));
    fs.writeFileSync(path.join(outDir, `${name}.txt`), legend.join("\n") + "\n");
  }
  console.log(`${list.length} kelompok, ${page} halaman di scripts/.cache/pages`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
