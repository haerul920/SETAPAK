import type { Metadata } from "next";
import { PetaClient } from "@/components/map/PetaClient";

export const metadata: Metadata = {
  title: "Peta Waktu",
  description: "Jelajahi cagar budaya Nusantara di peta dan sumbu waktu: geser rentang, putar waktu, saring menurut kategori, dan lihat pita kerajaan.",
};

export default function PetaPage() {
  return <PetaClient />;
}
