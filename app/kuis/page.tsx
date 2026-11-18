import type { Metadata } from "next";
import { QuizHub } from "@/components/quiz/QuizHub";

export const metadata: Metadata = {
  title: "Kuis",
  description: "Uji pengetahuanmu tentang cagar budaya Nusantara: tebak tahun, urutkan peristiwa, cari lokasi, dan bedakan fakta dari yang diperdebatkan.",
};

export default function KuisPage() {
  return <QuizHub />;
}
