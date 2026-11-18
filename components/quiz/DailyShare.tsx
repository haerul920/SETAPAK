"use client";

import { Copy, Download, Share2 } from "lucide-react";
import { useState } from "react";
import { shareGrid, type Verdict } from "@/lib/quiz";
import { useCopy } from "@/lib/useCopy";

const COLORS: Record<Verdict, string> = { benar: "#4caf73", hampir: "#e7b75f", salah: "#2c2620" };

/** Kartu gambar hasil harian: kisi kotak hijau dan kuning tanpa membocorkan jawaban. */
function drawCard(dateKey: string, results: readonly Verdict[], score: number, title: string): HTMLCanvasElement {
  const size = 56;
  const gap = 10;
  const w = 640;
  const h = 360;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = "#14100c";
  g.fillRect(0, 0, w, h);
  const grad = g.createRadialGradient(120, 0, 0, 120, 0, 420);
  grad.addColorStop(0, "rgba(231,183,95,0.25)");
  grad.addColorStop(1, "rgba(231,183,95,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#f5ecdc";
  g.font = "600 34px serif";
  g.fillText(title, 36, 64);
  g.font = "20px sans-serif";
  g.fillStyle = "#d9c7a7";
  g.fillText(dateKey, 36, 98);
  const total = results.length * size + (results.length - 1) * gap;
  const x0 = (w - total) / 2;
  results.forEach((v, i) => {
    g.fillStyle = COLORS[v];
    g.beginPath();
    g.roundRect(x0 + i * (size + gap), 150, size, size, 10);
    g.fill();
  });
  g.fillStyle = "#e7b75f";
  g.font = "600 44px serif";
  g.textAlign = "center";
  g.fillText(String(score), w / 2, 290);
  g.textAlign = "left";
  g.fillStyle = "#d9c7a7";
  g.font = "16px sans-serif";
  g.fillText("setapak.budayago.id/kuis", 36, h - 24);
  return c;
}

export function DailyShare({ dateKey, results, score }: { dateKey: string; results: readonly Verdict[]; score: number }) {
  const { t } = useCopy();
  const [note, setNote] = useState<string | null>(null);
  const text = `${t.quiz.daily.shareTitle} ${dateKey}\n${shareGrid(results)}\n${score}`;
  const flash = (m: string) => {
    setNote(m);
    window.setTimeout(() => setNote(null), 2200);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      flash(t.quiz.daily.copied);
    } catch {
      window.prompt(t.quiz.daily.share, text);
    }
  };
  const save = () => {
    const canvas = drawCard(dateKey, results, score, t.quiz.daily.shareTitle);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `setapak-harian-${dateKey}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: t.quiz.daily.shareTitle, text });
          return;
        } catch {
          /* pengguna membatalkan: lanjut mengunduh */
        }
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, "image/png");
  };

  return (
    <section className="rounded-2xl border border-current/15 bg-black/20 p-4 text-center" aria-label={t.quiz.daily.share} data-quiz-share>
      <p className="font-mono text-xs uppercase tracking-widest opacity-75">{t.quiz.daily.today(dateKey)}</p>
      <p className="my-3 text-4xl tracking-[0.2em]" aria-label={results.join(", ")} data-quiz-grid>
        {shareGrid(results)}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-full border border-current/30 px-4 py-2 text-sm hover:border-[var(--accent)]">
          <Copy className="h-4 w-4" aria-hidden />
          {t.quiz.daily.copyText}
        </button>
        <button type="button" onClick={save} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#0d0b09]">
          {typeof navigator !== "undefined" && "share" in navigator ? <Share2 className="h-4 w-4" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
          {t.quiz.daily.saveImage}
        </button>
      </div>
      {note && (
        <p className="mt-2 text-xs text-verified" role="status">
          {note}
        </p>
      )}
    </section>
  );
}
