import type { Category, SiteWithCategory } from "@/data";
import { siteColor } from "@/lib/sites";
import type { ModelArchetype } from "./types";

/**
 * Pemetaan kategori SETAPAK ke arketipe 3D bawaan
 */
export const CATEGORY_DEFAULT_ARCHETYPE: Record<Category, ModelArchetype> = {
  prasejarah: "megalith",
  "seni-cadas": "megalith",
  prasasti: "prasasti",
  candi: "prambanan",
  islam: "tajug",
  keraton: "joglo",
  benteng: "benteng",
  kolonial: "monument",
  kemerdekaan: "monument",
  lanskap: "pura",
};

/**
 * Penyesuaian arketipe spesifik per slug situs agar setiap situs bersejarah
 * tampil dengan representasi arsitektur 3D yang paling otentik.
 */
export const SITE_ARCHETYPE_OVERRIDES: Record<string, ModelArchetype> = {
  // Candi Buddha berundak / stupa
  "borobudur": "stupa",
  "muarajambi": "stupa",
  "kalasan": "stupa",
  "mendut": "stupa",
  "pawon": "stupa",
  "sewu": "stupa",
  "plaosan": "prambanan",
  "sojiwan": "stupa",

  // Candi Hindu ramping bertingkat
  "prambanan": "prambanan",
  "sambisari": "prambanan",
  "kimpulan": "prambanan",
  "dieng": "prambanan",
  "gedong-songo": "prambanan",
  "penataran": "prambanan",
  "cangkuang": "prambanan",
  "badut": "prambanan",
  "jawi": "prambanan",
  "singasari": "prambanan",
  "kidal": "prambanan",
  "jago": "prambanan",

  // Candi berundak megalitik / punden
  "sukuh": "megalith",
  "cetho": "pura",
  "liyangan": "megalith",
  "gunung-padang": "megalith",

  // Ibu kota Majapahit / Gapura Paduraksa & Candi Bentar bata merah
  "trowulan": "gapura",
  "bajangratu": "gapura",
  "wringinlawang": "gapura",
  "brahu": "gapura",
  "tikus": "gapura",

  // Benteng pertahanan
  "somba-opu": "benteng",
  "fort-rotterdam": "benteng",
  "benteng-vredeburg": "benteng",
  "fort-marlborough": "benteng",
  "fort-belgica": "benteng",
  "benteng-pendem-cilacap": "benteng",
  "benteng-keraton-buton": "benteng",
  "benteng-oranje": "benteng",
  "benteng-kalamata": "benteng",
  "benteng-tolukko": "benteng",
  "benteng-duurstede": "benteng",
  "benteng-nostalgia": "benteng",

  // Keraton, Istana, dan Rumah Adat
  "istana-maimun": "gadang",
  "istana-siak": "joglo",
  "kraton-yogyakarta": "joglo",
  "kraton-surakarta": "joglo",
  "kraton-kasepuhan": "joglo",
  "kraton-kanoman": "joglo",
  "istana-pagaruyung": "gadang",
  "istana-taman-sari": "joglo",
  "istana-bima": "joglo",
  "istana-sumbawa": "joglo",
  "rumah-gadang": "gadang",
  "toraja": "tongkonan",
  "kete-kesu": "tongkonan",
  "desa-sade": "tajug",
  "kampung-naga": "tajug",
  "wamena": "honai",
  "lembah-baliem": "honai",

  // Tradisi Maritim & Perahu
  "pinisi": "pinisi",
  "perahu-pinisi": "pinisi",
  "bulukumba": "pinisi",
  "banda-neira": "benteng",

  // Pura & Lanskap Sakral Bali-Lombok
  "pura-besakih": "pura",
  "taman-ayun": "pura",
  "tanah-lot": "pura",
  "uluwatu": "pura",
  "tirta-empul": "pura",
  "subak-bali": "pura",
  "jatiluwih": "pura",
  "pura-lingsar": "pura",

  // Masjid & Makam Islam beratap tumpang / tajug
  "masjid-agung-demak": "tajug",
  "masjid-menara-kudus": "tajug",
  "masjid-agung-banten": "tajug",
  "masjid-raya-baiturrahman": "tajug",
  "masjid-sultan-suriansyah": "tajug",
  "masjid-agung-surakarta": "tajug",
  "masjid-gedhe-kauman": "tajug",
  "masjid-katangka": "tajug",
  "makam-imogiri": "joglo",
  "makam-sunan-giri": "tajug",
  "makam-sunan-bonang": "tajug",
  "makam-sunan-kalijaga": "tajug",
  "makam-sunan-gunung-jati": "tajug",
  "makam-troloyo": "gapura",

  // Prasasti & Menhir
  "ciaruteun": "prasasti",
  "kebonkopi": "prasasti",
  "tugu-prasasti": "prasasti",
  "yupa-kutai": "prasasti",
  "yupa": "prasasti",
  "kedukan-bukit": "prasasti",
  "telaga-batu": "prasasti",
  "talang-tuwo": "prasasti",
  "sojomerto": "prasasti",
  "canggal": "prasasti",
  "shivagrha": "prasasti",
  "kaladi": "prasasti",
  "sukabumi": "prasasti",
  "plumpungan": "prasasti",

  // Prasejarah & Seni Cadas
  "sangiran": "megalith",
  "liang-bua": "megalith",
  "karst-maros-pangkep": "megalith",
  "seni-cadas-misool": "megalith",
  "gua-harimau": "megalith",
  "lembah-bada": "megalith",
  "besoa": "megalith",
  "napu": "megalith",
  "pasemah": "megalith",
  "batu-berak": "megalith",

  // Bangunan Kolonial & Monumen Kemerdekaan
  "monas": "monument",
  "gedung-sate": "monument",
  "lawang-sewu": "monument",
  "kota-tua-jakarta": "monument",
  "gereja-blenduk": "monument",
  "benteng-rotterdam": "benteng",
  "rumah-maeda": "monument",
  "rumah-rengasdengklok": "joglo",
  "tugu-proklamasi": "monument",
  "museum-sumpah-pemuda": "monument",
  "gedung-joang-45": "monument",
  "hotel-majapahit": "monument",
};

/**
 * Mengambil arketipe 3D terbaik untuk suatu situs
 */
export function getSiteArchetype(site: SiteWithCategory): ModelArchetype {
  if (SITE_ARCHETYPE_OVERRIDES[site.slug]) {
    return SITE_ARCHETYPE_OVERRIDES[site.slug];
  }
  if (site.category && CATEGORY_DEFAULT_ARCHETYPE[site.category]) {
    return CATEGORY_DEFAULT_ARCHETYPE[site.category];
  }
  return "monument";
}

/**
 * Mengambil warna aksen khas situs dari palet SETAPAK
 */
export function getSiteAccentColor(site: SiteWithCategory): string {
  return siteColor(site.slug);
}
