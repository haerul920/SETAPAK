export type EraId =
  | "prasejarah"
  | "hindu_buddha"
  | "kesultanan_maritim"
  | "kolonial_kebangkitan"
  | "kemerdekaan_modern";

export type CulturalCategory =
  | "arsitektur"
  | "seni_tradisi"
  | "aksara_ilmu"
  | "maritim";

export type ModelArchetype =
  | "menhir_megalitik"
  | "nekara_perunggu"
  | "stupa_borobudur"
  | "candi_prambanan"
  | "masjid_tajug"
  | "perahu_pinisi"
  | "rumah_gadang"
  | "pura_bali"
  | "tongkonan"
  | "joglo_keraton"
  | "honai_papua"
  | "monumen_nasional"
  | "benteng_pertahanan"
  | "gapura_paduraksa"
  | "prasasti_batu";

export type CulturalPhase = "inactive" | "emerging" | "flourishing" | "legacy";

export interface HistoricalEra {
  id: EraId;
  index: number;
  name: string;
  shortName: string;
  yearStart: number;
  yearEnd: number;
  periodLabel: string;
  accentHex: string;
  summary: string;
}

export interface CulturalNode {
  id: string;
  name: string;
  island: string;
  region: string;
  kabupatenKota: string;
  clusterGroup: string;
  lat: number;
  lon: number;
  eraId: EraId;
  yearAppeared: number;
  flourishingStart: number;
  flourishingEnd: number;
  category: CulturalCategory;
  categoryLabel: string;
  archetype: ModelArchetype;
  archetypeLabel: string;
  accentColor: string;
  originStory: string;
  transitionStory: string;
  keyTraitsAndLegacy: string[];
  unescoStatus: string;
}

export interface MigrationRoute {
  id: string;
  name: string;
  routeTypeLabel: "Migrasi Austronesia" | "Jalur Rempah & Maritim" | "Difusi Budaya";
  eraId: EraId;
  yearStart: number;
  yearEnd: number;
  colorHex: string;
  description: string;
  waypoints: Array<{ lat: number; lon: number; label: string }>;
}

export const HISTORICAL_ERAS: HistoricalEra[] = [
  {
    id: "prasejarah",
    index: 0,
    name: "Prasejarah & Megalitik",
    shortName: "Prasejarah & Megalitik",
    yearStart: -2500,
    yearEnd: 399,
    periodLabel: "2500 SM – 399 M",
    accentHex: "#F59E0B",
    summary:
      "Migrasi penutur Austronesia, tradisi megalitik menhir dan punden berundak, teknologi perunggu Dongson-Pejeng, serta pelayaran cadik awal.",
  },
  {
    id: "hindu_buddha",
    index: 1,
    name: "Kerajaan Hindu-Buddha",
    shortName: "Kerajaan Hindu-Buddha",
    yearStart: 400,
    yearEnd: 1399,
    periodLabel: "400 M – 1399 M",
    accentHex: "#EAB308",
    summary:
      "Peradaban agraris dan maritim Tarumanagara, Mataram Kuno, Sriwijaya, Singasari, hingga mandala kepulauan Majapahit yang melahirkan candi batu andesit adiluhung.",
  },
  {
    id: "kesultanan_maritim",
    index: 2,
    name: "Kesultanan Islam & Jalur Rempah",
    shortName: "Kesultanan Islam",
    yearStart: 1400,
    yearEnd: 1799,
    periodLabel: "1400 M – 1799 M",
    accentHex: "#10B981",
    summary:
      "Era niaga rempah global, pelayaran perahu Pinisi Bugis-Makassar, akulturasi arsitektur masjid atap tajug meru tumpang tiga, serta keraton pesisir dan pedalaman.",
  },
  {
    id: "kolonial_kebangkitan",
    index: 3,
    name: "Kolonial & Kebangkitan Nasional",
    shortName: "Kolonial & Kebangkitan",
    yearStart: 1800,
    yearEnd: 1944,
    periodLabel: "1800 M – 1944 M",
    accentHex: "#3B82F6",
    summary:
      "Perlawanan daerah, akulturasi arsitektur Indische Empire, benteng pertahanan, lahirnya Boedi Oetomo 1908, serta ikrar persatuan pemuda Nusantara 1928.",
  },
  {
    id: "kemerdekaan_modern",
    index: 4,
    name: "Kemerdekaan & Warisan Dunia",
    shortName: "Kemerdekaan & Warisan",
    yearStart: 1945,
    yearEnd: 2026,
    periodLabel: "1945 M – Sekarang",
    accentHex: "#EF4444",
    summary:
      "Proklamasi 17 Agustus 1945, pemugaran cagar budaya berskala internasional, hingga pengakuan mahakarya Nusantara sebagai Warisan Budaya Dunia UNESCO.",
  },
];

