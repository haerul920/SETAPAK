"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { LevelChoice, QuizMode, Verdict } from "./quiz";

const safeStorage: StateStorage = {
  getItem: (n) => {
    try {
      return window.localStorage.getItem(n);
    } catch {
      return null;
    }
  },
  setItem: (n, v) => {
    try {
      window.localStorage.setItem(n, v);
    } catch {
      /* abaikan */
    }
  },
  removeItem: (n) => {
    try {
      window.localStorage.removeItem(n);
    } catch {
      /* abaikan */
    }
  },
};

export interface ScoreEntry {
  score: number;
  level: LevelChoice;
  date: string;
}

export interface DailyRecord {
  results: Verdict[];
  score: number;
}

interface QuizState {
  /** papan skor lokal: 5 skor tertinggi per mode */
  board: Partial<Record<QuizMode, ScoreEntry[]>>;
  /** hasil tantangan harian per tanggal */
  daily: Record<string, DailyRecord>;
  /** sakelar tantangan di guliran (bawaan aktif) */
  scrollChallenges: boolean;
  /** jumlah "jejak" dari jawaban benar di tantangan guliran */
  jejak: number;
  /** id tantangan guliran yang sudah dijawab, supaya tidak muncul lagi */
  answered: string[];
  addScore: (mode: QuizMode, entry: ScoreEntry) => void;
  setDaily: (key: string, rec: DailyRecord) => void;
  setScrollChallenges: (v: boolean) => void;
  addJejak: (id: string, correct: boolean) => void;
}

export const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      board: {},
      daily: {},
      scrollChallenges: true,
      jejak: 0,
      answered: [],
      addScore: (mode, entry) =>
        set((s) => {
          const list = [...(s.board[mode] ?? []), entry].sort((a, b) => b.score - a.score).slice(0, 5);
          return { board: { ...s.board, [mode]: list } };
        }),
      setDaily: (key, rec) => set((s) => ({ daily: { ...s.daily, [key]: rec } })),
      setScrollChallenges: (scrollChallenges) => set({ scrollChallenges }),
      addJejak: (id, correct) => set((s) => ({ jejak: s.jejak + (correct ? 1 : 0), answered: s.answered.includes(id) ? s.answered : [...s.answered, id].slice(-200) })),
    }),
    { name: "setapak-kuis", version: 1, storage: createJSONStorage(() => safeStorage), skipHydration: true }
  )
);
