import type { Metadata } from "next";
import { AboutClient } from "@/components/about/AboutClient";

export const metadata: Metadata = {
  title: "Tentang",
  description: "Tentang SETAPAK: metode kurasi konten, status sumber, kebijakan aset berlisensi terbuka, aksesibilitas, dan daftar sumber lengkap.",
};

export default function TentangPage() {
  return <AboutClient />;
}
