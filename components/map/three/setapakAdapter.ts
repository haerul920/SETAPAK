import {
  categoryLabels,
  sites,
  sortedEvents,
  type Category,
  type SiteWithCategory,
} from "@/data";
import { siteStart, UNESCO_SITES, type PinState } from "@/lib/peta-data";
import { siteColor } from "@/lib/sites";
import type {
  CulturalCategory,
  CulturalNode,
  EraId,
  ModelArchetype,
} from "./nusantaraData";

const CATEGORY_TO_CULTURAL: Record<Category, CulturalCategory> = {
  prasejarah: "aksara_ilmu",
  "seni-cadas": "seni_tradisi",
  prasasti: "aksara_ilmu",
  candi: "arsitektur",
  islam: "seni_tradisi",
  keraton: "arsitektur",
  benteng: "arsitektur",
  kolonial: "arsitektur",
  kemerdekaan: "arsitektur",
  lanskap: "seni_tradisi",
};

const SITE_ARCHETYPE_MAP: Record<string, ModelArchetype> = {
  borobudur: "stupa_borobudur",
  muarajambi: "stupa_borobudur",
  kalasan: "stupa_borobudur",
  mendut: "stupa_borobudur",
  pawon: "stupa_borobudur",
  sewu: "stupa_borobudur",

  prambanan: "candi_prambanan",
  sambisari: "candi_prambanan",
  kimpulan: "candi_prambanan",
  dieng: "candi_prambanan",
  "gedong-songo": "candi_prambanan",
  penataran: "candi_prambanan",
  cangkuang: "candi_prambanan",

  trowulan: "gapura_paduraksa",
  bajangratu: "gapura_paduraksa",
  wringinlawang: "gapura_paduraksa",

  "somba-opu": "benteng_pertahanan",
  "fort-rotterdam": "benteng_pertahanan",
  "benteng-vredeburg": "benteng_pertahanan",
  "fort-marlborough": "benteng_pertahanan",
  "fort-belgica": "benteng_pertahanan",
  "benteng-pendem-cilacap": "benteng_pertahanan",
  "benteng-keraton-buton": "benteng_pertahanan",

  ciaruteun: "prasasti_batu",
  kebonkopi: "prasasti_batu",
  "yupa-kutai": "prasasti_batu",
  yupa: "prasasti_batu",
  "kedukan-bukit": "prasasti_batu",
  "telaga-batu": "prasasti_batu",
  "tugu-prasasti": "prasasti_batu",

  "masjid-agung-demak": "masjid_tajug",
  "masjid-menara-kudus": "masjid_tajug",
  "masjid-agung-banten": "masjid_tajug",
  "masjid-raya-baiturrahman": "masjid_tajug",
  "makam-sunan-giri": "masjid_tajug",

  "istana-maimun": "rumah_gadang",
  "istana-pagaruyung": "rumah_gadang",
  "rumah-gadang": "rumah_gadang",

  "pura-besakih": "pura_bali",
  "taman-ayun": "pura_bali",
  "subak-bali": "pura_bali",
  jatiluwih: "pura_bali",

  toraja: "tongkonan",
  "kete-kesu": "tongkonan",

  pinisi: "perahu_pinisi",
  "perahu-pinisi": "perahu_pinisi",
  bulukumba: "perahu_pinisi",
  "banda-neira": "benteng_pertahanan",

  "kraton-yogyakarta": "joglo_keraton",
  "kraton-surakarta": "joglo_keraton",
  "kraton-kasepuhan": "joglo_keraton",
  "istana-siak": "joglo_keraton",

  sangiran: "menhir_megalitik",
  "liang-bua": "menhir_megalitik",
  "karst-maros-pangkep": "menhir_megalitik",
  "seni-cadas-misool": "menhir_megalitik",
  "lembah-bada": "menhir_megalitik",
  "gunung-padang": "menhir_megalitik",

  wamena: "honai_papua",
  "lembah-baliem": "honai_papua",

  monas: "monumen_nasional",
  "gedung-sate": "monumen_nasional",
  "lawang-sewu": "monumen_nasional",
  "kota-tua-jakarta": "monumen_nasional",
  "rumah-maeda": "monumen_nasional",
  "tugu-proklamasi": "monumen_nasional",
};

const CATEGORY_DEFAULT_ARCHETYPE: Record<Category, ModelArchetype> = {
  prasejarah: "menhir_megalitik",
  "seni-cadas": "menhir_megalitik",
  prasasti: "prasasti_batu",
  candi: "candi_prambanan",
  islam: "masjid_tajug",
  keraton: "joglo_keraton",
  benteng: "benteng_pertahanan",
  kolonial: "monumen_nasional",
  kemerdekaan: "monumen_nasional",
  lanskap: "pura_bali",
};

