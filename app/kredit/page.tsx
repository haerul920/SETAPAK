import type { Metadata } from "next";
import { CreditsClient } from "@/components/credits/CreditsClient";

export const metadata: Metadata = {
  title: "Kredit Aset",
  description: "Daftar lengkap foto, gambar arsip, peta, huruf, dan audio berlisensi terbuka yang dipakai SETAPAK, beserta pembuat dan lisensinya.",
};

export default function KreditPage() {
  return <CreditsClient />;
}
