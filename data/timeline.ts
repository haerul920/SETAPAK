/**
 * SETAPAK - Data linimasa cagar budaya Indonesia.
 * Dikurasi dari sumber resmi, ilmiah, dan media (lihat `sources`).
 * Jangan menambah klaim faktual baru tanpa sumber. Lihat docs/CONTENT_GUIDE.md.
 */

export type EraId =
  | "prasejarah"
  | "seni-cadas"
  | "klasik"
  | "majapahit"
  | "maritim"
  | "kolonial"
  | "kemerdekaan"
  | "modern";

export type EventType =
  | "dibangun"
  | "digunakan"
  | "ditinggalkan"
  | "terkubur"
  | "ditemukan"
  | "diteliti"
  | "dipugar"
  | "rusak"
  | "ditetapkan"
  | "revitalisasi"
  | "peristiwa";

export type SourceStatus = "terverifikasi" | "diperdebatkan" | "perlu-cek";
export type SourceKind = "resmi" | "ilmiah" | "media";

export interface Source {
  id: string;
  title: string;
  url: string;
  kind: SourceKind;
}

export interface Hotspot {
  id: string;
  /** posisi relatif pada ilustrasi, 0-100 */
  x: number;
  y: number;
  title: string;
  body: string;
  titleEn?: string;
  bodyEn?: string;
  sourceIds?: string[];
}

export interface Site {
  slug: string;
  name: string;
  nameEn?: string;
  location: string;
  island: "Jawa" | "Sumatra" | "Sulawesi" | "Kalimantan" | "Bali-Nusa Tenggara" | "Maluku-Papua";
  coords: { lat: number; lng: number };
  kind: string;
  illustration: string; // nama komponen SVG di components/illustrations
  summary: string;
  summaryEn?: string;
  hotspots: Hotspot[];
}

export interface Era {
  id: EraId;
  order: number;
  name: string;
  nameEn: string;
  range: string;
  intro: string;
  introEn?: string;
  palette: { from: string; to: string; accent: string };
  audio: string; // path di public/audio
}

export interface TimelineEvent {
  id: string;
  era: EraId;
  siteSlug: string | null;
  /** kunci urut numerik: tahun astronomis (negatif = sebelum Masehi / tahun lalu dikonversi) */
  sortKey: number;
  /** akhir rentang untuk peristiwa yang berlangsung beberapa tahun (ditampilkan sebagai batang durasi) */
  endKey?: number;
  dateLabel: string;
  dateLabelEn: string;
  type: EventType;
  title: string;
  narrative: string;
  titleEn?: string;
  narrativeEn?: string;
  status: SourceStatus;
  alternatives?: string[];
  sourceIds: string[];
  /** bobot panjang scroll relatif, default 1 */
  scrollWeight?: number;
  /** nama momen spesial (komponen di components/moments) yang dipicu peristiwa ini */
  moment?: string;
  /** panjang pin momen dalam vh */
  pinLength?: number;
  /** data tambahan untuk momen, misal kedalaman timbunan */
  meta?: Record<string, string | number>;
}

/* ------------------------------------------------------------------ */
/* SUMBER                                                              */
/* ------------------------------------------------------------------ */

