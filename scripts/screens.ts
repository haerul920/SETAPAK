/**
 * Screenshot verifikasi guliran waktu SETAPAK (.claude/commands/verifikasi.md).
 * Jalankan `pnpm start` dulu, lalu `pnpm screens`. Hasil di screens/ + screens/console.json.
 * Opsi: --base=http://localhost:3000  --only=desktop|mobile  --filter=1669  --motion (animasi menyala)
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const BASE = arg("base") ?? "http://localhost:3000";
const ONLY = arg("only");
const FILTER = arg("filter");
const MOTION = process.argv.includes("--motion");
const OUT = path.join(process.cwd(), "screens");
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
].filter((v) => !ONLY || v.name === ONLY);

/** [nama berkas, nilai ?tahun=] ; null = layar pembuka */
const YEARS: [string, string | null][] = [
  ["00-pembuka", null],
  ["01-1600000-tahun-lalu", "1600000 tahun lalu"],
  ["02-51200-tahun-lalu-maros", "51200 tahun lalu"],
  ["03-800", "800"],
  ["04-1000-lahar", "1000"],
  ["05-1350", "1350"],
  ["06-1669", "1669.45"],
  ["07-1814", "1814"],
  ["08-1891", "1891"],
  ["09-1945", "1945.62"],
  ["10-1966", "1966.5"],
  ["11-1983", "1983"],
  ["12-2006", "2006.4"],
  ["13-2009-klaster", "2009"],
  ["14-2024", "2024.45"],
  ["15-2026-penutup", "2026"],
];

async function main() {
  const browser = await chromium.launch();
  const consoleLog: Record<string, string[]> = {};
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
    await ctx.addInitScript((motion: boolean) => {
      try {
        window.localStorage.setItem("setapak-v3", JSON.stringify({ state: { lang: "id", noMotion: !motion, sound: false, volume: 0.5 }, version: 1 }));
      } catch {
        /* abaikan */
      }
    }, MOTION);
    const page = await ctx.newPage();
    const logs: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") logs.push(`[${m.type()}] ${m.text()}`);
    });
    page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
    for (const [name, year] of YEARS) {
      if (FILTER && !name.includes(FILTER)) continue;
      const url = year === null ? `${BASE}/` : `${BASE}/?tahun=${encodeURIComponent(year)}`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(year === null ? 600 : 1500);
      const file = path.join(OUT, `${vp.name}-${name}.png`);
      await page.screenshot({ path: file });
      const counter = await page.locator("button[aria-expanded]").first().getAttribute("aria-label").catch(() => "");
      console.log(`${vp.name} ${name}: ${counter ?? ""}`);
    }
    consoleLog[vp.name] = logs;
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, "console.json"), JSON.stringify(consoleLog, null, 2));
  const total = Object.values(consoleLog).flat().length;
  console.log(total ? `Konsol: ${total} pesan (lihat screens/console.json)` : "Konsol bersih.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
