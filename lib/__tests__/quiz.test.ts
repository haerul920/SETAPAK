import { describe, expect, it } from "vitest";
import { sortedEvents } from "@/data";
import { imagesFor } from "@/lib/media";
import {
  adaptStep,
  ALL_TIME,
  axisYear,
  CHALLENGE_EVERY,
  dailyQuestions,
  dateKey,
  DAILY_COUNT,
  evaluate,
  haversineKm,
  initialAdapt,
  LEVELS,
  makeFactQuestion,
  makeOrderQuestion,
  makeQuestion,
  makeWhereQuestion,
  makeWhichQuestion,
  makeYearQuestion,
  QUESTION_MODES,
  quizEvent,
  quizSite,
  scoreDistance,
  scoreOrder,
  scoreYear,
  scrollChallenge,
  seedFrom,
  shareGrid,
  yearTolerance,
  type Question,
  type Level,
} from "@/lib/quiz";
import { rng } from "@/lib/scene-shapes";

const seeds = Array.from({ length: 40 }, (_, i) => i + 1);

describe("generator soal", () => {
  it("Situs Mana: tepat satu jawaban benar, 4 opsi unik, pengecoh bukan jawaban", () => {
    for (const level of LEVELS) {
      for (const s of seeds) {
        const q = makeWhichQuestion(rng(s), ALL_TIME, level);
        expect(q).toBeTruthy();
        expect(q!.options.length).toBe(4);
        expect(new Set(q!.options).size).toBe(4);
        expect(q!.options.filter((o) => o === q!.answer).length).toBe(1);
        for (const o of q!.options) expect(quizSite(o)).toBeTruthy();
        if (q!.variant === "peristiwa") {
          const ev = quizEvent(q!.eventId!)!;
          expect(ev.siteSlug).toBe(q!.answer);
        } else {
          expect(imagesFor(q!.answer).some((m) => m.id === q!.mediaId)).toBe(true);
          // pengecoh foto juga punya foto
          for (const o of q!.options) expect(imagesFor(o, ["hero", "gallery", "now"]).length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("Tebak Tahun: jawaban dari data, toleransi positif, tingkat Ahli menghindari perlu-cek", () => {
    for (const s of seeds) {
      const q = makeYearQuestion(rng(s), ALL_TIME, "ahli")!;
      const ev = quizEvent(q.eventId)!;
      expect(q.answer).toBe(axisYear(ev));
      expect(q.tolerance).toBeGreaterThan(0);
      expect(ev.status).not.toBe("perlu-cek");
    }
    // rentang sempit tanpa cukup peristiwa tetap bisa dibangkitkan atau null, tidak pernah melempar
    expect(() => makeYearQuestion(rng(1), { from: 3000, to: 3001 }, "sedang")).not.toThrow();
    expect(makeYearQuestion(rng(1), { from: 3000, to: 3001 }, "sedang")).toBeNull();
  });

  it("Urutkan Waktu: urutan benar kronologis, kartu acak, jarak antarkartu mengikuti tingkat", () => {
    const counts: Record<Level, number> = { santai: 4, sedang: 5, ahli: 6 };
    for (const level of LEVELS) {
      for (const s of seeds) {
        const q = makeOrderQuestion(rng(s), ALL_TIME, level)!;
        expect(q).toBeTruthy();
        expect(q.answer.length).toBe(counts[level]);
        expect([...q.items].sort()).toEqual([...q.answer].sort());
        expect(q.items).not.toEqual(q.answer);
        const years = q.answer.map((id) => axisYear(quizEvent(id)!));
        for (let i = 1; i < years.length; i++) expect(years[i]).toBeGreaterThan(years[i - 1]);
      }
    }
  });

  it("Urutkan Waktu: tingkat Santai memberi jarak waktu lebih lebar daripada Ahli", () => {
    const span = (level: Level) => {
      let total = 0;
      for (const s of seeds) {
        const q = makeOrderQuestion(rng(s), ALL_TIME, level)!;
        const ys = q.answer.map((id) => axisYear(quizEvent(id)!));
        let min = Infinity;
        for (let i = 1; i < ys.length; i++) min = Math.min(min, ys[i] - ys[i - 1]);
        total += Math.log10(1 + min);
      }
      return total / seeds.length;
    };
    expect(span("santai")).toBeGreaterThan(span("ahli"));
  });

  it("Di Mana Ini?: koordinat jawaban sama dengan data situs atau jejak, foto tersedia", () => {
    let sawTrace = false;
    let sawSite = false;
    for (const level of LEVELS) {
      for (const s of seeds) {
        const q = makeWhereQuestion(rng(s), ALL_TIME, level)!;
        expect(q).toBeTruthy();
        expect(q.mediaId).toBeTruthy();
        if (q.siteSlug) {
          sawSite = true;
          expect(q.answer).toEqual({ lat: quizSite(q.siteSlug)!.coords.lat, lng: quizSite(q.siteSlug)!.coords.lng });
        } else {
          sawTrace = true;
          expect(q.traceId).toMatch(/^wd-Q\d+$/);
          expect(imagesFor(q.traceId!).length).toBeGreaterThan(0);
        }
      }
    }
    expect(sawSite && sawTrace).toBe(true);
  });

  it("Fakta atau Diperdebatkan: jawaban mengikuti status, yang diperdebatkan punya versi alternatif", () => {
    const seen = new Set<string>();
    for (const s of seeds) {
      const q = makeFactQuestion(rng(s), ALL_TIME, "sedang")!;
      const ev = quizEvent(q.eventId)!;
      expect(ev.status).not.toBe("perlu-cek");
      expect(q.answer).toBe(ev.status === "diperdebatkan" ? "diperdebatkan" : "disepakati");
      if (q.answer === "diperdebatkan") expect(ev.alternatives?.length ?? 0).toBeGreaterThan(0);
      seen.add(q.answer);
    }
    expect(seen.size).toBe(2);
  });

  it("deterministik: seed yang sama menghasilkan soal yang sama untuk semua mode", () => {
    for (const mode of QUESTION_MODES) {
      for (const s of [3, 11, 29]) {
        expect(makeQuestion(mode, rng(s), ALL_TIME, "sedang")).toEqual(makeQuestion(mode, rng(s), ALL_TIME, "sedang"));
      }
    }
  });

  it("setiap mode dapat dibangkitkan untuk rentang masa tertentu", () => {
    const range = { from: 1500, to: 1950 };
    for (const mode of QUESTION_MODES) {
      const q = makeQuestion(mode, rng(5), range, "sedang");
      expect(q, mode).toBeTruthy();
    }
  });
});

describe("tantangan harian", () => {
  it("lima soal campuran, deterministik per tanggal, berbeda antartanggal", () => {
    const a = dailyQuestions("2026-11-17");
    expect(a.length).toBe(DAILY_COUNT);
    expect(new Set(a.map((q) => q.mode)).size).toBe(DAILY_COUNT);
    expect(dailyQuestions("2026-11-17")).toEqual(a);
    const ids = (qs: Question[]) => qs.map((q) => q.id).join("|");
    expect(ids(dailyQuestions("2026-11-18"))).not.toBe(ids(a));
  });

  it("kunci tanggal berformat YYYY-MM-DD dan kisi hasil tidak membocorkan jawaban", () => {
    expect(dateKey(new Date(2026, 10, 7))).toBe("2026-11-07");
    expect(seedFrom("x")).toBe(seedFrom("x"));
    const grid = shareGrid(["benar", "hampir", "salah", "benar", "salah"]);
    expect(Array.from(grid).length).toBe(5);
    expect(grid).toBe("🟩🟨⬛🟩⬛");
  });
});

describe("skor dan penilaian", () => {
  it("Tebak Tahun: 1000 untuk jawaban tepat, menurun monoton, dan lebih ketat di Ahli", () => {
    const ev = sortedEvents.find((e) => e.id === "ev-borobudur-1814")!;
    const tol = yearTolerance(ev);
    expect(scoreYear(1814, 1814, tol, "sedang")).toBe(1000);
    let prev = 1000;
    for (const off of [5, 20, 60, 150, 400, 1200]) {
      const s = scoreYear(1814 - off, 1814, tol, "sedang");
      expect(s).toBeLessThanOrEqual(prev);
      prev = s;
    }
    expect(scoreYear(1700, 1814, tol, "ahli")).toBeLessThan(scoreYear(1700, 1814, tol, "santai"));
    // selisih di dalam toleransi presisi ("abad ke-9") tidak dihukum
    expect(scoreYear(850, 800, 50, "sedang")).toBe(1000);
  });

  it("adil untuk masa purba: selisih 20.000 tahun di masa purba tidak langsung nol", () => {
    expect(scoreYear(-60_000, -51_200 + 0, 2_000, "sedang")).toBeGreaterThan(0);
    expect(scoreYear(-1_000_000, 1814, 0.5, "sedang")).toBe(0);
  });

  it("jarak dan urutan: skor monoton dan penilaian konsisten", () => {
    expect(scoreDistance(0, "sedang")).toBe(1000);
    expect(scoreDistance(100, "sedang")).toBeGreaterThan(scoreDistance(800, "sedang"));
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0);
    expect(Math.round(haversineKm({ lat: -6.2, lng: 106.8 }, { lat: -7.8, lng: 110.4 }))).toBeGreaterThan(300);
    expect(scoreOrder(["a", "b", "c"], ["a", "b", "c"])).toBe(1000);
    expect(scoreOrder(["b", "a", "c"], ["a", "b", "c"])).toBeLessThan(1000);

    const q = makeOrderQuestion(rng(2), ALL_TIME, "sedang")!;
    expect(evaluate(q, q.answer).verdict).toBe("benar");
    expect(evaluate(q, [...q.answer].reverse()).verdict).not.toBe("benar");
    const w = makeWhichQuestion(rng(2), ALL_TIME, "sedang")!;
    expect(evaluate(w, w.answer).points).toBe(1000);
    expect(evaluate(w, w.options.find((o) => o !== w.answer)!).points).toBe(0);
    const f = makeFactQuestion(rng(2), ALL_TIME, "sedang")!;
    expect(evaluate(f, f.answer).verdict).toBe("benar");
    const y = makeYearQuestion(rng(2), ALL_TIME, "sedang")!;
    expect(evaluate(y, y.answer).points).toBe(1000);
  });
});

describe("adaptif dan tantangan guliran", () => {
  it("naik setelah 2 benar beruntun, turun setelah 2 salah beruntun, mulai di sedang", () => {
    let s = initialAdapt();
    expect(s.level).toBe("sedang");
    s = adaptStep(s, "benar");
    expect(s.level).toBe("sedang");
    s = adaptStep(s, "benar");
    expect(s.level).toBe("ahli");
    s = adaptStep(s, "salah");
    s = adaptStep(s, "salah");
    expect(s.level).toBe("sedang");
    s = adaptStep(s, "salah");
    s = adaptStep(adaptStep(s, "salah"), "salah");
    expect(s.level).toBe("santai");
    // hampir memutus runtutan
    let t = adaptStep(initialAdapt(), "benar");
    t = adaptStep(t, "hampir");
    t = adaptStep(t, "benar");
    expect(t.level).toBe("sedang");
  });

  it("tantangan guliran: soal valid tentang peristiwa yang baru dilewati", () => {
    const recent = sortedEvents.filter((e) => e.siteSlug).slice(100, 100 + 6);
    const q = scrollChallenge(recent, "uji")!;
    expect(q).toBeTruthy();
    expect(q.options.length).toBe(4);
    expect(recent.some((e) => e.id === q.eventId)).toBe(true);
    expect(quizEvent(q.eventId!)!.siteSlug).toBe(q.answer);
    expect(scrollChallenge(recent, "uji")).toEqual(q);
    expect(CHALLENGE_EVERY).toBe(25);
  });
});