export const MIGRATION_ROUTES: MigrationRoute[] = [
  {
    id: "rute_austronesia",
    name: "Rute Pelayaran Leluhur Austronesia",
    routeTypeLabel: "Migrasi Austronesia",
    eraId: "prasejarah",
    yearStart: -2000,
    yearEnd: -500,
    colorHex: "#F59E0B",
    description:
      "Migrasi pelaut Austronesia dengan perahu bercadik ganda menyusuri Filipina ke Sulawesi, Maluku, Flores, hingga Jawa dan Sumatra.",
    waypoints: [
      { lat: 4.8, lon: 125.4, label: "Kepulauan Talaud" },
      { lat: 1.5, lon: 124.8, label: "Minahasa Utara" },
      { lat: -3.0, lon: 120.0, label: "Lembah Bada & Besoa" },
      { lat: -5.0, lon: 119.7, label: "Leang-Leang Maros" },
      { lat: -8.6, lon: 120.4, label: "Liang Bua Flores" },
      { lat: -7.5, lon: 110.8, label: "Sangiran & Lembah Solo" },
    ],
  },
  {
    id: "rute_mandala_hindu_buddha",
    name: "Jalur Mandala & Candi Hindu-Buddha",
    routeTypeLabel: "Difusi Budaya",
    eraId: "hindu_buddha",
    yearStart: 650,
    yearEnd: 1400,
    colorHex: "#EAB308",
    description:
      "Pusat kosmologi mandala dan studi Buddhisme Sriwijaya menghubungkan Muarajambi, Tarumanagara, Mataram Kuno, hingga Majapahit dan Bali.",
    waypoints: [
      { lat: -1.48, lon: 103.67, label: "Kompleks Percandian Muarajambi" },
      { lat: -2.99, lon: 104.76, label: "Bukit Siguntang Sriwijaya" },
      { lat: -6.22, lon: 106.84, label: "Prasasti Tugu Tarumanagara" },
      { lat: -7.21, lon: 109.91, label: "Candi Dieng" },
      { lat: -7.61, lon: 110.2, label: "Borobudur & Prambanan" },
      { lat: -7.55, lon: 112.4, label: "Trowulan Ibu Kota Majapahit" },
      { lat: -8.37, lon: 115.45, label: "Pura Besakih Bali" },
    ],
  },
  {
    id: "rute_jalur_rempah_islam",
    name: "Jalur Rempah & Kesultanan Nusantara",
    routeTypeLabel: "Jalur Rempah & Maritim",
    eraId: "kesultanan_maritim",
    yearStart: 1350,
    yearEnd: 1750,
    colorHex: "#10B981",
    description:
      "Jalur perdagangan cengkih dan pala dunia yang merajut Kesultanan Samudra Pasai, Demak, Somba Opu, Banda Neira, hingga Ternate-Tidore.",
    waypoints: [
      { lat: 5.12, lon: 97.2, label: "Samudra Pasai Aceh" },
      { lat: -6.04, lon: 106.15, label: "Banten Lama" },
      { lat: -6.89, lon: 110.64, label: "Masjid Agung Demak" },
      { lat: -5.14, lon: 119.41, label: "Benteng Somba Opu Makassar" },
      { lat: -4.52, lon: 129.9, label: "Banda Neira Kepulauan Pala" },
      { lat: 0.79, lon: 127.36, label: "Kedaton Kesultanan Ternate" },
    ],
  },
];