function getSiteArchetype(site: SiteWithCategory): ModelArchetype {
  if (SITE_ARCHETYPE_MAP[site.slug]) return SITE_ARCHETYPE_MAP[site.slug];
  if (site.category && CATEGORY_DEFAULT_ARCHETYPE[site.category]) {
    return CATEGORY_DEFAULT_ARCHETYPE[site.category];
  }
  return "monumen_nasional";
}

function getEraForStartYear(startYear: number): EraId {
  if (startYear < 400) return "prasejarah";
  if (startYear < 1400) return "hindu_buddha";
  if (startYear < 1800) return "kesultanan_maritim";
  if (startYear < 1945) return "kolonial_kebangkitan";
  return "kemerdekaan_modern";
}

/**
 * Mengubah seluruh koleksi situs SETAPAK menjadi CulturalNode yang siap dikonsumsi peta 3D.
 */
let cachedSetapakNodes: CulturalNode[] | null = null;

export function getSetapakCulturalNodes(): CulturalNode[] {
  if (cachedSetapakNodes) return cachedSetapakNodes;

  cachedSetapakNodes = sites.map((site) => {
    const startYr = siteStart(site.slug);
    const siteEvs = sortedEvents.filter((e) => e.siteSlug === site.slug);
    const firstEv = siteEvs[0];
    const lastEv = siteEvs[siteEvs.length - 1];

    const archetype = getSiteArchetype(site);
    const accentColor = siteColor(site.slug);
    const category = site.category || "candi";
    const cultCategory = CATEGORY_TO_CULTURAL[category] || "arsitektur";

    const flourStart = startYr + (siteEvs.length > 1 ? 50 : 20);
    const flourEnd = lastEv ? Math.max(flourStart + 100, lastEv.sortKey) : flourStart + 200;

    const clusterGroup = site.island;

    const keyTraits: string[] = [];
    if (site.island) keyTraits.push(`Wilayah: ${site.island}`);
    if (site.location) keyTraits.push(site.location);
    if (categoryLabels[category]) keyTraits.push(categoryLabels[category].id);

    return {
      id: site.slug,
      name: site.name,
      island: site.island,
      region: site.location || site.island,
      kabupatenKota: site.location || site.island,
      clusterGroup,
      lat: site.coords.lat,
      lon: site.coords.lng,
      eraId: getEraForStartYear(startYr),
      yearAppeared: startYr,
      flourishingStart: flourStart,
      flourishingEnd: flourEnd,
      category: cultCategory,
      categoryLabel: categoryLabels[category]?.id || category,
      archetype,
      archetypeLabel: archetype.replace(/_/g, " "),
      accentColor,
      originStory: site.summary || firstEv?.title || site.name,
      transitionStory: site.summary || "Situs cagar budaya bernilai sejarah tinggi bagi Nusantara.",
      keyTraitsAndLegacy: keyTraits,
      unescoStatus: UNESCO_SITES.has(site.slug) ? "Warisan Budaya Dunia UNESCO" : "Cagar Budaya Nasional",
    };
  });

  return cachedSetapakNodes;
}

/**
 * Seluruh koleksi CulturalNode dari data SETAPAK (siap dikonsumsi peta 3D)
 */
export const CULTURAL_NODES: CulturalNode[] = getSetapakCulturalNodes();

/**
 * Mengadaptasi daftar PinState aktif (dari PetaClient SETAPAK) ke daftar CulturalNode
 * yang aktif dan disaring sesuai tahun linimasa aktif.
 */
export function adaptPinStatesToCulturalNodes(
  pins: PinState[],
  toYear: number
): {
  activeNodes: CulturalNode[];
  allNodes: CulturalNode[];
  nodeById: Map<string, CulturalNode>;
  pinBySlug: Map<string, PinState>;
} {
  const allNodes = getSetapakCulturalNodes();
  const nodeById = new Map<string, CulturalNode>();
  allNodes.forEach((n) => nodeById.set(n.id, n));

  const pinBySlug = new Map<string, PinState>();
  pins.forEach((p) => pinBySlug.set(p.site.slug, p));

  const activeNodes = pins
    .map((p) => nodeById.get(p.site.slug))
    .filter((n): n is CulturalNode => {
      if (!n) return false;
      return n.yearAppeared <= toYear || pinBySlug.get(n.id)?.exists === true;
    });

  return {
    activeNodes,
    allNodes,
    nodeById,
    pinBySlug,
  };
}