export const sources: Source[] = [
  { id: "guinness-karampuang", title: "Guinness World Records: Oldest painting, figurative art (Leang Karampuang)", url: "https://www.guinnessworldrecords.com/world-records/467702-oldest-painting-%E2%80%93-figurative-art", kind: "resmi" },
  { id: "detik-brin-karampuang", title: "detikEdu: Peneliti BRIN temukan lukisan cadas tertua di dunia", url: "https://www.detik.com/edu/edutainment/d-7422463/peneliti-brin-temukan-lukisan-cadas-tertua-di-dunia-berusia-51-200-tahun", kind: "media" },
  { id: "merahputih-karampuang", title: "MerahPutih: Lukisan gua tertua Indonesia ditemukan di Maros", url: "https://www.merahputih.com/post/amp/lukisan-gua-tertua-indonesia-ditemukan-di-maros-gambar-anoa-dan-babi", kind: "media" },
  { id: "kompas-pettae", title: "Kompas: Traces of Sulawesi's early humans", url: "https://www.kompas.id/baca/english/2018/05/13/traces-of-sulawesis-early-humans-part-1", kind: "media" },
  { id: "gac-pettae", title: "Google Arts & Culture (BRIN): A Virtual Tour of Leang Pettae", url: "https://artsandculture.google.com/story/kwXBxOcPU_Mudw", kind: "ilmiah" },
  { id: "lombok-heeren-palm", title: "Lombok Diaries: Sulawesi's extraordinary karst galleries", url: "https://lombokdiaries.substack.com/p/sulawesis-extraordinary-karst-galleries", kind: "media" },
  { id: "kemdikbud-sangiran", title: "BPSMP Sangiran: Sangiran in the Human Evolution Mapping", url: "https://kebudayaan.kemdikbud.go.id/bpsmpsangiran/?p=12720", kind: "resmi" },
  { id: "kemdikbud-sangiran-museum", title: "BPSMP Sangiran: Museum", url: "https://kebudayaan.kemdikbud.go.id/bpsmpsangiran/?p=11518", kind: "resmi" },
  { id: "brin-sangiran", title: "Berkala Arkeologi BRIN: Situs Sangiran", url: "https://ejournal.brin.go.id/berkalaarkeologi/article/download/4747/3510/13396", kind: "ilmiah" },
  { id: "brin-hominid", title: "Berkala Arkeologi BRIN: Situs, stratigrafi, dan pertanggalan", url: "https://ejournal.brin.go.id/berkalaarkeologi/article/download/4690/3459/13337", kind: "ilmiah" },
  { id: "gnfi-sangiran", title: "GNFI: Kubah, Situs, dan Museum Purba Sangiran", url: "https://www.goodnewsfromindonesia.id/2025/01/15/kubah-situs-dan-museum-purba-sangiran", kind: "media" },
  { id: "wiki-masjid-medan", title: "Wikipedia: Grand Mosque of Medan", url: "https://en.wikipedia.org/wiki/Grand_Mosque_of_Medan", kind: "media" },
  { id: "wiki-sangiran", title: "Wikipedia: Sangiran", url: "https://en.wikipedia.org/wiki/Sangiran", kind: "media" },
  { id: "brin-liyangan", title: "Berkala Arkeologi BRIN: Lanskap spiritual Situs Liyangan", url: "https://ejournal.brin.go.id/berkalaarkeologi/article/download/4231/3060/12547", kind: "ilmiah" },
  { id: "core-liangan", title: "Situs Liangan (CORE repository)", url: "https://core.ac.uk/download/227157498.pdf", kind: "ilmiah" },
  { id: "tirto-liyangan", title: "Tirto: Kisah beras kuno berusia 1000 tahun di Situs Liyangan", url: "https://tirto.id/kisah-beras-kuno-berusia-1000-tahun-di-situs-liyangan-hvim", kind: "media" },
  { id: "gnfi-liyangan", title: "GNFI: Situs Liyangan dan kearifan warga", url: "https://www.goodnewsfromindonesia.id/2022/03/18/situs-liyangan-dan-kearifan-yang-selamatkan-warga-dari-letusan-sindoro", kind: "media" },
  { id: "jp-liyangan", title: "The Jakarta Post: Ancient Liyangan volcano site", url: "https://www.thejakartapost.com/news/2015/06/18/ancient-liyangan-volcano-site-see-more-activity.html", kind: "media" },
  { id: "gnfi-muarajambi", title: "GNFI: Jelajah Candi Muaro Jambi", url: "https://www.goodnewsfromindonesia.id/2022/05/31/jelajah-candi-muaro-jambi-jejak-universitas-tertua-di-indonesia", kind: "media" },
  { id: "bpcb-jambi", title: "BPCB Jambi: Kawasan Cagar Budaya Muarajambi", url: "https://kebudayaan.kemdikbud.go.id/bpcbjambi/category/cagar-budaya/kawasan-cagar-budaya-muarajambi/page/2", kind: "resmi" },
  { id: "jp-muarajambi", title: "The Jakarta Post: Muarajambi temple, Jambi's monumental mystery", url: "https://www.thejakartapost.com/news/2014/11/25/muarajambi-temple-jambi-s-monumental-mystery.html", kind: "media" },
  { id: "medcom-muarajambi", title: "Medcom: Tegak Tiang Tuo revitalisasi KCBN Muarajambi", url: "https://www.medcom.id/gaya/wisata/ob3ZQrJN-tegak-tiang-tuo-langkah-penting-perlindungan-warisan-budaya-indonesia", kind: "media" },
  { id: "gnfi-borobudur-824", title: "GNFI: Sejarah Hari Ini 26 Mei 824, Borobudur selesai dibangun", url: "https://www.goodnewsfromindonesia.id/2020/05/26/sejarah-hari-ini-26-mei-824-borobudur-selesai-dibangun", kind: "media" },
  { id: "unesco-mow-borobudur", title: "UNESCO Memory of the World: Borobudur Conservation Archives", url: "https://media.unesco.org/sites/default/files/webform/mow001/indonesia_borobudur_eng.pdf", kind: "resmi" },
  { id: "kemdikbud-borobudur-2020", title: "Balai Konservasi Borobudur: Rilis Hari Warisan Dunia 2020", url: "https://kebudayaan.kemdikbud.go.id/bkborobudur/wp-content/uploads/sites/12/2020/04/RILIS-PERS-PERINGATAN-HARI-WARISAN-DUNIA-2020.pdf", kind: "resmi" },
  { id: "kniu-borobudur", title: "KNIU Kemdikbud: Borobudur Temple Compounds", url: "https://kniu.kemdikbud.go.id/penghargaan/world-heritage/borobudur-temple-compounds", kind: "resmi" },
  { id: "penang-borobudur", title: "Penang Travel Tips: Candi Borobudur (Cornelius, van Erp)", url: "https://www.penang-traveltips.com/indonesia/yogyakarta/candi-borobudur.htm", kind: "media" },
  { id: "unnes-borobudur", title: "Journal of Indonesian History UNNES: Pemugaran II Borobudur 1973-1983", url: "https://journal.unnes.ac.id/journals/jih/article/download/12084/2739/56195", kind: "ilmiah" },
  { id: "unnes-bom-1985", title: "Journal UNNES: Pengeboman Candi Borobudur 1985", url: "https://journal.unnes.ac.id/sju/jih/article/view/37051/15245", kind: "ilmiah" },
  { id: "heidelberg-borobudur", title: "Heritage Journal Heidelberg: Borobudur dan erupsi Merapi 2010", url: "https://journals.ub.uni-heidelberg.de/index.php/heritage/article/view/20031/13824", kind: "ilmiah" },
  { id: "nwe-borobudur", title: "New World Encyclopedia: Borobudur", url: "https://www.newworldencyclopedia.org/entry/Borobudur", kind: "media" },
  { id: "wiki-borobudur", title: "Wikipedia: Borobudur", url: "https://en.wikipedia.org/wiki/Borobudur", kind: "media" },
  { id: "wiki-prambanan", title: "Wikipedia: Prambanan", url: "https://en.wikipedia.org/wiki/Prambanan", kind: "media" },
  { id: "tirto-prambanan", title: "Tirto: Sejarah Candi Prambanan", url: "https://tirto.id/sejarah-candi-prambanan-peninggalan-mataram-kuno-warisan-dunia-f7MZ", kind: "media" },
  { id: "gnfi-prambanan", title: "GNFI: Sejarah Candi Prambanan", url: "https://www.goodnewsfromindonesia.id/indonesiana/sejarah/sejarah-candi-prambanan", kind: "media" },
  { id: "metro-prambanan", title: "Metro TV: Perjalanan panjang Candi Prambanan", url: "https://www.metrotvnews.com/read/bJEC4mV5-dari-legenda-cerita-rakyat-hingga-warisan-dunia-perjalanan-panjang-candi-prambanan", kind: "media" },
  { id: "unesco-prambanan-2006", title: "UNESCO WHC: State of Conservation Prambanan 2006", url: "https://whc.unesco.org/en/soc/1228", kind: "resmi" },
  { id: "worldhistory-prambanan", title: "World History Encyclopedia: Candi Prambanan", url: "https://www.worldhistory.org/trans/id/1-17393/candi-prambanan/", kind: "media" },
  { id: "brin-sambisari", title: "Berkala Arkeologi BRIN: Situs Candi Sambisari yang Pernah Terpendam", url: "https://ejournal.brin.go.id/berkalaarkeologi/article/download/4711/3476/13361", kind: "ilmiah" },
  { id: "spafa-sambisari", title: "SPAFA Journal: Sambisari Temple", url: "https://spafajournal.org/index.php/spafadigest/article/view/527/522", kind: "ilmiah" },
  { id: "gnfi-sambisari", title: "GNFI: Candi Sambisari", url: "https://www.goodnewsfromindonesia.id/2024/07/20/candi-sambisari-permata-tersembunyi-di-purwomartani", kind: "media" },
  { id: "atrium-kimpulan", title: "Atrium UKDW: Merekonstruksi Candi Terkubur (Kimpulan)", url: "https://doi.org/10.21460/atrium.v9i2.199", kind: "ilmiah" },
  { id: "mojok-kimpulan", title: "Mojok: Candi Kimpulan di kampus UII", url: "https://mojok.co/kilas/candi-kimpulan-peninggalan-hindu-di-kampus-islam-jogja/", kind: "media" },
  { id: "antara-kimpulan", title: "ANTARA: Candi di kampus UII jadi bagian perpustakaan", url: "https://m.antaranews.com/amp/berita/168348/candi-di-kampus-uii-jadi-bagian-perpustakaan", kind: "media" },
  { id: "nu-kimpulan", title: "NU Online: Melihat candi di pusat keilmuan Islam", url: "https://nu.or.id/nasional/melihat-candi-di-pusat-keilmuan-islam-4bhd1", kind: "media" },
  { id: "brin-trowulan", title: "Berkala Arkeologi BRIN: Trowulan", url: "https://ejournal.brin.go.id/berkalaarkeologi/article/download/5466/4019/15511", kind: "ilmiah" },
  { id: "tirto-trowulan", title: "Tirto: Lokasi pusat Kerajaan Majapahit", url: "https://tirto.id/sejarah-lokasi-pusat-kerajaan-majapahit-benarkah-di-trowulan-gyPN", kind: "media" },
  { id: "jp-trowulan", title: "The Jakarta Post: The peaceful pools of the ancients", url: "https://www.thejakartapost.com/news/2009/02/20/the-peaceful-pools-ancients", kind: "media" },
  { id: "wiki-trowulan-museum", title: "Wikipedia: Trowulan Museum", url: "https://en.wikipedia.org/wiki/Trowulan_Museum", kind: "media" },
  { id: "jalurrempah-sombaopu", title: "Jalur Rempah Kemdikbud: The History of Port Makassar", url: "https://jalurrempah.kemdikbud.go.id/en/article/the-history-of-port-makassar-an-entrepot-in-eastern-nusantara-4361", kind: "resmi" },
  { id: "gnfi-sombaopu", title: "GNFI: Benteng Somba Opu Gowa", url: "https://www.goodnewsfromindonesia.id/2026/06/04/benteng-somba-opu-gowa-menyimpan-kisah-kejayaan-pusat-rempah-di-timur-nusantara", kind: "media" },
  { id: "wiki-sombaopu", title: "Wikipedia: Fort Somba Opu", url: "https://en.wikipedia.org/wiki/Fort_Somba_Opu", kind: "media" },
  { id: "wiki-makassar-war", title: "Wikipedia: Makassar War", url: "https://en.wikipedia.org/wiki/Makassar_War", kind: "media" },
  { id: "disbudpar-rotterdam", title: "Disbudpar Sulsel: Fort Rotterdam Makassar", url: "https://disbudpar.sulselprov.go.id/page/wisata/4/fort-rotterdam-makassar", kind: "resmi" },
  { id: "gnfi-bungaya", title: "GNFI: Sejarah Hari Ini 18 November 1667, Perjanjian Bungaya", url: "https://www.goodnewsfromindonesia.id/indonesiana/humaniora/sejarah-hari-ini-18-november-1667-perjanjian-bungaya", kind: "media" },
  { id: "wiki-rotterdam", title: "Wikipedia: Fort Rotterdam", url: "https://en.wikipedia.org/wiki/Fort_Rotterdam", kind: "media" },
  { id: "itb-maimun", title: "Arsitektur ITB: Konservasi Istana Maimun", url: "https://ar.itb.ac.id/wp-content/uploads/sites/162/2016/08/AR4213_Kuliah-Tamu-200407_Maimun.pdf", kind: "ilmiah" },
  { id: "gnfi-maimun", title: "GNFI: 18 Mei 1891 Istana Maimun rampung", url: "https://www.goodnewsfromindonesia.id/2020/05/18/sejarah-hari-ini-18-mei-1891-proyek-istana-maimun-kesultanan-deli-rampung", kind: "media" },
  { id: "gnfi-munasprok", title: "GNFI: 24 November 1992 Museum Perumusan Naskah Proklamasi", url: "https://www.goodnewsfromindonesia.id/2020/11/24/sejarah-hari-ini-24-november-1992-museum-perumusan-naskah-proklamasi", kind: "media" },
  { id: "detik-maeda", title: "detikProperti: Di balik pintu Rumah Maeda", url: "https://www.detik.com/properti/berita/d-8064804/di-balik-pintu-rumah-maeda-tempat-sejarah-kemerdekaan-ri-dirajut", kind: "media" },
  { id: "jawapos-maeda", title: "Jawa Pos: 4 lokasi bersejarah kemerdekaan di Jakarta", url: "https://www.jawapos.com/travelling/2508170293/mengunjungi-4-lokasi-bersejarah-di-jakarta-kenangan-kemerdekaan-yang-tak-terlupakan", kind: "media" },
  { id: "gnfi-maeda", title: "GNFI: Menggali sejarah perumusan naskah proklamasi", url: "https://www.goodnewsfromindonesia.id/2021/02/10/menggali-sejarah-perumusan-naskah-proklamasi-di-rumah-laksamana-maeda", kind: "media" },
  { id: "metro-maeda", title: "Metro TV: Sejarah Rumah Laksamana Maeda", url: "https://www.metrotvnews.com/read/bzGCREAQ-sejarah-rumah-laksamana-maeda-saksi-bisu-perumusan-naskah-proklamasi", kind: "media" },
];

/* ------------------------------------------------------------------ */
/* ERA                                                                 */
/* ------------------------------------------------------------------ */

