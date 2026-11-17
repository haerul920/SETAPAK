/**
 * Uji interaksi dan performa guliran waktu (.claude/commands/verifikasi.md langkah 4 dan 6).
 * Jalankan `pnpm start` dulu, lalu `pnpm interactions [--base=http://localhost:3000]`.
 * Hasil: screens/interactions.json, screens/guliran-penuh.webm, dan screenshot pendukung.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

const BASE = process.argv.find((a) => a.startsWith("--base="))?.split("=")[1] ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "screens");
fs.mkdirSync(OUT, { recursive: true });

type Result = { name: string; ok: boolean; detail: string };
const results: Result[] = [];
const record = (name: string, ok: boolean, detail: string) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}: ${detail}`);
};

async function counterText(p: Page): Promise<string> {
  return (await p.evaluate(() => document.querySelector("span[aria-live]")?.textContent ?? "")) || "";
}

async function visibleHit(p: Page, skip: string[] = []) {
  return p.evaluate((skip) => {
    const els = [...document.querySelectorAll<HTMLElement>("article .obj-hit")];
    const vis = els.find((e) => {
      const id = e.closest("article")?.id ?? "";
      const r = e.getBoundingClientRect();
      return !skip.includes(id) && r.top > 150 && r.bottom < window.innerHeight - 40 && r.width > 0;
    });
    if (!vis) return null;
    const r = vis.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, id: vis.closest("article")?.id ?? "" };
  }, skip);
}

async function main() {
  const browser = await chromium.launch();
  const logs: string[] = [];

  /* ---------- 1. FPS (tanpa perekaman) lalu video guliran penuh (desktop, animasi menyala) ---------- */
  for (const withVideo of [false, true]) {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ...(withVideo ? { recordVideo: { dir: OUT, size: { width: 1280, height: 800 } } } : {}),
    });
    const p = await ctx.newPage();
    p.on("console", (m) => m.type() === "error" && logs.push(m.text()));
    p.on("pageerror", (e) => logs.push(e.message));
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    // string, bukan fungsi: tsx menyisipkan helper __name pada fungsi bernama yang tidak ada di halaman
    await p.evaluate(`window.__frames = []; (function loop(t) { window.__frames.push(t); requestAnimationFrame(loop); })(performance.now());`);
    await p.mouse.move(720, 450);
    const total = await p.evaluate(() => document.documentElement.scrollHeight);
    const start = Date.now();
    while ((await p.evaluate(() => window.scrollY + window.innerHeight)) < total - 5 && Date.now() - start < 120_000) {
      await p.mouse.wheel(0, 420);
      await p.waitForTimeout(28);
    }
    await p.waitForTimeout(1500);
    const fps = await p.evaluate(() => {
      const f = (window as unknown as { __frames: number[] }).__frames;
      const dts = f.slice(1).map((t, i) => t - f[i]);
      const avg = dts.reduce((a, b) => a + b, 0) / dts.length;
      const long = dts.filter((d) => d > 50).length;
      return { avgFps: Math.round(1000 / avg), frames: f.length, longFrames: long };
    });
    const end = await counterText(p);
    const label = withVideo ? "sambil merekam video" : "tanpa perekaman";
    record(`Guliran penuh (${label})`, end.includes("2026"), `sampai ${end || "?"} dalam ${Math.round((Date.now() - start) / 1000)} dtk`);
    record(`FPS rata-rata ${label} (headless, tanpa GPU)`, fps.avgFps >= 30, `${fps.avgFps} fps, ${fps.longFrames} frame > 50 ms dari ${fps.frames}`);
    const video = p.video();
    await ctx.close();
    if (video) {
      const src = await video.path();
      fs.renameSync(src, path.join(OUT, "guliran-penuh.webm"));
    }
  }

  /* ---------- 2. Interaksi (desktop dan mobile) ---------- */
  for (const vp of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.name === "mobile" });
    const p = await ctx.newPage();
    p.on("console", (m) => m.type() === "error" && logs.push(`[${vp.name}] ${m.text()}`));
    p.on("pageerror", (e) => logs.push(`[${vp.name}] ${e.message}`));

    // klik 3 objek: laci terbuka dan tertutup tanpa mengubah posisi guliran
    const opened: string[] = [];
    for (const year of ["850", "1669.45", "1973"]) {
      await p.goto(`${BASE}/?tahun=${year}`, { waitUntil: "networkidle" });
      await p.waitForTimeout(1200);
      const y0 = await p.evaluate(() => window.scrollY);
      const hit = await visibleHit(p, opened);
      if (!hit) {
        record(`[${vp.name}] Klik objek ${year}`, false, "tidak ada objek terlihat");
        continue;
      }
      await p.mouse.click(hit.x, hit.y);
      await p.waitForTimeout(500);
      const open = (await p.locator("[role=dialog]").count()) === 1;
      const title = open ? await p.locator("#detail-title").textContent() : "";
      await p.keyboard.press("Escape");
      await p.waitForTimeout(500);
      const closed = (await p.locator("[role=dialog]").count()) === 0;
      const y1 = await p.evaluate(() => window.scrollY);
      opened.push(hit.id);
      record(`[${vp.name}] Laci ${hit.id}`, open && closed && Math.abs(y0 - y1) < 2, `buka "${title}", tutup, geser ${Math.abs(y0 - y1)} px`);
    }

    // hover benang situs Borobudur (desktop)
    if (vp.name === "desktop") {
      await p.goto(`${BASE}/?tahun=1814`, { waitUntil: "networkidle" });
      await p.waitForTimeout(1200);
      const box = await p.locator("#ev-borobudur-1814 .obj-hit").boundingBox();
      if (box) {
        await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await p.waitForTimeout(500);
        const lit = await p.evaluate(() => {
          const paths = [...document.querySelectorAll("svg path[stroke='#e7b75f']")] as SVGPathElement[];
          return paths.some((el) => Number(el.getAttribute("stroke-opacity")) > 0.9);
        });
        const dimmed = await p.evaluate(() => document.querySelectorAll("article.opacity-40").length);
        await p.screenshot({ path: path.join(OUT, "desktop-interaksi-benang.png") });
        record("[desktop] Benang situs Borobudur", lit, `benang menyala, ${dimmed} objek situs lain meredup`);
      }
    }

    // sekop Sambisari 1966
    await p.goto(`${BASE}/?tahun=1966.5`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1200);
    const shovel = p.locator("#ev-sambisari-1966 [role=slider]");
    const sb = await shovel.boundingBox();
    if (sb) {
      await p.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
      await p.mouse.down();
      for (let i = 1; i <= 12; i++) await p.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2 + i * 20);
      await p.mouse.up();
      await p.waitForTimeout(300);
      const val = await shovel.getAttribute("aria-valuetext");
      await p.screenshot({ path: path.join(OUT, `${vp.name}-interaksi-sekop.png`) });
      record(`[${vp.name}] Sekop Sambisari`, Boolean(val && val.includes("6,5")), `kedalaman ${val}`);
    } else record(`[${vp.name}] Sekop Sambisari`, false, "sekop tidak ditemukan");

    // senter gua Maros
    await p.goto(`${BASE}/?tahun=51200%20tahun%20lalu`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1200);
    const before = await p.evaluate(() => (document.querySelector("[data-torch]") as HTMLElement | null)?.style.transform ?? "");
    await p.mouse.move(vp.width * 0.2, vp.height * 0.7);
    await p.waitForTimeout(600);
    const after = await p.evaluate(() => (document.querySelector("[data-torch]") as HTMLElement | null)?.style.transform ?? "");
    await p.screenshot({ path: path.join(OUT, `${vp.name}-interaksi-senter.png`) });
    record(`[${vp.name}] Senter gua`, Boolean(after) && after !== before, `senter bergerak ke ${after.slice(0, 40)}`);

    // lompat ke 1945 lewat penghitung
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await p.waitForTimeout(800);
    await p.locator("button[aria-expanded]").first().click();
    await p.locator("input[aria-label]").first().fill("1945");
    await p.keyboard.press("Enter");
    await p.waitForTimeout(4500);
    const jumped = await counterText(p);
    record(`[${vp.name}] Lompat ke 1945`, jumped === "1945", `penghitung ${jumped}`);

    // tombol kembali di penutup
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await p.waitForTimeout(1500);
    const back = p.getByRole("button", { name: /Kembali ke 1,65 juta tahun lalu/ });
    await back.scrollIntoViewIfNeeded();
    await back.click();
    await p.waitForTimeout(4500);
    const top = await p.evaluate(() => window.scrollY);
    const startText = await counterText(p);
    record(`[${vp.name}] Kembali ke awal`, top < 5, `scrollY ${Math.round(top)}, penghitung ${startText}`);

    // tidak ada sisa elemen bab, kuis, atau onboarding
    const leftovers = await p.evaluate(() => /\b(Bab \d|Kuis|Checkpoint|Onboarding|Mode Kelas|Sertifikat)\b/.test(document.body.innerText));
    record(`[${vp.name}] Tanpa sisa bab/kuis/onboarding`, !leftovers, leftovers ? "ditemukan" : "bersih");

    await ctx.close();
  }

  await browser.close();
  record("Konsol browser", logs.length === 0, logs.length ? logs.slice(0, 5).join(" | ") : "bersih");
  fs.writeFileSync(path.join(OUT, "interactions.json"), JSON.stringify({ results, logs }, null, 2));
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? `\n${failed} pemeriksaan gagal.` : "\nSemua pemeriksaan lolos.");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