export const eras: Era[] = [
  { id: "prasejarah", order: 1, name: "Prasejarah Purba", nameEn: "Deep Prehistory", range: "1,65 juta tahun lalu", intro: "Jauh sebelum ada kerajaan, tanah Jawa menyimpan jejak manusia purba di lapisan-lapisan bumi.", palette: { from: "#1a140e", to: "#2b2015", accent: "#c9a26b" }, audio: "/audio/era-1-prasejarah.mp3" },
  { id: "seni-cadas", order: 2, name: "Seni Cadas", nameEn: "Rock Art", range: "51.200 - 8.000 tahun lalu", intro: "Di dinding gua kapur Sulawesi, manusia menuliskan cerita pertamanya dengan warna merah oker.", palette: { from: "#120c0a", to: "#2a1712", accent: "#b5532c" }, audio: "/audio/era-2-seni-cadas.mp3" },
  { id: "klasik", order: 3, name: "Klasik Hindu-Buddha", nameEn: "Classical Hindu-Buddhist", range: "Abad II - XI", intro: "Batu andesit dan bata disusun menjadi gunung suci, permukiman, dan pusat pembelajaran.", palette: { from: "#141812", to: "#26301f", accent: "#e7b75f" }, audio: "/audio/era-3-klasik.mp3" },
  { id: "majapahit", order: 4, name: "Majapahit", nameEn: "Majapahit", range: "Abad XIII - XIV", intro: "Kota bata merah dengan kanal dan kolam raksasa tumbuh di Jawa Timur.", palette: { from: "#1b120d", to: "#3a2015", accent: "#d0743c" }, audio: "/audio/era-4-majapahit.mp3" },
  { id: "maritim", order: 5, name: "Kesultanan Maritim", nameEn: "Maritime Sultanates", range: "1525 - 1679", intro: "Di pesisir Makassar, benteng-benteng Gowa menjaga jalur rempah Nusantara Timur.", palette: { from: "#0c1519", to: "#16323d", accent: "#4fa3b8" }, audio: "/audio/era-5-maritim.mp3" },
  { id: "kolonial", order: 6, name: "Kolonial dan Penemuan Kembali", nameEn: "Colonial Era and Rediscovery", range: "1733 - 1931", intro: "Reruntuhan yang lama tertutup hutan mulai digambar, dicatat, dan diperdebatkan.", palette: { from: "#17140f", to: "#2e281d", accent: "#d9c7a7" }, audio: "/audio/era-6-kolonial.mp3" },
  { id: "kemerdekaan", order: 7, name: "Kemerdekaan", nameEn: "Independence", range: "1945", intro: "Di sebuah rumah di Menteng, kalimat yang mengubah sejarah bangsa disusun dalam semalam.", palette: { from: "#160f0f", to: "#2c1717", accent: "#c8373a" }, audio: "/audio/era-7-kemerdekaan.mp3" },
  { id: "modern", order: 8, name: "Pelestarian Modern", nameEn: "Modern Preservation", range: "1950 - 2026", intro: "Petani, penambang, pekerja bangunan, dan peneliti terus menemukan dan merawat warisan kita.", palette: { from: "#0f1214", to: "#1d2429", accent: "#6fbf8e" }, audio: "/audio/era-8-modern.mp3" },
];

/* ------------------------------------------------------------------ */
/* SITUS                                                               */
/* ------------------------------------------------------------------ */

export const sites: Site[] = [
  {
    slug: "sangiran", name: "Situs Manusia Purba Sangiran", nameEn: "Sangiran Early Man Site",
    location: "Sragen dan Karanganyar, Jawa Tengah", island: "Jawa", coords: { lat: -7.45, lng: 110.833 },
    kind: "Situs prasejarah, Warisan Dunia UNESCO", illustration: "SangiranStrata",
    summary: "Kubah Sangiran menyimpan lapisan tanah yang merekam evolusi manusia, budaya, dan lingkungan selama jutaan tahun.",
    hotspots: [
      { id: "sg-pucangan", x: 30, y: 70, title: "Formasi Pucangan", body: "Batas bawah lapisan Pucangan berumur sekitar 1,65 juta tahun dan dianggap usia maksimum hominid pertama di formasi ini.", sourceIds: ["brin-hominid"] },
      { id: "sg-ngebung", x: 65, y: 40, title: "Ngebung", body: "Lokasi temuan artefak litik oleh von Koenigswald pada 1934, sekitar dua km di barat laut kubah Sangiran.", sourceIds: ["brin-sangiran"] },
      { id: "sg-museum", x: 80, y: 20, title: "Museum dan Klaster", body: "Museum Sangiran berkembang menjadi pusat edukasi, konservasi, dan wisata dengan beberapa klaster.", sourceIds: ["gnfi-sangiran"] },
    ],
  },
  {
    slug: "karst-maros-pangkep", name: "Kawasan Karst Maros-Pangkep", nameEn: "Maros-Pangkep Karst",
    location: "Maros dan Pangkep, Sulawesi Selatan", island: "Sulawesi", coords: { lat: -4.979, lng: 119.675 },
    kind: "Gua prasejarah dan seni cadas", illustration: "CaveWall",
    summary: "Gua-gua kapur di Maros-Pangkep menyimpan salah satu seni figuratif tertua di dunia, termasuk Leang Karampuang, Leang Tedongnge, dan Leang Pettae.",
    hotspots: [
      { id: "mp-handstencil", x: 25, y: 35, title: "Cap tangan negatif", body: "Cap tangan berlatar merah pertama kali dicatat di Leang Pettae pada 1950.", sourceIds: ["lombok-heeren-palm", "kompas-pettae"] },
      { id: "mp-babi", x: 55, y: 55, title: "Figur babi dan manusia", body: "Panel Leang Karampuang menggambarkan tiga figur mirip manusia berinteraksi dengan babi hutan, minimal 51.200 tahun.", sourceIds: ["guinness-karampuang"] },
      { id: "mp-useries", x: 78, y: 30, title: "Penanggalan LA-U-series", body: "Usia ditentukan dengan ablasi laser U-series pada lapisan kalsium karbonat yang menutupi lukisan.", sourceIds: ["detik-brin-karampuang"] },
    ],
  },
  {
    slug: "liyangan", name: "Situs Liyangan", nameEn: "Liyangan Site",
    location: "Purbosari, Ngadirejo, Temanggung, Jawa Tengah", island: "Jawa", coords: { lat: -7.2519, lng: 110.0270 },
    kind: "Permukiman kuno Mataram Kuno", illustration: "LiyanganSettlement",
    summary: "Permukiman di lereng timur laut Gunung Sindoro yang terkubur material vulkanik dan ditemukan kembali oleh penambang pasir.",
    hotspots: [
      { id: "ly-hunian", x: 25, y: 60, title: "Area hunian", body: "Salah satu dari tiga area yang sudah diketahui: hunian, pertanian, dan pemujaan berlatar Hindu.", sourceIds: ["core-liangan"] },
      { id: "ly-talud", x: 55, y: 45, title: "Talud dan candi", body: "Struktur talud, arca, dan komponen candi ditemukan dari kedalaman belasan meter.", sourceIds: ["tirto-liyangan"] },
      { id: "ly-beras", x: 75, y: 65, title: "Beras kuno", body: "Arkeolog menemukan butiran beras kuno yang telah menjadi arang, menyingkap jejak penyebaran padi di Jawa.", sourceIds: ["tirto-liyangan"] },
    ],
  },
  {
    slug: "muarajambi", name: "Kawasan Cagar Budaya Nasional Muarajambi", nameEn: "Muarajambi Temple Compounds",
    location: "Muaro Jambi, Jambi", island: "Sumatra", coords: { lat: -1.4769, lng: 103.6697 },
    kind: "Kompleks percandian Buddha", illustration: "MuarajambiBrick",
    summary: "Kompleks percandian bata di tepi Sungai Batanghari seluas sekitar 3.981 hektar dengan puluhan menapo.",
    hotspots: [
      { id: "mj-kedaton", x: 30, y: 50, title: "Candi Kedaton", body: "Tulisan pendek pada permukaan bata secara paleografi berasal dari abad 9-10 Masehi.", sourceIds: ["gnfi-muarajambi"] },
      { id: "mj-menapo", x: 60, y: 60, title: "Menapo", body: "Tumpukan bata berstruktur candi yang masih tertutup gundukan tanah.", sourceIds: ["gnfi-muarajambi"] },
      { id: "mj-lempeng", x: 75, y: 35, title: "Lempeng emas bertulis", body: "Lempeng bertulis ditemukan saat pemugaran Candi Tinggi (1988) dan Candi Gedong I (1998).", sourceIds: ["bpcb-jambi"] },
    ],
  },
  {
    slug: "borobudur", name: "Candi Borobudur", nameEn: "Borobudur Temple",
    location: "Magelang, Jawa Tengah", island: "Jawa", coords: { lat: -7.608, lng: 110.204 },
    kind: "Candi Buddha Mahayana, Warisan Dunia UNESCO", illustration: "Borobudur",
    summary: "Candi Buddha abad ke-9 dari masa Wangsa Syailendra, dipugar dua kali pada abad ke-20 dan ditetapkan UNESCO bersama Mendut dan Pawon.",
    hotspots: [
      { id: "bb-relief", x: 30, y: 70, title: "Relief", body: "Borobudur memiliki salah satu koleksi relief Buddha terlengkap di dunia.", sourceIds: ["wiki-borobudur"] },
      { id: "bb-kaki", x: 50, y: 88, title: "Kaki tersembunyi", body: "J.W. Yzerman menemukan kaki candi yang tersembunyi dalam penggalian.", sourceIds: ["gnfi-borobudur-824"] },
      { id: "bb-stupa", x: 50, y: 22, title: "Stupa teras atas", body: "Sembilan stupa rusak akibat pengeboman 21 Januari 1985, kemudian dipugar.", sourceIds: ["unnes-bom-1985"] },
      { id: "bb-drainase", x: 72, y: 55, title: "Drainase dan beton", body: "Pemugaran 1973-1983 memperkuat struktur dengan elemen beton dan sistem drainase internal.", sourceIds: ["unesco-mow-borobudur"] },
    ],
  },
  {
    slug: "prambanan", name: "Candi Prambanan", nameEn: "Prambanan Temple",
    location: "Sleman (DIY) dan Klaten (Jawa Tengah)", island: "Jawa", coords: { lat: -7.752, lng: 110.491 },
    kind: "Candi Hindu, Warisan Dunia UNESCO", illustration: "Prambanan",
    summary: "Kompleks candi Hindu terbesar di Indonesia, bernama asli Siwagrha (Rumah Siwa), dengan candi utama setinggi 47 meter.",
    hotspots: [
      { id: "pr-siwa", x: 50, y: 25, title: "Candi Siwa", body: "Candi utama setinggi sekitar 47 meter, fokus pemugaran yang dimulai 1918.", sourceIds: ["gnfi-prambanan", "metro-prambanan"] },
      { id: "pr-perwara", x: 20, y: 75, title: "224 candi perwara", body: "Halaman kedua diisi oleh 224 candi perwara.", sourceIds: ["gnfi-prambanan"] },
      { id: "pr-opak", x: 85, y: 85, title: "Sungai Opak", body: "Setelah Mataram terbagi pada 1755, reruntuhan candi dan Sungai Opak dipakai sebagai batas Yogyakarta dan Surakarta.", sourceIds: ["wiki-prambanan"] },
    ],
  },
  {
    slug: "sambisari", name: "Candi Sambisari", nameEn: "Sambisari Temple",
    location: "Purwomartani, Kalasan, Sleman, DIY", island: "Jawa", coords: { lat: -7.762, lng: 110.447 },
    kind: "Candi Hindu yang pernah terkubur", illustration: "CandiKecil",
    summary: "Candi Hindu yang tertimbun lahar Merapi setinggi 6,5 meter dan ditemukan petani pada 1966.",
    hotspots: [
      { id: "sb-utama", x: 50, y: 40, title: "Candi utama", body: "Kompleks terdiri dari satu candi utama dan tiga candi perwara di depannya.", sourceIds: ["brin-sambisari"] },
      { id: "sb-lingga", x: 50, y: 55, title: "Lingga-yoni", body: "Lingga dan yoni di bilik utama melambangkan kesuburan dan penciptaan.", sourceIds: ["gnfi-sambisari"] },
      { id: "sb-emas", x: 75, y: 70, title: "Lempeng emas", body: "Prasasti lempeng emas yang bentuk hurufnya berasal dari abad IX ditemukan di kompleks ini.", sourceIds: ["brin-sambisari"] },
    ],
  },
  {
    slug: "kimpulan", name: "Candi Kimpulan", nameEn: "Kimpulan Temple",
    location: "Kampus Universitas Islam Indonesia, Sleman, DIY", island: "Jawa", coords: { lat: -7.6884, lng: 110.4154 },
    kind: "Candi Hindu desa yang pernah terkubur", illustration: "CandiKecil",
    summary: "Candi Hindu abad 9-10 yang ditemukan saat penggalian fondasi perpustakaan UII dan kini menjadi bagian kompleks perpustakaan.",
    hotspots: [
      { id: "km-arca", x: 50, y: 50, title: "Arca Ganesha", body: "Candi dengan arca Ganesha ditemukan pekerja bangunan pada akhir 2009.", sourceIds: ["antara-kimpulan"] },
      { id: "km-perpus", x: 75, y: 30, title: "Perpustakaan Mohammad Hatta", body: "Candi dipertahankan di area perpustakaan dan museum UII.", sourceIds: ["nu-kimpulan"] },
    ],
  },
  {
    slug: "trowulan", name: "Situs Trowulan", nameEn: "Trowulan Site",
    location: "Mojokerto, Jawa Timur", island: "Jawa", coords: { lat: -7.559, lng: 112.383 },
    kind: "Bekas kota Majapahit", illustration: "TrowulanGate",
    summary: "Kawasan bata merah yang diyakini sebagai pusat Kerajaan Majapahit, dengan Kolam Segaran dan Museum Trowulan.",
    hotspots: [
      { id: "tw-segaran", x: 35, y: 65, title: "Kolam Segaran", body: "Kolam bata seluas sekitar 6,5 hektar dengan kedalaman 2,88 meter.", sourceIds: ["jp-trowulan"] },
      { id: "tw-peta", x: 70, y: 35, title: "Peta 1924", body: "Maclaine Pont memetakan lokasi candi, istana, barak, balai, waduk, dan kanal dari abad 13-14.", sourceIds: ["jp-trowulan"] },
    ],
  },
  {
    slug: "somba-opu", name: "Benteng Somba Opu", nameEn: "Somba Opu Fort",
    location: "Barombong, Gowa, Sulawesi Selatan", island: "Sulawesi", coords: { lat: -5.188, lng: 119.403 },
    kind: "Benteng dan pusat niaga Kesultanan Gowa", illustration: "SombaOpuWall",
    summary: "Benteng kerajaan Gowa yang menjadi pusat kota dan pelabuhan rempah, dihancurkan VOC pada 1669 dan ditemukan kembali lewat ekskavasi.",
    hotspots: [
      { id: "so-tembok", x: 40, y: 50, title: "Tembok bata", body: "Tinggi dinding aslinya diperkirakan 7 hingga 8 meter dengan ketebalan 3,6 hingga 10,5 meter di beberapa bagian.", sourceIds: ["gnfi-sombaopu"] },
      { id: "so-lubang", x: 65, y: 45, title: "Lubang 27,5 meter", body: "Ledakan di terowongan rahasia pada 14 Juni 1669 membuka lubang sekitar 27,5 meter di dinding.", sourceIds: ["wiki-sombaopu"] },
      { id: "so-miniatur", x: 80, y: 75, title: "Miniatur budaya Sulsel", body: "Kawasan kini juga berfungsi sebagai miniatur budaya Sulawesi Selatan.", sourceIds: ["gnfi-sombaopu"] },
    ],
  },
  {
    slug: "fort-rotterdam", name: "Fort Rotterdam (Benteng Ujung Pandang)", nameEn: "Fort Rotterdam",
    location: "Makassar, Sulawesi Selatan", island: "Sulawesi", coords: { lat: -5.13417, lng: 119.40556 },
    kind: "Benteng Gowa yang dibangun ulang VOC", illustration: "FortTurtle",
    summary: "Benteng Ujung Pandang milik Gowa yang diserahkan lewat Perjanjian Bungaya dan dibangun ulang Belanda dengan bentuk menyerupai penyu.",
    hotspots: [
      { id: "fr-bastion", x: 20, y: 25, title: "Bastion", body: "Setelah dibangun ulang 1673-1679, benteng memiliki enam bastion, tembok tujuh meter, dan parit dua meter.", sourceIds: ["wiki-rotterdam"] },
      { id: "fr-penyu", x: 55, y: 50, title: "Benteng Panyua", body: "Disebut Benteng Penyu karena bentuknya menyerupai penyu.", sourceIds: ["wiki-rotterdam"] },
    ],
  },
  {
    slug: "istana-maimun", name: "Istana Maimun", nameEn: "Maimun Palace",
    location: "Medan, Sumatera Utara", island: "Sumatra", coords: { lat: 3.575, lng: 98.683 },
    kind: "Istana Kesultanan Deli", illustration: "IstanaMaimun",
    summary: "Istana Kesultanan Deli seluas 2.772 m² dengan 30 ruangan yang memadukan unsur Melayu, Islam, India, dan Eropa.",
    hotspots: [
      { id: "im-kuning", x: 50, y: 30, title: "Warna kuning", body: "Warna kuning mendominasi istana sebagai warna kebesaran Melayu.", sourceIds: ["gnfi-maimun"] },
      { id: "im-ruang", x: 30, y: 60, title: "30 ruangan", body: "Istana seluas 2.772 m² ini memiliki 30 ruangan.", sourceIds: ["gnfi-maimun"] },
    ],
  },
  {
    slug: "rumah-maeda", name: "Rumah Laksamana Maeda (Museum Perumusan Naskah Proklamasi)", nameEn: "Admiral Maeda's House",
    location: "Jl. Imam Bonjol No. 1, Menteng, Jakarta Pusat", island: "Jawa", coords: { lat: -6.2004, lng: 106.8311 },
    kind: "Rumah bersejarah, museum", illustration: "RumahMaeda",
    summary: "Rumah bergaya art deco tempat naskah proklamasi dirumuskan pada malam 16 sampai 17 Agustus 1945.",
    hotspots: [
      { id: "rm-makan", x: 45, y: 60, title: "Ruang makan", body: "Di ruang makan inilah teks proklamasi dirumuskan oleh Sukarno, Mohammad Hatta, dan Achmad Soebardjo.", sourceIds: ["gnfi-munasprok"] },
      { id: "rm-kaigun", x: 70, y: 35, title: "Wilayah Angkatan Laut", body: "Rumah ini termasuk wilayah Angkatan Laut Jepang sehingga Kempeitai tidak bisa sembarangan masuk.", sourceIds: ["gnfi-maeda"] },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* PERISTIWA (urut kronologis via sortKey)                             */
/* Konversi: "X tahun lalu" -> sortKey = 2026 - X (negatif).           */
/* Abad ke-N M -> sortKey = (N-1)*100 + 50 (titik tengah).             */
/* ------------------------------------------------------------------ */

export const events: TimelineEvent[] = [
  // ERA 1
  { id: "ev-sangiran-pucangan", era: "prasejarah", siteSlug: "sangiran", sortKey: -1648000, dateLabel: "± 1,65 juta tahun lalu", dateLabelEn: "± 1.65 million years ago", type: "digunakan", title: "Hominid pertama di lapisan Pucangan", narrative: "Lapisan Pucangan di Sangiran memiliki batas bawah sekitar 1,65 juta tahun. Angka ini dianggap sebagai usia maksimum hominid pertama di formasi tersebut.", status: "terverifikasi", sourceIds: ["brin-hominid"], scrollWeight: 1.5 },

  // ERA 2
  { id: "ev-karampuang-51200", era: "seni-cadas", siteSlug: "karst-maros-pangkep", sortKey: -49174, dateLabel: "≥ 51.200 tahun lalu", dateLabelEn: "≥ 51,200 years ago", type: "dibangun", title: "Panel Leang Karampuang dilukis", narrative: "Seseorang melukis tiga figur mirip manusia yang berinteraksi dengan babi hutan di langit-langit Leang Karampuang. Ini termasuk lukisan figuratif tertua yang pernah ditemukan di dunia.", status: "terverifikasi", sourceIds: ["guinness-karampuang", "detik-brin-karampuang"], moment: "CaveTorch", pinLength: 250 },
  { id: "ev-tedongnge-45500", era: "seni-cadas", siteSlug: "karst-maros-pangkep", sortKey: -43474, dateLabel: "≥ 45.500 tahun lalu", dateLabelEn: "≥ 45,500 years ago", type: "dibangun", title: "Tiga babi kutil di Leang Tedongnge", narrative: "Lukisan tiga babi kutil di Leang Tedongnge berusia minimal 45.500 tahun menurut penanggalan uranium.", status: "terverifikasi", sourceIds: ["guinness-karampuang"] },
  { id: "ev-bulusipong-43900", era: "seni-cadas", siteSlug: "karst-maros-pangkep", sortKey: -41874, dateLabel: "≥ 43.900 tahun lalu", dateLabelEn: "≥ 43,900 years ago", type: "dibangun", title: "Adegan berburu Leang Bulu' Sipong 4", narrative: "Panel empat anoa dan dua babi hutan yang diburu figur mirip manusia bersenjata. Usianya minimal 43.900 tahun.", status: "terverifikasi", sourceIds: ["guinness-karampuang"] },
  { id: "ev-pettae-holosen", era: "seni-cadas", siteSlug: "karst-maros-pangkep", sortKey: -6974, dateLabel: "8.000 - 10.000 tahun lalu", dateLabelEn: "8,000 - 10,000 years ago", type: "digunakan", title: "Gambar cadas Leang Pettae", narrative: "Leang Pettae menyimpan alat batu, pecahan cangkang dan tulang, serta sejumlah gambar cadas berusia 8.000 hingga 10.000 tahun.", status: "terverifikasi", sourceIds: ["gac-pettae"] },

  // ERA 3
  { id: "ev-liyangan-awal", era: "klasik", siteSlug: "liyangan", sortKey: 150, endKey: 1100, dateLabel: "Abad ke-2", dateLabelEn: "2nd century", type: "digunakan", title: "Awal peradaban Liangan kuno", narrative: "Secara kronologis peradaban Liangan kuno setidaknya berada pada rentang abad II sampai XI, bahkan sebelum masuknya unsur budaya India.", status: "terverifikasi", sourceIds: ["core-liangan"] },
  { id: "ev-liyangan-mataram", era: "klasik", siteSlug: "liyangan", sortKey: 850, endKey: 1000, dateLabel: "Abad ke-8 - 10", dateLabelEn: "8th - 10th century", type: "digunakan", title: "Permukiman Mataram Kuno di lereng Sindoro", narrative: "Liyangan menjadi permukiman masa Mataram Kuno dengan area hunian, pertanian, dan pemujaan berlatar Hindu, di ketinggian sekitar 1.100 sampai 1.200 mdpl.", status: "terverifikasi", sourceIds: ["brin-liyangan", "core-liangan"] },
  { id: "ev-borobudur-mulai", era: "klasik", siteSlug: "borobudur", sortKey: 800, endKey: 824, dateLabel: "± 800 M", dateLabelEn: "c. 800 CE", type: "dibangun", title: "Borobudur mulai dibangun", narrative: "Pada masa Mataram Kuno, ketika Raja Samaratungga dari Wangsa Syailendra berkuasa, penganut Buddha Mahayana mulai membangun Borobudur. Pembangunannya memakan waktu lebih dari setengah abad.", status: "terverifikasi", sourceIds: ["gnfi-borobudur-824", "wiki-borobudur"], moment: "BorobudurBuild", pinLength: 300 },
  { id: "ev-borobudur-824", era: "klasik", siteSlug: "borobudur", sortKey: 824, dateLabel: "26 Mei 824", dateLabelEn: "26 May 824", type: "digunakan", title: "Borobudur selesai dibangun", narrative: "Berdasarkan Prasasti Kahulungan dan Kayumwungan, Hudaya Kandahjaya menyebut Borobudur selesai pada 746 Saka atau 26 Mei 824 Masehi.", status: "diperdebatkan", alternatives: ["Penanggalan lain hanya menyebut abad ke-9 berdasarkan perbandingan gaya relief dan prasasti."], sourceIds: ["gnfi-borobudur-824"] },
  { id: "ev-sambisari-bangun", era: "klasik", siteSlug: "sambisari", sortKey: 850, dateLabel: "Abad ke-9", dateLabelEn: "9th century", type: "dibangun", title: "Candi Sambisari didirikan", narrative: "Candi Hindu dengan satu candi utama dan tiga candi perwara didirikan. Prasasti lempeng emas yang ditemukan di sini memiliki bentuk huruf abad IX.", status: "terverifikasi", sourceIds: ["brin-sambisari"] },
  { id: "ev-kimpulan-bangun", era: "klasik", siteSlug: "kimpulan", sortKey: 870, endKey: 1000, dateLabel: "Abad ke-9 - 10", dateLabelEn: "9th - 10th century", type: "dibangun", title: "Candi Kimpulan didirikan", narrative: "Sebuah candi Hindu sederhana dengan arca Ganesha, Nandi, dan lingga-yoni didirikan di pinggiran pusat kerajaan.", status: "terverifikasi", sourceIds: ["atrium-kimpulan", "antara-kimpulan", "mojok-kimpulan"] },
  { id: "ev-prambanan-850", era: "klasik", siteSlug: "prambanan", sortKey: 850.5, dateLabel: "± 850 M", dateLabelEn: "c. 850 CE", type: "dibangun", title: "Prambanan mulai dibangun", narrative: "Rakai Pikatan memulai pembangunan, yang kemudian diteruskan dan diperluas oleh Raja Lokapala dan Dyah Balitung.", status: "terverifikasi", sourceIds: ["gnfi-prambanan"], moment: "PrambananBuild", pinLength: 180 },
  { id: "ev-prambanan-856", era: "klasik", siteSlug: "prambanan", sortKey: 856, dateLabel: "12 November 856", dateLabelEn: "12 November 856", type: "digunakan", title: "Siwagrha diresmikan", narrative: "Menurut Prasasti Siwagrha, candi Siwa diresmikan pada 12 November 856. Nama aslinya Siwagrha, Rumah Siwa.", status: "terverifikasi", sourceIds: ["wiki-prambanan", "tirto-prambanan"] },
  { id: "ev-muarajambi-kedaton", era: "klasik", siteSlug: "muarajambi", sortKey: 950, endKey: 1000, dateLabel: "Abad ke-9 - 10", dateLabelEn: "9th - 10th century", type: "digunakan", title: "Aksara di bata Candi Kedaton", narrative: "Tulisan pendek pada permukaan bata Candi Kedaton secara paleografi berasal dari abad 9-10 Masehi, menandai kehidupan kompleks percandian di tepi Batanghari.", status: "terverifikasi", sourceIds: ["gnfi-muarajambi"] },
  { id: "ev-merapi-timbun", era: "klasik", siteSlug: "sambisari", sortKey: 1000, dateLabel: "Abad ke-10 - 11", dateLabelEn: "10th - 11th century", type: "terkubur", title: "Lahar Merapi menimbun Sambisari", narrative: "Gugusan Candi Sambisari tertimbun lahar Merapi setinggi 6,5 meter. Candi Kimpulan di dekatnya juga diperkirakan terkubur oleh letusan Merapi sekitar seribu tahun lalu.", status: "diperdebatkan", alternatives: ["Sebagian sumber menyebut letusan abad ke-10.", "Sumber lain menyebut abad ke-11."], sourceIds: ["brin-sambisari", "gnfi-sambisari"], moment: "DigDown", pinLength: 220, meta: { depthMeters: 6.5, label: "Sambisari" } },
  { id: "ev-liyangan-sindoro", era: "klasik", siteSlug: "liyangan", sortKey: 1050, dateLabel: "Abad ke-11", dateLabelEn: "11th century", type: "terkubur", title: "Sindoro mengubur Liyangan", narrative: "Gunung Sindoro meletus dahsyat dan berulang. Aliran piroklastik dan awan panas mengubur permukiman Liyangan kuno hingga lenyap dari permukaan.", status: "terverifikasi", sourceIds: ["gnfi-liyangan", "brin-liyangan"], moment: "DigDown", pinLength: 200, meta: { depthMeters: "belasan", label: "Liyangan" } },

  // ERA 4
  { id: "ev-trowulan-kota", era: "majapahit", siteSlug: "trowulan", sortKey: 1350, endKey: 1400, dateLabel: "Abad ke-13 - 14", dateLabelEn: "13th - 14th century", type: "digunakan", title: "Kota Majapahit di Trowulan", narrative: "Candi, istana, barak, balai pertemuan, waduk, dan kanal dari abad ke-13 dan ke-14 tersebar di Trowulan.", status: "terverifikasi", sourceIds: ["jp-trowulan", "brin-trowulan"], scrollWeight: 1.4 },
  { id: "ev-borobudur-ditinggal", era: "majapahit", siteSlug: "borobudur", sortKey: 1360, dateLabel: "Abad ke-14", dateLabelEn: "14th century", type: "ditinggalkan", title: "Borobudur ditinggalkan", narrative: "Seiring melemahnya pengaruh kerajaan Hindu-Buddha di Jawa, Borobudur ditinggalkan dan perlahan tertutup semak dan abu vulkanik.", status: "terverifikasi", sourceIds: ["gnfi-borobudur-824"] },
  { id: "ev-prambanan-terbengkalai", era: "majapahit", siteSlug: "prambanan", sortKey: 1500, dateLabel: "Hingga abad ke-16", dateLabelEn: "Until the 16th century", type: "ditinggalkan", title: "Prambanan terbengkalai", narrative: "Erupsi Merapi abad ke-10 dan banyak gempa diduga mengurangi fungsi Prambanan. Hingga abad ke-16 kompleks ini terbengkalai sebagai reruntuhan.", status: "terverifikasi", sourceIds: ["worldhistory-prambanan", "tirto-prambanan"] },

  // ERA 5
  { id: "ev-sombaopu-1525", era: "maritim", siteSlug: "somba-opu", sortKey: 1525, dateLabel: "1525", dateLabelEn: "1525", type: "dibangun", title: "Somba Opu dibangun", narrative: "Raja Gowa ke-9, Daeng Matanre Karaeng Tumapa'risi Kallonna, membangun benteng kerajaan Somba Opu. Awalnya dibangun dari tanah liat dan berkembang menjadi pusat kota dan pelabuhan rempah.", status: "terverifikasi", sourceIds: ["jalurrempah-sombaopu", "gnfi-sombaopu"], moment: "SombaOpu1669", pinLength: 280 },
  { id: "ev-ujungpandang-1545", era: "maritim", siteSlug: "fort-rotterdam", sortKey: 1545, dateLabel: "1545 (diperdebatkan)", dateLabelEn: "1545 (debated)", type: "dibangun", title: "Benteng Ujung Pandang didirikan", narrative: "Benteng Ujung Pandang didirikan sebagai bagian dari sistem pertahanan Gowa-Tallo.", status: "diperdebatkan", alternatives: ["Wikipedia (en) menilai tidak ada bukti langsung untuk 1545 dan benteng lebih mungkin dibangun pada 1634, sebagai bagian dari program pembentengan penguasa Makassar saat berperang dengan VOC.", "Sumber yang menyebut nama pendiri benteng (Raja Gowa ke-9 atau ke-10) berbeda-beda dan salah satunya sudah tidak dapat diakses."], sourceIds: ["wiki-rotterdam"] },
  { id: "ev-perang-makassar", era: "maritim", siteSlug: "somba-opu", sortKey: 1666, endKey: 1669.48, dateLabel: "1666 - 1669", dateLabelEn: "1666 - 1669", type: "peristiwa", title: "Perang Makassar", narrative: "Perang antara VOC dan Kesultanan Gowa pecah pada 1666 dan berlangsung hingga 1669.", status: "terverifikasi", sourceIds: ["wiki-makassar-war"] },
  { id: "ev-bungaya-1667", era: "maritim", siteSlug: "fort-rotterdam", sortKey: 1667.88, dateLabel: "18 November 1667", dateLabelEn: "18 November 1667", type: "peristiwa", title: "Perjanjian Bungaya", narrative: "Sultan Hasanuddin dan Laksamana Cornelis Speelman menandatangani Perjanjian Bungaya. Gowa wajib menyerahkan Benteng Ujung Pandang, yang kemudian dinamai Fort Rotterdam sesuai kota kelahiran Speelman.", status: "terverifikasi", sourceIds: ["gnfi-bungaya", "wiki-rotterdam"] },
  { id: "ev-sombaopu-ledakan", era: "maritim", siteSlug: "somba-opu", sortKey: 1669.45, dateLabel: "14 Juni 1669", dateLabelEn: "14 June 1669", type: "rusak", title: "Dinding Somba Opu dijebol", narrative: "Serangan dimulai dengan meledakkan bahan peledak di terowongan rahasia. Ledakan membuka lubang sekitar 27,5 meter di dinding benteng.", status: "terverifikasi", sourceIds: ["wiki-sombaopu"] },
  { id: "ev-sombaopu-jatuh", era: "maritim", siteSlug: "somba-opu", sortKey: 1669.48, dateLabel: "24 Juni 1669", dateLabelEn: "24 June 1669", type: "terkubur", title: "Somba Opu jatuh dan dihancurkan", narrative: "VOC menguasai benteng dan menghancurkannya hingga terendam ombak pasang. Kerajaan Gowa-Tallo runtuh.", status: "diperdebatkan", alternatives: ["Beberapa sumber menyebut benteng dikuasai pada 12 Juni 1669."], sourceIds: ["gnfi-sombaopu", "wiki-makassar-war"] },
  { id: "ev-rotterdam-bangunulang", era: "maritim", siteSlug: "fort-rotterdam", sortKey: 1673, endKey: 1679, dateLabel: "1673 - 1679", dateLabelEn: "1673 - 1679", type: "dibangun", title: "Fort Rotterdam dibangun ulang", narrative: "Belanda membangun ulang benteng sepenuhnya dengan enam bastion, tembok setinggi tujuh meter, dan parit sedalam dua meter. Bentuknya menyerupai penyu.", status: "terverifikasi", sourceIds: ["wiki-rotterdam", "disbudpar-rotterdam"], moment: "FortTurtleDraw", pinLength: 120 },

  // ERA 6
  { id: "ev-prambanan-lons", era: "kolonial", siteSlug: "prambanan", sortKey: 1733, dateLabel: "1733", dateLabelEn: "1733", type: "ditemukan", title: "Prambanan dicatat C.A. Lons", narrative: "C.A. Lons, pegawai VOC, mencatat keberadaan candi ini. Namun reruntuhannya tidak langsung mendapat perhatian.", status: "terverifikasi", sourceIds: ["tirto-prambanan"] },
  { id: "ev-prambanan-batas", era: "kolonial", siteSlug: "prambanan", sortKey: 1755, dateLabel: "1755", dateLabelEn: "1755", type: "peristiwa", title: "Batas Yogyakarta dan Surakarta", narrative: "Setelah Mataram terbagi, reruntuhan candi dan Sungai Opak dipakai sebagai batas Kesultanan Yogyakarta dan Surakarta. Batas ini masih menjadi batas provinsi hari ini.", status: "perlu-cek", sourceIds: ["wiki-prambanan"] },
  { id: "ev-prambanan-1811", era: "kolonial", siteSlug: "prambanan", sortKey: 1811, dateLabel: "1811", dateLabelEn: "1811", type: "ditemukan", title: "Mackenzie menemukan Prambanan", narrative: "Colin Mackenzie, juru ukur di bawah Thomas Stamford Raffles, menemukan kompleks candi secara kebetulan.", status: "terverifikasi", sourceIds: ["wiki-prambanan"], moment: "RafflesJourney", pinLength: 260 },
  { id: "ev-borobudur-1814", era: "kolonial", siteSlug: "borobudur", sortKey: 1814, dateLabel: "1814", dateLabelEn: "1814", type: "ditemukan", title: "Borobudur ditemukan kembali", narrative: "Raffles mengutus H.C. Cornelius untuk membersihkan bukit yang tertutup semak. Cornelius membuat banyak gambar, 39 di antaranya masih ada.", status: "terverifikasi", sourceIds: ["penang-borobudur", "wiki-borobudur"] },
  { id: "ev-trowulan-1815", era: "kolonial", siteSlug: "trowulan", sortKey: 1815, dateLabel: "1815", dateLabelEn: "1815", type: "diteliti", title: "Wardenaar meneliti Trowulan", narrative: "Atas tugas dari Raffles, Wardenaar mengamati peninggalan arkeologi di Mojokerto. Catatannya dikutip dalam History of Java (1817).", status: "terverifikasi", sourceIds: ["brin-trowulan"] },
  { id: "ev-muarajambi-crooke", era: "kolonial", siteSlug: "muarajambi", sortKey: 1820, dateLabel: "1820", dateLabelEn: "1820", type: "ditemukan", title: "Crooke melaporkan Muarajambi", narrative: "Perwira Inggris S.C. Crooke menyusuri Batanghari dan melihat reruntuhan bata serta arca batu di tengah hutan dekat desa.", status: "diperdebatkan", alternatives: ["Sebagian sumber menyebut tahun 1824."], sourceIds: ["gnfi-muarajambi", "medcom-muarajambi"] },
  { id: "ev-sangiran-1864", era: "kolonial", siteSlug: "sangiran", sortKey: 1864, dateLabel: "1864", dateLabelEn: "1864", type: "ditemukan", title: "Schemulling melaporkan fosil Sangiran", narrative: "P.E.C. Schemulling melaporkan temuan fosil vertebrata dari Kalioso di wilayah Sangiran. Setelah itu situs ini seolah terlupakan cukup lama.", status: "diperdebatkan", alternatives: ["Wikipedia (en) mencatat pekerjaan lapangan awal Eugène Dubois di Sangiran pada 1883 dan tidak menyebut laporan tahun 1864."], sourceIds: ["wiki-sangiran"] },
  { id: "ev-maimun-1888", era: "kolonial", siteSlug: "istana-maimun", sortKey: 1888.65, endKey: 1891.38, dateLabel: "26 Agustus 1888", dateLabelEn: "26 August 1888", type: "dibangun", title: "Istana Maimun mulai dibangun", narrative: "Pada masa Sultan Makmun Al Rasyid Perkasa Alamsyah, Sultan Deli ke-9, peletakan batu pertama Istana Maimun dilakukan.", status: "terverifikasi", sourceIds: ["itb-maimun", "gnfi-maimun"], moment: "MaimunFacade", pinLength: 140 },
  { id: "ev-maimun-1891", era: "kolonial", siteSlug: "istana-maimun", sortKey: 1891.38, dateLabel: "18 Mei 1891", dateLabelEn: "18 May 1891", type: "digunakan", title: "Istana Maimun selesai", narrative: "Pembangunan dinyatakan selesai dengan biaya kurang lebih satu juta gulden. Istana menjadi tempat tinggal dan tempat Sultan beraktivitas.", status: "terverifikasi", sourceIds: ["itb-maimun", "gnfi-maimun"] },
  { id: "ev-borobudur-komite", era: "kolonial", siteSlug: "borobudur", sortKey: 1900, dateLabel: "1900", dateLabelEn: "1900", type: "diteliti", title: "Komite pelestarian Borobudur", narrative: "Sebuah komite dibentuk untuk menimbang langkah pelestarian. Theodoor van Erp, letnan dua berusia 28 tahun, dipilih memimpin proyek.", status: "perlu-cek", sourceIds: ["penang-borobudur"] },
  { id: "ev-maimun-1903", era: "kolonial", siteSlug: "istana-maimun", sortKey: 1906, endKey: 1909, dateLabel: "1906 - 1909", dateLabelEn: "1906 - 1909", type: "dibangun", title: "Masjid Raya Al Mashun dibangun", narrative: "Pembangunan Masjid Raya Al Mashun dimulai pada 1906 dan selesai pada 1909. Pada awalnya masjid ini merupakan bagian dari kompleks Istana Maimun.", status: "perlu-cek", sourceIds: ["wiki-masjid-medan"] },
  { id: "ev-borobudur-vanerp", era: "kolonial", siteSlug: "borobudur", sortKey: 1907, endKey: 1911, dateLabel: "1907 - 1911", dateLabelEn: "1907 - 1911", type: "dipugar", title: "Pemugaran pertama oleh van Erp", narrative: "Pemugaran besar pertama Borobudur dilaksanakan di bawah pimpinan Theodoor van Erp.", status: "terverifikasi", sourceIds: ["wiki-borobudur", "kniu-borobudur"] },
  { id: "ev-prambanan-1918", era: "kolonial", siteSlug: "prambanan", sortKey: 1918, endKey: 1953, dateLabel: "1918", dateLabelEn: "1918", type: "dipugar", title: "Pemugaran Prambanan dimulai", narrative: "Pemugaran resmi dimulai di bawah pemerintah Hindia Belanda, berfokus pada Candi Siwa. Pada 1930-an diterapkan metode anastilosis.", status: "terverifikasi", sourceIds: ["metro-prambanan"] },
  { id: "ev-maeda-bangun", era: "kolonial", siteSlug: "rumah-maeda", sortKey: 1927, dateLabel: "1920-an", dateLabelEn: "1920s", type: "dibangun", title: "Rumah di Jalan Imam Bonjol dibangun", narrative: "Rumah bergaya art deco rancangan J.F.L. Blankenberg dibangun di Menteng.", status: "diperdebatkan", alternatives: ["Sebagian sumber menyebut tahun 1920.", "Edukator museum menyebut dibangun sekitar 1927 dan selesai 1931 oleh Nederlands Levensverzekering Maatschappij (kini Jiwasraya)."], sourceIds: ["detik-maeda", "gnfi-munasprok", "metro-maeda"] },
  { id: "ev-trowulan-ovm", era: "kolonial", siteSlug: "trowulan", sortKey: 1924.29, dateLabel: "15 April 1924", dateLabelEn: "15 April 1924", type: "diteliti", title: "Oudheidkundige Vereeniging Majapahit", narrative: "Badan purbakala OVM dibentuk untuk meneliti Trowulan. Pada tahun yang sama Maclaine Pont memetakan lokasi candi, istana, dan kanal Majapahit.", status: "terverifikasi", sourceIds: ["tirto-trowulan", "jp-trowulan"] },
  { id: "ev-trowulan-segaran", era: "kolonial", siteSlug: "trowulan", sortKey: 1926, dateLabel: "1926", dateLabelEn: "1926", type: "ditemukan", title: "Kolam Segaran ditemukan", narrative: "Kolam bata yang tertutup tanah dan lumpur ditemukan dan dipugar oleh Henri Maclaine Pont.", status: "terverifikasi", sourceIds: ["jp-trowulan"] },
  { id: "ev-sangiran-1934", era: "kolonial", siteSlug: "sangiran", sortKey: 1934, dateLabel: "1934", dateLabelEn: "1934", type: "diteliti", title: "Von Koenigswald di Ngebung", narrative: "G.H.R. von Koenigswald menemukan artefak litik di Ngebung, dibantu tokoh setempat Toto Marsono. Sejak itu Sangiran menjadi sorotan dunia.", status: "terverifikasi", sourceIds: ["kemdikbud-sangiran", "kemdikbud-sangiran-museum", "brin-sangiran"] },
  { id: "ev-sangiran-1936", era: "kolonial", siteSlug: "sangiran", sortKey: 1936, dateLabel: "1936", dateLabelEn: "1936", type: "ditemukan", title: "Fosil hominid pertama Sangiran", narrative: "Fosil hominid pertama dari Sangiran ditemukan.", status: "terverifikasi", sourceIds: ["brin-sangiran"] },

  // ERA 7
  { id: "ev-proklamasi-1945", era: "kemerdekaan", siteSlug: "rumah-maeda", sortKey: 1945.62, endKey: 1945.63, dateLabel: "16 - 17 Agustus 1945", dateLabelEn: "16 - 17 August 1945", type: "peristiwa", title: "Naskah proklamasi dirumuskan", narrative: "Sekitar pukul 22.00 para tokoh mendatangi rumah Laksamana Muda Tadashi Maeda. Di ruang makan, Sukarno, Mohammad Hatta, dan Achmad Soebardjo merumuskan naskah proklamasi dalam waktu kurang dari dua jam.", status: "terverifikasi", sourceIds: ["jawapos-maeda", "gnfi-munasprok", "gnfi-maeda"], moment: "Proclamation1945", pinLength: 200, scrollWeight: 1.5 },

  // ERA 8
  { id: "ev-pettae-1950", era: "modern", siteSlug: "karst-maros-pangkep", sortKey: 1950.15, dateLabel: "26 Februari 1950", dateLabelEn: "26 February 1950", type: "ditemukan", title: "Cap tangan di Leang Pettae", narrative: "Saat ekskavasi, C.H.M. Heeren-Palm menemukan beberapa cap tangan negatif berlatar merah di langit-langit ujung gua. Ini lukisan prasejarah pertama yang diketahui arkeolog di karst Maros-Pangkep.", status: "terverifikasi", sourceIds: ["lombok-heeren-palm", "kompas-pettae"] },
  { id: "ev-prambanan-1953", era: "modern", siteSlug: "prambanan", sortKey: 1953, dateLabel: "1953", dateLabelEn: "1953", type: "dipugar", title: "Candi Siwa selesai dipugar", narrative: "Setelah terhenti karena depresi ekonomi dan Perang Dunia II, rekonstruksi candi utama selesai dan diresmikan Presiden Soekarno.", status: "terverifikasi", sourceIds: ["metro-prambanan", "wiki-prambanan"] },
  { id: "ev-sambisari-1966", era: "modern", siteSlug: "sambisari", sortKey: 1966.5, dateLabel: "Juli 1966", dateLabelEn: "July 1966", type: "ditemukan", title: "Cangkul petani membentur candi", narrative: "Seorang petani yang menggarap lahan milik Karyowinangun membentur batu yang ternyata puncak candi. Penggalian percobaan menyingkap kompleks yang terkubur 6,5 meter.", status: "terverifikasi", sourceIds: ["brin-sambisari", "spafa-sambisari"], moment: "DigDown", pinLength: 160, meta: { depthMeters: 6.5, label: "Sambisari", reverse: 1 } },
  { id: "ev-borobudur-badan", era: "modern", siteSlug: "borobudur", sortKey: 1971, dateLabel: "1971", dateLabelEn: "1971", type: "diteliti", title: "Badan Pemugaran Candi Borobudur", narrative: "Badan Pemugaran Candi Borobudur dibentuk dan menghasilkan sebagian besar arsip pemugaran yang kini diakui UNESCO.", status: "terverifikasi", sourceIds: ["unesco-mow-borobudur"] },
  { id: "ev-borobudur-1973", era: "modern", siteSlug: "borobudur", sortKey: 1973, endKey: 1983, dateLabel: "1973 - 1983", dateLabelEn: "1973 - 1983", type: "dipugar", title: "Pemugaran kedua bersama UNESCO", narrative: "Pemerintah Indonesia dan UNESCO memugar Borobudur: batu dibersihkan, dibongkar, dipasang kembali, struktur diperkuat beton dan drainase internal.", status: "terverifikasi", sourceIds: ["kemdikbud-borobudur-2020", "unesco-mow-borobudur", "unnes-borobudur"], moment: "BorobudurRestore", pinLength: 220 },
  { id: "ev-sangiran-1974", era: "modern", siteSlug: "sangiran", sortKey: 1974, dateLabel: "1974", dateLabelEn: "1974", type: "dibangun", title: "Museum Pleistosen berdiri", narrative: "Museum Pleistosen berdiri di Sragen sebagai cikal bakal Museum Sangiran.", status: "perlu-cek", sourceIds: ["gnfi-sangiran"] },
  { id: "ev-trowulan-segaran-74", era: "modern", siteSlug: "trowulan", sortKey: 1974.5, endKey: 1984, dateLabel: "1974 - 1984", dateLabelEn: "1974 - 1984", type: "dipugar", title: "Pemugaran mendalam Kolam Segaran", narrative: "Kolam Segaran dipugar lebih mendalam.", status: "perlu-cek", sourceIds: ["jp-trowulan"] },
  { id: "ev-muarajambi-1975", era: "modern", siteSlug: "muarajambi", sortKey: 1975, dateLabel: "1975", dateLabelEn: "1975", type: "diteliti", title: "Ekskavasi Muarajambi dimulai", narrative: "Ekskavasi dimulai di bawah Direktorat Sejarah dan Purbakala. Candi Gumpung menjadi candi pertama yang dipugar.", status: "perlu-cek", sourceIds: ["jp-muarajambi"] },
  { id: "ev-sambisari-rekon", era: "modern", siteSlug: "sambisari", sortKey: 1976, endKey: 1986, dateLabel: "1976 - 1986", dateLabelEn: "1976 - 1986", type: "dipugar", title: "Rekonstruksi Candi Sambisari", narrative: "Proyek Rekonstruksi Candi Sambisari berjalan selama satu dekade, menyusun kembali batu-batu candi yang terkubur.", status: "terverifikasi", sourceIds: ["spafa-sambisari"] },
  { id: "ev-sombaopu-ekskavasi", era: "modern", siteSlug: "somba-opu", sortKey: 1977, dateLabel: "1977 - awal 1980-an", dateLabelEn: "1977 - early 1980s", type: "ditemukan", title: "Somba Opu ditemukan kembali", narrative: "Sejumlah ilmuwan melakukan ekskavasi dan menemukan kembali sisa-sisa struktur Benteng Somba Opu.", status: "perlu-cek", sourceIds: ["gnfi-sombaopu"] },
  { id: "ev-borobudur-bom", era: "modern", siteSlug: "borobudur", sortKey: 1985.05, dateLabel: "21 Januari 1985", dateLabelEn: "21 January 1985", type: "rusak", title: "Sembilan stupa rusak", narrative: "Sembilan bom meledak di Borobudur dan merusak sembilan stupa. Stupa dipugar dan sistem keamanan kawasan ditingkatkan.", status: "terverifikasi", sourceIds: ["unnes-bom-1985"] },
  { id: "ev-trowulan-museum", era: "modern", siteSlug: "trowulan", sortKey: 1987, dateLabel: "1987", dateLabelEn: "1987", type: "dibangun", title: "Museum Trowulan baru", narrative: "Museum baru diresmikan untuk menyimpan koleksi peninggalan Majapahit.", status: "perlu-cek", sourceIds: ["wiki-trowulan-museum"] },
  { id: "ev-muarajambi-1988", era: "modern", siteSlug: "muarajambi", sortKey: 1988, dateLabel: "1988", dateLabelEn: "1988", type: "ditemukan", title: "Lempeng bertulis Candi Tinggi", narrative: "Lempeng bertulis ditemukan saat pemugaran Candi Tinggi.", status: "terverifikasi", sourceIds: ["bpcb-jambi"] },
  { id: "ev-sombaopu-1990", era: "modern", siteSlug: "somba-opu", sortKey: 1990, dateLabel: "1990", dateLabelEn: "1990", type: "dipugar", title: "Rekonstruksi Somba Opu", narrative: "Rekonstruksi dilakukan dan kawasan berkembang menjadi situs wisata budaya sekaligus miniatur budaya Sulawesi Selatan.", status: "perlu-cek", sourceIds: ["gnfi-sombaopu"] },
  { id: "ev-unesco-1991", era: "modern", siteSlug: "borobudur", sortKey: 1991, dateLabel: "1991", dateLabelEn: "1991", type: "ditetapkan", title: "Borobudur dan Prambanan menjadi Warisan Dunia", narrative: "UNESCO menetapkan Borobudur Temple Compounds (bersama Mendut dan Pawon) dan Prambanan Temple Compounds sebagai Warisan Dunia.", status: "terverifikasi", sourceIds: ["nwe-borobudur", "unesco-prambanan-2006"] },
  { id: "ev-munasprok-1992", era: "modern", siteSlug: "rumah-maeda", sortKey: 1992.9, dateLabel: "24 November 1992", dateLabelEn: "24 November 1992", type: "ditetapkan", title: "Museum Perumusan Naskah Proklamasi", narrative: "Lewat SK Mendikbud Nomor 0476/1992, rumah ini resmi menjadi Museum Perumusan Naskah Proklamasi.", status: "terverifikasi", sourceIds: ["gnfi-munasprok"] },
  { id: "ev-sangiran-1996", era: "modern", siteSlug: "sangiran", sortKey: 1996.93, dateLabel: "5 Desember 1996", dateLabelEn: "5 December 1996", type: "ditetapkan", title: "Sangiran menjadi Warisan Dunia", narrative: "UNESCO mencatat Sangiran sebagai Warisan Budaya Dunia nomor 593.", status: "terverifikasi", sourceIds: ["kemdikbud-sangiran"] },
  { id: "ev-muarajambi-1998", era: "modern", siteSlug: "muarajambi", sortKey: 1998, dateLabel: "1998", dateLabelEn: "1998", type: "ditemukan", title: "Lempeng emas Candi Gedong I", narrative: "Lempengan emas ditemukan saat pemugaran Candi Gedong I.", status: "terverifikasi", sourceIds: ["bpcb-jambi"] },
  { id: "ev-maimun-2003", era: "modern", siteSlug: "istana-maimun", sortKey: 2003, endKey: 2005, dateLabel: "2003 - 2005", dateLabelEn: "2003 - 2005", type: "peristiwa", title: "Istana Maimun dibuka untuk wisata", narrative: "Sejak 2003 istana menjadi objek wisata sekaligus hunian ahli waris, dan sejak 2005 dikelola ahli waris keluarga.", status: "terverifikasi", sourceIds: ["itb-maimun"] },
  { id: "ev-prambanan-2006", era: "modern", siteSlug: "prambanan", sortKey: 2006.4, dateLabel: "27 Mei 2006", dateLabelEn: "27 May 2006", type: "rusak", title: "Gempa Yogyakarta mengguncang Prambanan", narrative: "Pukul 05.53 gempa berkekuatan 5,9 SR melanda Yogyakarta dan sebagian Jawa Tengah. Kompleks Prambanan rusak berat.", status: "terverifikasi", sourceIds: ["unesco-prambanan-2006"], moment: "PrambananQuake", pinLength: 180 },
  { id: "ev-liyangan-2008", era: "modern", siteSlug: "liyangan", sortKey: 2008.9, dateLabel: "Akhir 2008", dateLabelEn: "Late 2008", type: "ditemukan", title: "Penambang pasir menemukan Liyangan", narrative: "Penambang pasir di Dusun Liyangan menemukan struktur talud, arca, dan komponen candi dari kedalaman belasan meter.", status: "terverifikasi", sourceIds: ["tirto-liyangan", "core-liangan"], moment: "DigDown", pinLength: 160, meta: { depthMeters: "belasan", label: "Liyangan", reverse: 1 } },
  { id: "ev-liyangan-2009", era: "modern", siteSlug: "liyangan", sortKey: 2009, dateLabel: "2009", dateLabelEn: "2009", type: "diteliti", title: "Penelitian Balai Arkeologi Yogyakarta", narrative: "Survei pendahuluan dimulai dan menjadi dasar program penelitian bertahap di Liyangan.", status: "terverifikasi", sourceIds: ["core-liangan"] },
  { id: "ev-muarajambi-2009", era: "modern", siteSlug: "muarajambi", sortKey: 2009.5, dateLabel: "2009", dateLabelEn: "2009", type: "ditetapkan", title: "Muarajambi diusulkan ke UNESCO", narrative: "Kawasan Muarajambi diusulkan untuk mendapat pengakuan UNESCO.", status: "perlu-cek", sourceIds: ["jp-muarajambi"] },
  { id: "ev-kimpulan-2009", era: "modern", siteSlug: "kimpulan", sortKey: 2009.94, dateLabel: "11 Desember 2009", dateLabelEn: "11 December 2009", type: "ditemukan", title: "Ekskavator membentur Candi Kimpulan", narrative: "Saat menggali fondasi perpustakaan pusat UII, pekerja konstruksi terkejut ketika ekskavator membentur batu berbentuk unik di kedalaman sekitar 4 meter. Pembangunan dihentikan untuk menyelamatkan candi.", status: "terverifikasi", sourceIds: ["atrium-kimpulan", "mojok-kimpulan"], moment: "DigDown", pinLength: 160, meta: { depthMeters: 4, label: "Kimpulan", reverse: 1 } },
  { id: "ev-borobudur-2010", era: "modern", siteSlug: "borobudur", sortKey: 2010.85, endKey: 2010.87, dateLabel: "Oktober - November 2010", dateLabelEn: "October - November 2010", type: "rusak", title: "Abu Merapi menyelimuti Borobudur", narrative: "Erupsi besar Merapi menutupi kawasan dan candi dengan abu vulkanik. Kompleks candi ditutup 5 sampai 9 November untuk pembersihan.", status: "terverifikasi", sourceIds: ["heidelberg-borobudur", "kniu-borobudur", "wiki-borobudur"] },
  { id: "ev-sangiran-2011", era: "modern", siteSlug: "sangiran", sortKey: 2011.95, dateLabel: "15 Desember 2011", dateLabelEn: "15 December 2011", type: "dibangun", title: "Museum Sangiran baru", narrative: "Museum dan pusat pengunjung Sangiran yang sekarang diresmikan oleh Menteri Pendidikan dan Kebudayaan.", status: "perlu-cek", sourceIds: ["wiki-sangiran"] },
  { id: "ev-liyangan-2015", era: "modern", siteSlug: "liyangan", sortKey: 2015, dateLabel: "2015", dateLabelEn: "2015", type: "revitalisasi", title: "Rencana museum bencana Liyangan", narrative: "Pemerintah merencanakan Situs Liyangan menjadi museum bencana alam.", status: "perlu-cek", sourceIds: ["jp-liyangan"] },
  { id: "ev-karampuang-2017", era: "modern", siteSlug: "karst-maros-pangkep", sortKey: 2017, dateLabel: "2017", dateLabelEn: "2017", type: "ditemukan", title: "Panel Leang Karampuang ditemukan", narrative: "Panel langit-langit di gua kapur Leang Karampuang ditemukan, kelak menjadi bukti seni figuratif tertua di dunia.", status: "terverifikasi", sourceIds: ["guinness-karampuang"] },
  { id: "ev-bulusipong-2019", era: "modern", siteSlug: "karst-maros-pangkep", sortKey: 2019.94, dateLabel: "11 Desember 2019", dateLabelEn: "11 December 2019", type: "diteliti", title: "Adegan berburu dilaporkan di Nature", narrative: "Panel Leang Bulu' Sipong 4 dilaporkan sebagai seni representasional tertua saat itu.", status: "terverifikasi", sourceIds: ["guinness-karampuang"] },
  { id: "ev-kimpulan-2022", era: "modern", siteSlug: "kimpulan", sortKey: 2022.84, dateLabel: "5 November 2022", dateLabelEn: "5 November 2022", type: "peristiwa", title: "Pemuka agama dunia mengunjungi Kimpulan", narrative: "Rektor UII mengajak pemuka agama peserta Forum R20 melihat Candi Kimpulan di Perpustakaan Mohammad Hatta.", status: "terverifikasi", sourceIds: ["nu-kimpulan"] },
  { id: "ev-karampuang-2024", era: "modern", siteSlug: "karst-maros-pangkep", sortKey: 2024.5, dateLabel: "3 Juli 2024", dateLabelEn: "3 July 2024", type: "diteliti", title: "Nature: 51.200 tahun", narrative: "Tim BRIN, Griffith University, dan Southern Cross University menerbitkan hasil penanggalan LA-U-series. Ketua tim BRIN, Adhi Agus Oktaviana, menyebutnya seni cadas pertama di Indonesia yang umurnya melampaui 50.000 tahun.", status: "terverifikasi", sourceIds: ["guinness-karampuang", "detik-brin-karampuang", "merahputih-karampuang"] },
  { id: "ev-muarajambi-2024", era: "modern", siteSlug: "muarajambi", sortKey: 2024.43, dateLabel: "5 Juni 2024", dateLabelEn: "5 June 2024", type: "revitalisasi", title: "Tegak Tiang Tuo Muarajambi", narrative: "Prosesi Tegak Tiang Tuo menandai dimulainya megaproyek Revitalisasi Kawasan Cagar Budaya Nasional Muarajambi.", status: "terverifikasi", sourceIds: ["medcom-muarajambi"] },
  { id: "ev-penutup-2026", era: "modern", siteSlug: null, sortKey: 2026, dateLabel: "2026", dateLabelEn: "2026", type: "peristiwa", title: "Perjalanan belum selesai", narrative: "Masih banyak menapo yang tertutup tanah, gua yang belum diteliti, dan candi yang mungkin masih tersembunyi di bawah abu gunung api. Kunjungi, rawat, dan ceritakan.", status: "terverifikasi", sourceIds: [], moment: "Constellation", pinLength: 200 },
];

/** Peristiwa terurut kronologis. Gunakan ini di UI. */
export const sortedEvents = [...events].sort((a, b) => a.sortKey - b.sortKey);
