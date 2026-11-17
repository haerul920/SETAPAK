/**
 * SETAPAK - Perluasan data cagar budaya Nusantara (kurasi tahap 2).
 * Mencakup prasejarah, prasasti, candi, Islam, keraton, benteng, kolonial, kemerdekaan, lanskap budaya.
 *
 * Status:
 * - Sebagian besar entri bersumber Wikipedia atau sumber sekunder sehingga berstatus "perlu-cek".
 *   Jalankan scripts/verify-facts.ts (lihat docs/DATA_EXPANSION.md) untuk mencocokkan tahun dengan teks sumber.
 * - Penetapan UNESCO bersumber whc.unesco.org berstatus "terverifikasi".
 * - Koordinat adalah perkiraan; script import-wikidata.ts wajib mencocokkannya dengan Wikidata (P625).
 * Jangan menambah klaim baru tanpa sumber. Lihat docs/CONTENT_GUIDE.md.
 */
import type { EraId, EventType, Site, Source, SourceStatus, TimelineEvent } from "./timeline";

export type Category =
  | "prasejarah"
  | "seni-cadas"
  | "prasasti"
  | "candi"
  | "islam"
  | "keraton"
  | "benteng"
  | "kolonial"
  | "kemerdekaan"
  | "lanskap";

export const categoryLabels: Record<Category, { id: string; en: string }> = {
  prasejarah: { id: "Prasejarah dan Manusia Purba", en: "Prehistory and Early Humans" },
  "seni-cadas": { id: "Seni Cadas", en: "Rock Art" },
  prasasti: { id: "Prasasti", en: "Inscriptions" },
  candi: { id: "Candi dan Situs Klasik", en: "Temples and Classical Sites" },
  islam: { id: "Masjid dan Makam Islam", en: "Mosques and Islamic Tombs" },
  keraton: { id: "Keraton dan Istana", en: "Palaces" },
  benteng: { id: "Benteng", en: "Forts" },
  kolonial: { id: "Bangunan dan Kota Kolonial", en: "Colonial Buildings and Towns" },
  kemerdekaan: { id: "Pergerakan dan Kemerdekaan", en: "Independence Movement" },
  lanskap: { id: "Lanskap Budaya", en: "Cultural Landscapes" },
};

/** Kategori untuk situs inti di timeline.ts */
export const coreSiteCategory: Record<string, Category> = {
  sangiran: "prasejarah",
  "karst-maros-pangkep": "seni-cadas",
  liyangan: "candi",
  muarajambi: "candi",
  borobudur: "candi",
  prambanan: "candi",
  sambisari: "candi",
  kimpulan: "candi",
  trowulan: "candi",
  "somba-opu": "benteng",
  "fort-rotterdam": "benteng",
  "istana-maimun": "keraton",
  "rumah-maeda": "kemerdekaan",
};

/* ---------------- helper ---------------- */
const wp = (title: string, lang: "en" | "id" = "en"): Source => ({
  id: `wp-${lang}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  title: `Wikipedia (${lang.toUpperCase()}): ${title.replace(/_/g, " ")}`,
  url: `https://${lang}.wikipedia.org/wiki/${title}`,
  kind: "media",
});
const unesco = (no: number, name: string): Source => ({
  id: `unesco-${no}`,
  title: `UNESCO World Heritage Centre: ${name}`,
  url: `https://whc.unesco.org/en/list/${no}`,
  kind: "resmi",
});

export function eraForYear(y: number): EraId {
  if (y < -45000) return "prasejarah";
  if (y < 0) return "seni-cadas";
  if (y < 1250) return "klasik";
  if (y < 1500) return "majapahit";
  if (y < 1700) return "maritim";
  if (y < 1945) return "kolonial";
  if (y < 1950) return "kemerdekaan";
  return "modern";
}

type EvOpts = Partial<Pick<TimelineEvent, "endKey" | "alternatives" | "moment" | "pinLength" | "meta" | "scrollWeight">>;
function ev(
  id: string, siteSlug: string | null, sortKey: number, dateLabel: string, type: EventType,
  title: string, narrative: string, status: SourceStatus, sourceIds: string[], o: EvOpts = {},
): TimelineEvent {
  return { id, era: eraForYear(sortKey), siteSlug, sortKey, dateLabel, dateLabelEn: dateLabel, type, title, narrative, status, sourceIds, ...o };
}

type SiteX = Site & { category: Category };
function site(
  slug: string, name: string, location: string, island: Site["island"], lat: number, lng: number,
  category: Category, kind: string, summary: string,
): SiteX {
  return { slug, name, location, island, coords: { lat, lng }, kind, category, illustration: "PhotoObject", summary, hotspots: [] };
}

/* ---------------- sumber ---------------- */
const S = {
  trinil: wp("Trinil"), soloMan: wp("Solo_Man"), liangBua: wp("Liang_Bua"), floresiensis: wp("Homo_floresiensis"),
  jeriji: wp("Lubang_Jeriji_Saléh"), padang: wp("Gunung_Padang"),
  mulawarman: wp("Kutai"), ciaruteun: wp("Ciaruteun_inscription"), batujaya: wp("Batujaya"),
  dieng: wp("Dieng_temples"), kedukan: wp("Kedukan_Bukit_inscription"), talangtuo: wp("Talang_Tuwo_inscription"),
  kotakapur: wp("Kota_Kapur_inscription"), kalasan: wp("Kalasan"), sewu: wp("Sewu"), ratuboko: wp("Ratu_Boko"),
  mendut: wp("Mendut"), plaosan: wp("Plaosan"), cangkuang: wp("Cangkuang"), blanjong: wp("Belanjong_pillar"),
  goagajah: wp("Goa_Gajah"), gunungkawi: wp("Gunung_Kawi"), subak: unesco(1194, "Cultural Landscape of Bali Province: the Subak System"),
  subakWp: wp("Subak_(irrigation)"), leran: wp("Fatimah_binti_Maimun", "id"), pasai: wp("Malik_ul_Salih"),
  singosari: wp("Singhasari_temple"), prajna: wp("Prajnaparamita_of_Java"), penataran: wp("Penataran"),
  sukuh: wp("Sukuh"), cetho: wp("Cetho"), muaratakus: wp("Muara_Takus"), bahal: wp("Bahal_temple"),
  wapauwe: wp("Masjid_Wapauwe", "id"), demak: wp("Great_Mosque_of_Demak"), kudus: wp("Menara_Kudus_Mosque"),
  banten: wp("Great_Mosque_of_Banten"), surosowan: wp("Surosowan", "id"), baiturrahman: wp("Baiturrahman_Grand_Mosque"),
  pltd: wp("PLTD_Apung", "id"), kasepuhan: wp("Kraton_Kasepuhan"), batavia: wp("Batavia,_Dutch_East_Indies"),
  fatahillah: wp("Jakarta_History_Museum"), victoria: wp("Fort_Victoria_(Ambon)"), oranje: wp("Fort_Oranje_(Ternate)"),
  belgica: wp("Fort_Belgica"), banda: wp("Banda_Neira"), buton: wp("Benteng_Keraton_Buton", "id"),
  katangka: wp("Katangka_Mosque"), gowa: wp("Sultanate_of_Gowa"), surakarta: wp("Keraton_Surakarta_Hadiningrat", "id"),
  kratonYk: wp("Kraton_Ngayogyakarta_Hadiningrat"), giyanti: wp("Treaty_of_Giyanti"),
  sumbu: unesco(1671, "The Cosmological Axis of Yogyakarta and its Historic Landmarks"), tugu: wp("Tugu_Yogyakarta"),
  tamansari: wp("Taman_Sari_(Yogyakarta)"), kotagede: wp("Kotagede"), pagaruyung: wp("Pagaruyung_Palace"),
  bogor: wp("Bogor_Palace"), kebunraya: wp("Bogor_Botanical_Gardens"), marlborough: wp("Fort_Marlborough"),
  traktat: wp("Anglo-Dutch_Treaty_of_1824"), kadriah: wp("Keraton_Kadriah", "id"), duurstede: wp("Fort_Duurstede"),
  pattimura: wp("Pattimura"), siak: wp("Siak_Sri_Indrapura_Palace"), syarifkasim: wp("Sultan_Syarif_Kasim_II"),
  penyengat: wp("Masjid_Raya_Sultan_Riau", "id"), ombilin: unesco(1610, "Ombilin Coal Mining Heritage of Sawahlunto"),
  ombilinWp: wp("Ombilin_Coal_Mine"), lawangsewu: wp("Lawang_Sewu"),
  semarang: wp("Battle_of_Semarang"), gedungsate: wp("Gedung_Sate"), merdeka: wp("Gedung_Merdeka"),
  kaa: wp("Asian–African_Conference"), jamgadang: wp("Jam_Gadang"), sumpah: wp("Youth_Pledge"),
  museumSumpah: wp("Museum_Sumpah_Pemuda", "id"), ende: wp("Rumah_Pengasingan_Bung_Karno", "id"),
  majapahitHotel: wp("Hotel_Majapahit"), surabaya: wp("Battle_of_Surabaya"), tugupahlawan: wp("Tugu_Pahlawan"),
  proklamasi: wp("Proclamation_of_Indonesian_Independence"), tuguProk: wp("Tugu_Proklamasi", "id"),
  monas: wp("National_Monument_(Indonesia)"),
  // sumber kedua hasil verifikasi fakta (docs/FACT_CHECK.md)
  pseudodon: wp("Pseudodon_shell_DUB1006-fL"), javaMan: wp("Java_Man"), hatta: wp("Mohammad_Hatta"),
  kasepuhanId: wp("Keraton_Kasepuhan", "id"), siakId: wp("Syarif_Kasim_II_dari_Siak", "id"),
  gedungsateId: wp("Gedung_Sate", "id"), cangkuangId: wp("Candi_Cangkuang", "id"), cethoId: wp("Candi_Ceto", "id"),
  masjidMedan: wp("Grand_Mosque_of_Medan"),
};

export const extraSources: Source[] = Object.values(S);
const id = (s: Source) => s.id;

/* ---------------- situs ---------------- */
export const extraSites: SiteX[] = [
  site("trinil", "Situs Trinil", "Kedungpalang, Ngawi, Jawa Timur", "Jawa", -7.374, 111.356, "prasejarah", "Situs manusia purba", "Tepi Bengawan Solo tempat Eugène Dubois menemukan fosil yang ia namai Pithecanthropus erectus."),
  site("ngandong", "Situs Ngandong", "Blora, Jawa Tengah", "Jawa", -7.20, 111.43, "prasejarah", "Situs manusia purba", "Teras Bengawan Solo yang menyimpan tengkorak Homo erectus termuda yang diketahui (Manusia Solo)."),
  site("liang-bua", "Liang Bua", "Manggarai, Flores, NTT", "Bali-Nusa Tenggara", -8.534, 120.461, "prasejarah", "Gua hunian manusia purba", "Gua kapur di Flores tempat ditemukannya Homo floresiensis."),
  site("lubang-jeriji-saleh", "Lubang Jeriji Saléh", "Sangkulirang-Mangkalihat, Kalimantan Timur", "Kalimantan", 1.0, 117.9, "seni-cadas", "Gua seni cadas", "Gua di karst Kalimantan Timur dengan lukisan figuratif hewan dan cap tangan prasejarah."),
  site("gunung-padang", "Situs Gunung Padang", "Karyamukti, Cianjur, Jawa Barat", "Jawa", -6.993, 107.056, "prasejarah", "Situs megalitik punden berundak", "Susunan batu kolom andesit berteras di puncak bukit, salah satu situs megalitik terbesar di Asia Tenggara."),
  site("yupa-kutai", "Prasasti Yupa Kutai", "Muara Kaman, Kutai Kartanegara, Kalimantan Timur", "Kalimantan", -0.20, 116.73, "prasasti", "Prasasti", "Tujuh tiang batu bertulis dari masa Raja Mulawarman, prasasti tertua yang diketahui di Indonesia."),
  site("ciaruteun", "Prasasti Ciaruteun", "Ciampea, Bogor, Jawa Barat", "Jawa", -6.53, 106.69, "prasasti", "Prasasti", "Batu bertulis Tarumanagara dengan pahatan sepasang telapak kaki Raja Purnawarman."),
  site("batujaya", "Kompleks Percandian Batujaya", "Karawang, Jawa Barat", "Jawa", -6.05, 107.15, "candi", "Kompleks candi bata", "Puluhan sisa bangunan bata di pesisir utara Jawa Barat, termasuk Candi Jiwa dan Candi Blandongan."),
  site("dieng", "Kompleks Candi Dieng", "Banjarnegara, Jawa Tengah", "Jawa", -7.205, 109.907, "candi", "Candi Hindu", "Candi-candi Hindu di dataran tinggi vulkanik, termasuk kelompok Candi Arjuna."),
  site("sriwijaya-palembang", "Situs Sriwijaya di Palembang", "Palembang, Sumatera Selatan", "Sumatra", -2.99, 104.73, "prasasti", "Prasasti dan situs kerajaan", "Kawasan temuan prasasti Kedukan Bukit, Talang Tuo, dan Bukit Siguntang yang berkaitan dengan Sriwijaya."),
  site("kota-kapur", "Prasasti Kota Kapur", "Mendo Barat, Bangka", "Sumatra", -2.15, 105.85, "prasasti", "Prasasti", "Prasasti Sriwijaya di Pulau Bangka berisi kutukan bagi yang tidak setia."),
  site("kalasan", "Candi Kalasan", "Kalasan, Sleman, DIY", "Jawa", -7.767, 110.472, "candi", "Candi Buddha", "Candi untuk Dewi Tara, salah satu candi Buddha tertua di Jawa Tengah bagian selatan."),
  site("sewu", "Candi Sewu", "Klaten, Jawa Tengah", "Jawa", -7.744, 110.493, "candi", "Kompleks candi Buddha", "Kompleks candi Buddha terbesar kedua di Indonesia setelah Borobudur, di utara Prambanan."),
  site("ratu-boko", "Situs Ratu Boko", "Prambanan, Sleman, DIY", "Jawa", -7.770, 110.489, "candi", "Situs istana atau wihara", "Kompleks di atas bukit dengan gapura, pendopo, kolam, dan gua."),
  site("mendut", "Candi Mendut", "Mungkid, Magelang, Jawa Tengah", "Jawa", -7.605, 110.230, "candi", "Candi Buddha", "Candi Buddha dengan arca Buddha duduk besar, satu garis dengan Pawon dan Borobudur."),
  site("plaosan", "Candi Plaosan", "Klaten, Jawa Tengah", "Jawa", -7.740, 110.504, "candi", "Kompleks candi Buddha", "Kompleks candi kembar Plaosan Lor dan Plaosan Kidul."),
  site("cangkuang", "Candi Cangkuang", "Leles, Garut, Jawa Barat", "Jawa", -7.103, 107.919, "candi", "Candi Hindu", "Candi Hindu di pulau kecil di tengah Situ Cangkuang, bersebelahan dengan makam Islam."),
  site("blanjong", "Prasasti Blanjong", "Sanur, Denpasar, Bali", "Bali-Nusa Tenggara", -8.692, 115.262, "prasasti", "Prasasti", "Pilar batu bertulis dari masa Sri Kesari Warmadewa."),
  site("goa-gajah", "Goa Gajah", "Bedulu, Gianyar, Bali", "Bali-Nusa Tenggara", -8.523, 115.287, "candi", "Gua pertapaan dan petirtaan", "Gua pertapaan berpahat dengan petirtaan kuno di depannya."),
  site("gunung-kawi", "Candi Gunung Kawi", "Tampaksiring, Gianyar, Bali", "Bali-Nusa Tenggara", -8.423, 115.312, "candi", "Candi tebing", "Deretan candi yang dipahat langsung di tebing lembah Sungai Pakerisan."),
  site("subak", "Lanskap Budaya Subak Bali", "Jatiluwih, Tabanan dan kawasan lain, Bali", "Bali-Nusa Tenggara", -8.37, 115.13, "lanskap", "Lanskap budaya, Warisan Dunia UNESCO", "Sistem irigasi sawah bertingkat berbasis filosofi Tri Hita Karana."),
  site("leran", "Makam Fatimah binti Maimun", "Leran, Manyar, Gresik, Jawa Timur", "Jawa", -7.11, 112.60, "islam", "Makam Islam", "Makam dengan nisan bertulisan Arab yang termasuk bukti Islam tertua di Nusantara."),
  site("samudera-pasai", "Makam Sultan Malik as-Saleh", "Samudera, Aceh Utara", "Sumatra", 5.18, 97.25, "islam", "Makam raja Islam", "Makam pendiri Kesultanan Samudera Pasai."),
  site("singosari", "Candi Singosari", "Singosari, Malang, Jawa Timur", "Jawa", -7.888, 112.664, "candi", "Candi Hindu-Buddha", "Candi pendharmaan yang dikaitkan dengan Raja Kertanegara dari Singhasari."),
  site("penataran", "Candi Penataran", "Nglegok, Blitar, Jawa Timur", "Jawa", -8.016, 112.209, "candi", "Kompleks candi Hindu", "Kompleks candi terbesar di Jawa Timur yang dibangun bertahap dari masa Kediri hingga Majapahit."),
  site("sukuh", "Candi Sukuh", "Ngargoyoso, Karanganyar, Jawa Tengah", "Jawa", -7.627, 111.131, "candi", "Candi Hindu akhir Majapahit", "Candi berbentuk piramida terpancung di lereng Gunung Lawu."),
  site("cetho", "Candi Cetho", "Jenawi, Karanganyar, Jawa Tengah", "Jawa", -7.595, 111.157, "candi", "Candi Hindu akhir Majapahit", "Candi berteras di lereng Gunung Lawu, masih dipakai untuk peribadatan."),
  site("muara-takus", "Candi Muara Takus", "XIII Koto Kampar, Riau", "Sumatra", 0.336, 100.643, "candi", "Kompleks candi Buddha", "Kompleks candi bata dan batu pasir di tepi Sungai Kampar."),
  site("padang-lawas", "Candi Bahal (Padang Lawas)", "Portibi, Padang Lawas Utara, Sumatera Utara", "Sumatra", 1.42, 99.69, "candi", "Kompleks candi Buddha", "Candi-candi bata di dataran Padang Lawas yang disebut biaro oleh warga."),
  site("wapauwe", "Masjid Wapauwe", "Kaitetu, Maluku Tengah", "Maluku-Papua", -3.57, 128.08, "islam", "Masjid kuno", "Masjid beratap rumbia yang sering disebut sebagai salah satu masjid tertua di Indonesia."),
  site("demak", "Masjid Agung Demak", "Demak, Jawa Tengah", "Jawa", -6.894, 110.637, "islam", "Masjid kuno", "Masjid dengan empat saka guru yang dikaitkan dengan Wali Songo."),
  site("menara-kudus", "Masjid Menara Kudus", "Kudus, Jawa Tengah", "Jawa", -6.804, 110.832, "islam", "Masjid kuno", "Masjid dengan menara bata bergaya candi yang didirikan Sunan Kudus."),
  site("banten-lama", "Kawasan Banten Lama", "Kasemen, Serang, Banten", "Jawa", -6.036, 106.153, "islam", "Masjid dan reruntuhan keraton", "Masjid Agung Banten dan reruntuhan Keraton Surosowan, pusat Kesultanan Banten."),
  site("baiturrahman", "Masjid Raya Baiturrahman", "Banda Aceh", "Sumatra", 5.553, 95.317, "islam", "Masjid raya", "Masjid raya Aceh yang pernah dibakar, dibangun ulang, dan selamat dari tsunami 2004."),
  site("pltd-apung", "Kapal PLTD Apung", "Punge Blang Cut, Banda Aceh", "Sumatra", 5.537, 95.312, "lanskap", "Monumen tsunami", "Kapal pembangkit listrik yang terseret tsunami ke tengah permukiman."),
  site("kasepuhan", "Keraton Kasepuhan", "Cirebon, Jawa Barat", "Jawa", -6.726, 108.570, "keraton", "Keraton", "Keraton tertua di Cirebon dengan perpaduan unsur Jawa, Islam, Tionghoa, dan Eropa."),
  site("kota-tua-jakarta", "Kota Tua Jakarta", "Taman Sari, Jakarta Barat", "Jawa", -6.135, 106.813, "kolonial", "Kawasan kota kolonial", "Bekas pusat kota Batavia dengan Stadhuis yang kini menjadi Museum Sejarah Jakarta."),
  site("benteng-victoria", "Benteng Victoria", "Ambon, Maluku", "Maluku-Papua", -3.693, 128.181, "benteng", "Benteng", "Benteng Portugis yang direbut VOC dan menjadi pusat kekuasaan di Ambon."),
  site("benteng-oranje", "Benteng Oranje", "Ternate, Maluku Utara", "Maluku-Papua", 0.79, 127.38, "benteng", "Benteng", "Benteng VOC di Ternate yang pernah menjadi pusat pemerintahan VOC sebelum Batavia."),
  site("banda-neira", "Banda Neira dan Benteng Belgica", "Banda, Maluku Tengah", "Maluku-Papua", -4.527, 129.897, "benteng", "Benteng dan kota pala", "Pulau pala dengan Benteng Belgica berbentuk segi lima dan rumah-rumah pengasingan tokoh pergerakan."),
  site("benteng-buton", "Benteng Keraton Buton", "Baubau, Sulawesi Tenggara", "Sulawesi", -5.47, 122.60, "benteng", "Benteng keraton", "Benteng batu kapur yang melingkari pusat Kesultanan Buton di atas bukit Wolio."),
  site("katangka", "Masjid Tua Katangka", "Somba Opu, Gowa, Sulawesi Selatan", "Sulawesi", -5.205, 119.44, "islam", "Masjid kuno", "Masjid tertua di Sulawesi Selatan, dekat kompleks makam raja-raja Gowa."),
  site("keraton-surakarta", "Keraton Surakarta Hadiningrat", "Surakarta, Jawa Tengah", "Jawa", -7.578, 110.828, "keraton", "Keraton", "Keraton Kasunanan yang didirikan setelah perpindahan dari Kartasura."),
  site("keraton-yogyakarta", "Keraton Yogyakarta dan Sumbu Filosofi", "Yogyakarta", "Jawa", -7.805, 110.364, "keraton", "Keraton, Warisan Dunia UNESCO", "Keraton Kasultanan dan garis imajiner Tugu, Keraton, Panggung Krapyak."),
  site("taman-sari", "Taman Sari Yogyakarta", "Kraton, Yogyakarta", "Jawa", -7.810, 110.359, "keraton", "Taman istana", "Taman dan pesanggrahan Sultan dengan kolam, lorong bawah tanah, dan masjid bawah tanah."),
  site("kotagede", "Kotagede", "Yogyakarta", "Jawa", -7.828, 110.399, "islam", "Kota lama Mataram Islam", "Bekas pusat awal Mataram Islam dengan Masjid Gedhe dan makam raja."),
  site("pagaruyung", "Istano Basa Pagaruyung", "Tanjung Emas, Tanah Datar, Sumatera Barat", "Sumatra", -0.47, 100.62, "keraton", "Istana adat Minangkabau", "Replika istana Kerajaan Pagaruyung bergaya rumah gadang."),
  site("istana-bogor", "Istana dan Kebun Raya Bogor", "Bogor, Jawa Barat", "Jawa", -6.598, 106.797, "kolonial", "Istana dan kebun raya", "Istana Buitenzorg dan kebun raya di sampingnya."),
  site("benteng-marlborough", "Benteng Marlborough", "Bengkulu", "Sumatra", -3.787, 102.251, "benteng", "Benteng Inggris", "Benteng East India Company Inggris di pesisir barat Sumatra."),
  site("istana-kadriah", "Istana Kadriah", "Pontianak, Kalimantan Barat", "Kalimantan", -0.03, 109.35, "keraton", "Istana kesultanan", "Istana Kesultanan Pontianak di pertemuan Sungai Kapuas dan Landak."),
  site("benteng-duurstede", "Benteng Duurstede", "Saparua, Maluku Tengah", "Maluku-Papua", -3.578, 128.66, "benteng", "Benteng", "Benteng di Saparua yang direbut pasukan Kapitan Pattimura."),
  site("istana-siak", "Istana Siak Sri Indrapura", "Siak, Riau", "Sumatra", 0.796, 102.05, "keraton", "Istana kesultanan", "Istana Asserayah Hasyimiah, pusat Kesultanan Siak."),
  site("penyengat", "Masjid Raya Sultan Riau, Pulau Penyengat", "Tanjungpinang, Kepulauan Riau", "Sumatra", 0.93, 104.42, "islam", "Masjid", "Masjid kuning di Pulau Penyengat, pusat Kesultanan Riau-Lingga."),
  site("ombilin", "Warisan Tambang Batubara Ombilin", "Sawahlunto, Sumatera Barat", "Sumatra", -0.68, 100.78, "lanskap", "Warisan industri, Warisan Dunia UNESCO", "Tambang, jalur kereta, dan pelabuhan batubara dari masa kolonial."),
  site("lawang-sewu", "Lawang Sewu", "Semarang, Jawa Tengah", "Jawa", -6.984, 110.410, "kolonial", "Gedung kolonial", "Bekas kantor pusat perusahaan kereta api Nederlandsch-Indische Spoorweg Maatschappij."),
  site("gedung-sate", "Gedung Sate", "Bandung, Jawa Barat", "Jawa", -6.902, 107.619, "kolonial", "Gedung kolonial", "Gedung Gouvernements Bedrijven dengan ornamen tusuk sate di puncaknya."),
  site("gedung-merdeka", "Gedung Merdeka", "Bandung, Jawa Barat", "Jawa", -6.921, 107.609, "kemerdekaan", "Gedung bersejarah", "Bekas Societeit Concordia, tempat Konferensi Asia Afrika 1955."),
  site("jam-gadang", "Jam Gadang", "Bukittinggi, Sumatera Barat", "Sumatra", 0.305, 100.369, "kolonial", "Menara jam", "Menara jam ikon Bukittinggi yang atapnya beberapa kali berganti bentuk."),
  site("gedung-sumpah-pemuda", "Gedung Sumpah Pemuda", "Jl. Kramat Raya 106, Jakarta Pusat", "Jawa", -6.183, 106.843, "kemerdekaan", "Gedung bersejarah", "Rumah pondokan pelajar tempat Kongres Pemuda II merumuskan Sumpah Pemuda."),
  site("pengasingan-bung-karno", "Rumah Pengasingan Bung Karno", "Ende (NTT) dan Bengkulu", "Bali-Nusa Tenggara", -8.84, 121.66, "kemerdekaan", "Rumah bersejarah", "Rumah tempat Sukarno menjalani pengasingan di Ende dan kemudian di Bengkulu."),
  site("hotel-majapahit", "Hotel Majapahit (Hotel Yamato)", "Jl. Tunjungan, Surabaya", "Jawa", -7.260, 112.739, "kemerdekaan", "Hotel bersejarah", "Hotel tempat insiden perobekan bendera pada September 1945."),
  site("tugu-pahlawan", "Tugu Pahlawan", "Surabaya, Jawa Timur", "Jawa", -7.246, 112.738, "kemerdekaan", "Monumen", "Monumen peringatan Pertempuran Surabaya 10 November 1945."),
  site("tugu-proklamasi", "Tugu Proklamasi (Pegangsaan Timur 56)", "Menteng, Jakarta Pusat", "Jawa", -6.202, 106.845, "kemerdekaan", "Monumen", "Lokasi rumah tempat teks proklamasi dibacakan pada 17 Agustus 1945."),
  site("monas", "Monumen Nasional", "Gambir, Jakarta Pusat", "Jawa", -6.175, 106.827, "kemerdekaan", "Monumen", "Tugu setinggi 132 meter di Lapangan Merdeka."),
];

/* ---------------- peristiwa ---------------- */
export const extraEvents: TimelineEvent[] = [
  // Prasejarah
  ev("ev-trinil-cangkang", "trinil", -497974, "± 540.000 - 430.000 tahun lalu", "digunakan", "Goresan zig-zag pada cangkang kerang", "Cangkang kerang air tawar dari koleksi Trinil memiliki goresan geometris yang diduga dibuat Homo erectus.", "perlu-cek", [id(S.trinil), id(S.pseudodon)]),
  ev("ev-ngandong-hidup", "ngandong", -110474, "117.000 - 108.000 tahun lalu", "digunakan", "Homo erectus terakhir di Ngandong", "Penanggalan menunjukkan Homo erectus di Ngandong hidup sekitar 117.000 hingga 108.000 tahun lalu.", "perlu-cek", [id(S.soloMan)]),
  ev("ev-liangbua-hidup", "liang-bua", -77974, "± 100.000 - 60.000 tahun lalu", "digunakan", "Homo floresiensis di Liang Bua", "Sisa kerangka Homo floresiensis di Liang Bua berumur sekitar 100.000 hingga 60.000 tahun.", "perlu-cek", [id(S.floresiensis), id(S.liangBua)]),
  ev("ev-jeriji-lukis", "lubang-jeriji-saleh", -37974, "≥ 40.000 tahun lalu", "dibangun", "Lukisan banteng di Kalimantan", "Lukisan hewan mirip banteng di Lubang Jeriji Saléh berusia minimal 40.000 tahun.", "perlu-cek", [id(S.jeriji)]),

  // Prasasti dan klasik awal
  ev("ev-yupa-mulawarman", "yupa-kutai", 400, "± abad ke-4 - 5", "dibangun", "Yupa Raja Mulawarman", "Tujuh yupa berbahasa Sanskerta dan beraksara Pallawa mencatat kedermawanan Raja Mulawarman.", "perlu-cek", [id(S.mulawarman)], { alternatives: ["Penanggalan berdasarkan bentuk aksara, sebagian ahli menyebut abad ke-4, sebagian abad ke-5."] }),
  ev("ev-ciaruteun-purnawarman", "ciaruteun", 450, "Abad ke-5", "dibangun", "Telapak kaki Purnawarman", "Prasasti Ciaruteun memuat pahatan telapak kaki yang disamakan dengan kaki Dewa Wisnu.", "perlu-cek", [id(S.ciaruteun)]),
  ev("ev-batujaya-bata", "batujaya", 600, "± abad ke-5 - 10", "dibangun", "Stupa bata Batujaya", "Bangunan-bangunan bata Buddha didirikan di dataran pesisir Karawang.", "perlu-cek", [id(S.batujaya)], { endKey: 1000 }),
  ev("ev-dieng-arjuna", "dieng", 700, "± abad ke-7 - 8", "dibangun", "Candi-candi Dieng berdiri", "Kelompok Candi Arjuna di Dieng termasuk candi tertua yang masih berdiri di Jawa.", "perlu-cek", [id(S.dieng)]),
  ev("ev-kedukan-682", "sriwijaya-palembang", 682.46, "16 Juni 682", "peristiwa", "Prasasti Kedukan Bukit", "Prasasti mencatat perjalanan suci Dapunta Hyang dengan ribuan pasukan, bukti tertulis tertua tentang Sriwijaya.", "diperdebatkan", [id(S.kedukan)], { alternatives: ["Wikipedia (en) menyebut prasasti ini bertarikh 1 Mei 683 M, bukan 16 Juni 682."] }),
  ev("ev-talangtuo-684", "sriwijaya-palembang", 684.22, "23 Maret 684", "peristiwa", "Prasasti Talang Tuo", "Prasasti mencatat pembangunan Taman Sriksetra untuk kemakmuran semua makhluk.", "perlu-cek", [id(S.talangtuo)]),
  ev("ev-kotakapur-686", "kota-kapur", 686.16, "686", "peristiwa", "Prasasti Kota Kapur", "Prasasti Sriwijaya di Bangka memuat kutukan bagi yang memberontak.", "perlu-cek", [id(S.kotakapur)]),
  ev("ev-cangkuang-bangun", "cangkuang", 750, "± abad ke-8", "dibangun", "Candi Cangkuang didirikan", "Candi Hindu kecil didirikan di tepi danau di lembah Garut.", "perlu-cek", [id(S.cangkuang)]),
  ev("ev-kalasan-778", "kalasan", 778, "778", "dibangun", "Prasasti Kalasan dan candi Tara", "Prasasti Kalasan mencatat pendirian bangunan suci untuk Dewi Tara pada masa Rakai Panangkaran.", "perlu-cek", [id(S.kalasan)]),
  ev("ev-sewu-792", "sewu", 792, "792", "dibangun", "Manjusrigrha diperluas", "Prasasti Manjusrigrha menyebut penyempurnaan kompleks yang kini dikenal sebagai Candi Sewu.", "perlu-cek", [id(S.sewu)]),
  ev("ev-ratuboko-792", "ratu-boko", 792.5, "792", "dibangun", "Abhayagiri Wihara", "Prasasti Abhayagiri Wihara mengaitkan situs di bukit Boko dengan Rakai Panangkaran.", "perlu-cek", [id(S.ratuboko)]),
  ev("ev-mendut-bangun", "mendut", 824.5, "Abad ke-9", "dibangun", "Candi Mendut didirikan", "Candi Mendut didirikan pada masa Syailendra, segaris dengan Pawon dan Borobudur.", "perlu-cek", [id(S.mendut)]),
  ev("ev-plaosan-bangun", "plaosan", 850.2, "Abad ke-9", "dibangun", "Candi Plaosan didirikan", "Kompleks Plaosan dibangun pada masa Rakai Pikatan dan Sri Kahulunan.", "perlu-cek", [id(S.plaosan)]),
  ev("ev-subak-abad9", "subak", 880, "± abad ke-9", "digunakan", "Sistem subak berkembang", "Pengelolaan air sawah bersama melalui pura dan subak berkembang di Bali.", "terverifikasi", [id(S.subak), id(S.subakWp)]),
  ev("ev-blanjong-914", "blanjong", 914, "914", "peristiwa", "Prasasti Blanjong", "Pilar batu di Sanur mencatat kemenangan Sri Kesari Warmadewa.", "perlu-cek", [id(S.blanjong)]),
  ev("ev-goagajah-bangun", "goa-gajah", 1050.1, "± abad ke-11", "dibangun", "Goa Gajah dipahat", "Gua pertapaan dengan pintu berwajah raksasa dipahat di tebing Bedulu.", "perlu-cek", [id(S.goagajah)]),
  ev("ev-gunungkawi-bangun", "gunung-kawi", 1075, "Abad ke-11", "dibangun", "Candi tebing Gunung Kawi", "Deretan candi dipahat di tebing Pakerisan, dikaitkan dengan masa Raja Anak Wungsu.", "perlu-cek", [id(S.gunungkawi)]),
  ev("ev-muaratakus-bangun", "muara-takus", 1050.2, "Diperdebatkan", "dibangun", "Candi Muara Takus didirikan", "Kompleks candi Buddha didirikan di tepi Sungai Kampar.", "diperdebatkan", [id(S.muaratakus)], { alternatives: ["Para ahli berbeda pendapat antara abad ke-4, ke-7, hingga ke-11 sampai ke-12."] }),
  ev("ev-leran-1082", "leran", 1082, "1082 (475 H)", "peristiwa", "Nisan Fatimah binti Maimun", "Nisan berangka tahun 475 Hijriah menjadi salah satu bukti tertua kehadiran Islam di Jawa.", "perlu-cek", [id(S.leran)]),
  ev("ev-penataran-1197", "penataran", 1197, "1197", "dibangun", "Awal Candi Penataran", "Prasasti Palah dari masa Kediri menandai awal kompleks yang terus diperluas hingga masa Majapahit.", "perlu-cek", [id(S.penataran)], { endKey: 1454 }),
  ev("ev-bahal-bangun", "padang-lawas", 1201, "± abad ke-11 - 14", "dibangun", "Biaro-biaro Padang Lawas", "Candi-candi bata Buddha didirikan di dataran Padang Lawas.", "perlu-cek", [id(S.bahal)], { endKey: 1400 }),

  // Majapahit dan awal Islam
  ev("ev-pasai-1297", "samudera-pasai", 1297, "1297", "peristiwa", "Wafatnya Sultan Malik as-Saleh", "Nisan Sultan Malik as-Saleh berangka tahun 696 Hijriah.", "perlu-cek", [id(S.pasai)]),
  ev("ev-singosari-bangun", "singosari", 1300, "± awal abad ke-14", "dibangun", "Candi Singosari didirikan", "Candi pendharmaan didirikan untuk memuliakan Raja Kertanegara yang wafat pada 1292.", "perlu-cek", [id(S.singosari)]),
  ev("ev-wapauwe-1414", "wapauwe", 1414, "1414 (diperdebatkan)", "dibangun", "Masjid Wapauwe didirikan", "Menurut tradisi setempat masjid ini didirikan pada 1414.", "diperdebatkan", [id(S.wapauwe)], { alternatives: ["Tahun pendirian berdasar tradisi lisan dan catatan lokal, belum dipastikan secara arkeologis."] }),
  ev("ev-sukuh-1437", "sukuh", 1437, "1437", "dibangun", "Candi Sukuh didirikan", "Candrasengkala di gapura menunjuk tahun 1359 Saka atau 1437 Masehi.", "perlu-cek", [id(S.sukuh)]),
  ev("ev-cetho-bangun", "cetho", 1460, "Abad ke-15", "dibangun", "Candi Cetho didirikan", "Candi berteras dibangun di lereng Lawu pada akhir masa Majapahit.", "perlu-cek", [id(S.cetho)]),
  ev("ev-demak-1479", "demak", 1479, "1479", "dibangun", "Masjid Agung Demak", "Candrasengkala Naga Mulat Salira Wani pada masjid ditafsirkan sebagai tahun 1479.", "diperdebatkan", [id(S.demak)], { alternatives: ["Sebagian sumber menyebut 1466 atau 1477."] }),

  // Kesultanan maritim
  ev("ev-kasepuhan-1529", "kasepuhan", 1529, "1529", "dibangun", "Keraton Kasepuhan", "Keraton Kasepuhan dibangun sebagai perluasan Dalem Agung Pakungwati.", "diperdebatkan", [id(S.kasepuhan), id(S.kasepuhanId)], { alternatives: ["Wikipedia (en) menyebut keraton ini dibangun pada 1447.", "Wikipedia (id) menyebut Dalem Agung Pakungwati didirikan pada 1430 dan kompleks keraton Pakungwati, yang kini disebut Keraton Kasepuhan, pada 1529."] }),
  ev("ev-kudus-1549", "menara-kudus", 1549, "1549", "dibangun", "Masjid Menara Kudus", "Sunan Kudus mendirikan masjid yang menaranya menyerupai candi bata Jawa Timur.", "perlu-cek", [id(S.kudus)]),
  ev("ev-banten-masjid", "banten-lama", 1560, "Abad ke-16", "dibangun", "Masjid Agung Banten", "Masjid berlanggam atap tumpang lima didirikan pada masa awal Kesultanan Banten.", "perlu-cek", [id(S.banten)]),
  ev("ev-victoria-1575", "benteng-victoria", 1575, "1575", "dibangun", "Benteng Portugis di Ambon", "Portugis membangun benteng di Ambon.", "perlu-cek", [id(S.victoria)]),
  ev("ev-kotagede-mataram", "kotagede", 1585, "Akhir abad ke-16", "dibangun", "Kotagede pusat Mataram", "Kotagede berkembang menjadi pusat awal Kesultanan Mataram pada masa Panembahan Senopati.", "perlu-cek", [id(S.kotagede)]),
  ev("ev-katangka-1603", "katangka", 1603, "1603 (diperdebatkan)", "dibangun", "Masjid Tua Katangka", "Masjid Katangka disebut didirikan pada awal abad ke-17 pada masa Sultan Alauddin.", "diperdebatkan", [id(S.katangka)]),
  ev("ev-victoria-1605", "benteng-victoria", 1605, "1605", "peristiwa", "VOC merebut benteng Ambon", "VOC mengambil alih benteng Portugis dan menamainya Victoria.", "perlu-cek", [id(S.victoria)]),
  ev("ev-gowa-islam-1605", "katangka", 1605.72, "1605", "peristiwa", "Gowa-Tallo memeluk Islam", "Raja Gowa dan Tallo memeluk Islam, membuka babak baru Kesultanan Gowa.", "perlu-cek", [id(S.gowa)]),
  ev("ev-oranje-1607", "benteng-oranje", 1607, "1607", "dibangun", "Benteng Oranje dibangun", "Cornelis Matelief de Jonge membangun benteng VOC di Ternate.", "perlu-cek", [id(S.oranje)]),
  ev("ev-belgica-1611", "banda-neira", 1611, "1611", "dibangun", "Benteng Belgica dibangun", "VOC membangun benteng di atas bukit Banda Neira untuk menguasai perdagangan pala.", "perlu-cek", [id(S.belgica)]),
  ev("ev-baiturrahman-1612", "baiturrahman", 1612, "1612 (diperdebatkan)", "dibangun", "Masjid Raya Baiturrahman awal", "Masjid raya Aceh dikaitkan dengan masa Sultan Iskandar Muda.", "diperdebatkan", [id(S.baiturrahman)], { alternatives: ["Ada pendapat yang menyebut masjid lebih tua, dari abad ke-13."] }),
  ev("ev-batavia-1619", "kota-tua-jakarta", 1619.41, "30 Mei 1619", "peristiwa", "Batavia didirikan", "Jan Pieterszoon Coen menghancurkan Jayakarta dan mendirikan Batavia di atas reruntuhannya.", "perlu-cek", [id(S.batavia)]),
  ev("ev-banda-1621", "banda-neira", 1621, "1621", "peristiwa", "Penaklukan Banda", "VOC menaklukkan Kepulauan Banda. Sebagian besar penduduk asli tewas, diperbudak, atau terusir demi monopoli pala.", "perlu-cek", [id(S.banda)]),
  ev("ev-buton-1634", "benteng-buton", 1634, "Selesai 1634 (diperdebatkan)", "dibangun", "Benteng Keraton Buton", "Benteng batu yang melingkari keraton Wolio disebut rampung pada 1634, sementara sumber lain mencatat pembangunannya sejak abad ke-16.", "diperdebatkan", [id(S.buton)], { alternatives: ["Wikipedia (id) menyebut benteng dibangun pada abad ke-16 oleh Sultan Buton III (1591 sampai 1596), dijadikan bangunan permanen pada masa Sultan Buton IV, dan benteng keraton didirikan pada 1613."] }),
  ev("ev-duurstede-1676", "benteng-duurstede", 1676, "1676", "dibangun", "Benteng Duurstede", "Benteng Duurstede didirikan di pesisir Saparua.", "perlu-cek", [id(S.duurstede)]),

  // Kolonial
  ev("ev-stadhuis-1707", "kota-tua-jakarta", 1707, "1707 - 1710", "dibangun", "Stadhuis Batavia", "Balai kota Batavia dibangun pada masa Gubernur Jenderal Joan van Hoorn.", "perlu-cek", [id(S.fatahillah)], { endKey: 1710 }),
  ev("ev-marlborough-1714", "benteng-marlborough", 1714, "1714 - 1719", "dibangun", "Benteng Marlborough", "East India Company Inggris membangun benteng di Bengkulu.", "perlu-cek", [id(S.marlborough)], { endKey: 1719 }),
  ev("ev-surakarta-1745", "keraton-surakarta", 1745.13, "17 Februari 1745", "dibangun", "Keraton pindah ke Surakarta", "Pakubuwana II memindahkan keraton dari Kartasura ke Desa Sala.", "diperdebatkan", [id(S.surakarta)], { alternatives: ["Wikipedia (id) menyebut keraton diresmikan pada 20 Februari 1745."] }),
  ev("ev-buitenzorg-1745", "istana-bogor", 1745.5, "1745", "dibangun", "Buitenzorg dibangun", "Gubernur Jenderal van Imhoff membangun rumah peristirahatan yang kelak menjadi Istana Bogor.", "perlu-cek", [id(S.bogor)]),
  ev("ev-giyanti-1755", "keraton-yogyakarta", 1755.12, "13 Februari 1755", "peristiwa", "Perjanjian Giyanti", "Mataram dibagi menjadi Kasunanan Surakarta dan Kasultanan Yogyakarta.", "perlu-cek", [id(S.giyanti)]),
  ev("ev-kraton-yk-1755", "keraton-yogyakarta", 1755.77, "9 Oktober 1755", "dibangun", "Keraton Yogyakarta mulai dibangun", "Hamengkubuwana I memulai pembangunan keraton di Hutan Beringan.", "perlu-cek", [id(S.kratonYk)], { endKey: 1756.77 }),
  ev("ev-tamansari-1758", "taman-sari", 1758, "1758 - 1765", "dibangun", "Taman Sari dibangun", "Taman istana dengan kolam pemandian dan pulau buatan dibangun untuk Sultan.", "perlu-cek", [id(S.tamansari)], { endKey: 1765 }),
  ev("ev-kadriah-1771", "istana-kadriah", 1771.81, "23 Oktober 1771", "dibangun", "Pontianak dan Istana Kadriah", "Syarif Abdurrahman Alkadrie membuka permukiman di pertemuan Kapuas dan Landak yang menjadi Kesultanan Pontianak.", "perlu-cek", [id(S.kadriah)]),
  ev("ev-surosowan-1808", "banten-lama", 1808, "1808", "rusak", "Keraton Surosowan dihancurkan", "Pasukan Daendels menghancurkan Keraton Surosowan.", "perlu-cek", [id(S.surosowan)]),
  ev("ev-pagaruyung-1804", "pagaruyung", 1804, "Awal abad ke-19 (diperdebatkan)", "rusak", "Istana lama Pagaruyung terbakar", "Istana lama Pagaruyung terbakar dalam pergolakan Perang Padri.", "diperdebatkan", [id(S.pagaruyung)]),
  ev("ev-singosari-1803", "singosari", 1803, "Awal abad ke-19", "peristiwa", "Arca Singosari dibawa ke Eropa", "Sejumlah arca dari kawasan Singosari diangkut ke Belanda pada masa kolonial.", "perlu-cek", [id(S.singosari)]),
  ev("ev-dieng-1814", "dieng", 1814.2, "1814", "ditemukan", "Dieng dicatat kembali", "Candi-candi Dieng yang tergenang dilaporkan kembali pada masa pemerintahan Inggris.", "perlu-cek", [id(S.dieng)]),
  ev("ev-sukuh-1815", "sukuh", 1815.2, "1815", "ditemukan", "Sukuh dilaporkan", "Candi Sukuh dilaporkan kepada Raffles pada masa pemerintahan Inggris di Jawa.", "perlu-cek", [id(S.sukuh)]),
  ev("ev-kebunraya-1817", "istana-bogor", 1817.38, "18 Mei 1817", "dibangun", "Kebun Raya Bogor didirikan", "Kebun botani didirikan di samping istana Buitenzorg.", "perlu-cek", [id(S.kebunraya)]),
  ev("ev-duurstede-1817", "benteng-duurstede", 1817.37, "16 Mei 1817", "peristiwa", "Pattimura merebut Duurstede", "Pasukan rakyat Saparua di bawah Kapitan Pattimura merebut Benteng Duurstede.", "perlu-cek", [id(S.duurstede), id(S.pattimura)]),
  ev("ev-traktat-1824", "benteng-marlborough", 1824.21, "17 Maret 1824", "peristiwa", "Traktat London", "Inggris menyerahkan Bengkulu kepada Belanda melalui Traktat London.", "perlu-cek", [id(S.traktat)]),
  ev("ev-penyengat-1832", "penyengat", 1832, "1832", "dibangun", "Masjid Raya Sultan Riau", "Masjid kuning di Pulau Penyengat dibangun. Menurut cerita setempat, putih telur dipakai dalam campuran perekatnya.", "perlu-cek", [id(S.penyengat)]),
  ev("ev-bogor-1834", "istana-bogor", 1834.77, "10 Oktober 1834", "rusak", "Gempa merusak Buitenzorg", "Gempa bumi merusak berat istana Buitenzorg, yang kemudian dibangun ulang.", "perlu-cek", [id(S.bogor)]),
  ev("ev-tugu-1867", "keraton-yogyakarta", 1867.44, "10 Juni 1867", "rusak", "Gempa merobohkan Tugu Golong Gilig", "Gempa besar merobohkan tugu di ujung utara sumbu Yogyakarta dan merusak Taman Sari.", "perlu-cek", [id(S.tugu), id(S.tamansari)]),
  ev("ev-ombilin-1868", "ombilin", 1868, "1868", "ditemukan", "Batubara Ombilin ditemukan", "Insinyur Belanda menemukan cadangan batubara di sekitar Sawahlunto.", "perlu-cek", [id(S.ombilinWp)]),
  ev("ev-baiturrahman-1873", "baiturrahman", 1873.28, "April 1873", "rusak", "Masjid Raya dibakar", "Masjid Raya Baiturrahman terbakar saat agresi militer Belanda pertama ke Aceh.", "perlu-cek", [id(S.baiturrahman)]),
  ev("ev-baiturrahman-1879", "baiturrahman", 1879.77, "1879 - 1881", "dibangun", "Masjid Raya dibangun ulang", "Pemerintah kolonial membangun ulang masjid dengan kubah bergaya Moghul.", "perlu-cek", [id(S.baiturrahman)], { endKey: 1881.98 }),
  ev("ev-siak-1889", "istana-siak", 1889, "1889", "dibangun", "Istana Asserayah Hasyimiah", "Sultan Syarif Hasyim membangun istana Kesultanan Siak.", "perlu-cek", [id(S.siak)]),
  ev("ev-ombilin-1892", "ombilin", 1892, "1892", "digunakan", "Tambang Ombilin beroperasi", "Penambangan batubara dimulai dan jalur kereta menghubungkan Sawahlunto dengan pelabuhan di Padang. Pekerja paksa yang dirantai ikut dipekerjakan.", "perlu-cek", [id(S.ombilinWp)]),
  ev("ev-concordia-1895", "gedung-merdeka", 1895, "1895", "dibangun", "Societeit Concordia", "Gedung perkumpulan orang Eropa dibangun di Bandung.", "perlu-cek", [id(S.merdeka)]),
  ev("ev-lawangsewu-1904", "lawang-sewu", 1904, "1904 - 1907", "dibangun", "Lawang Sewu dibangun", "Gedung kantor pusat NIS dibangun dengan banyak pintu dan jendela tinggi.", "perlu-cek", [id(S.lawangsewu)], { endKey: 1907 }),
  ev("ev-majapahit-1910", "hotel-majapahit", 1910, "1910", "dibangun", "Hotel Oranje dibuka", "Hotel bergaya kolonial dibuka di Jalan Tunjungan, Surabaya.", "perlu-cek", [id(S.majapahitHotel)]),
  ev("ev-gunungpadang-1914", "gunung-padang", 1914, "1914", "ditemukan", "Gunung Padang dilaporkan", "Situs Gunung Padang dicatat dalam laporan dinas purbakala Hindia Belanda.", "perlu-cek", [id(S.padang)]),
  ev("ev-gedungsate-1920", "gedung-sate", 1920.57, "27 Juli 1920", "dibangun", "Gedung Sate mulai dibangun", "Peletakan batu pertama Gedung Gouvernements Bedrijven di Bandung.", "perlu-cek", [id(S.gedungsate)], { endKey: 1924 }),
  ev("ev-goagajah-1923", "goa-gajah", 1923, "1923", "ditemukan", "Goa Gajah ditemukan kembali", "Gua pertapaan dilaporkan oleh pejabat Belanda; petirtaan di depannya baru tersingkap puluhan tahun kemudian.", "perlu-cek", [id(S.goagajah)]),
  ev("ev-jamgadang-1926", "jam-gadang", 1926, "1926", "dibangun", "Jam Gadang dibangun", "Menara jam didirikan di pusat Bukittinggi.", "perlu-cek", [id(S.jamgadang)]),
  ev("ev-concordia-1926", "gedung-merdeka", 1926.5, "1926", "dipugar", "Concordia dirombak", "Gedung Concordia dirombak dengan gaya art deco.", "perlu-cek", [id(S.merdeka)]),
  ev("ev-sumpah-1928", "gedung-sumpah-pemuda", 1928.82, "28 Oktober 1928", "peristiwa", "Sumpah Pemuda", "Kongres Pemuda II di Kramat 106 menghasilkan ikrar satu tanah air, satu bangsa, dan menjunjung bahasa persatuan.", "perlu-cek", [id(S.sumpah)]),
  ev("ev-ngandong-1931", "ngandong", 1931, "1931 - 1933", "ditemukan", "Tengkorak Ngandong digali", "Ekskavasi di teras Bengawan Solo menemukan belasan tengkorak Homo erectus.", "perlu-cek", [id(S.soloMan)], { endKey: 1933 }),
  ev("ev-ende-1934", "pengasingan-bung-karno", 1934, "1934 - 1938", "peristiwa", "Pengasingan di Ende", "Sukarno diasingkan pemerintah kolonial ke Ende, Flores.", "perlu-cek", [id(S.ende)], { endKey: 1938 }),
  ev("ev-banda-1936", "banda-neira", 1936, "1936 - 1942", "peristiwa", "Pengasingan di Banda Neira", "Mohammad Hatta dan Sutan Sjahrir menjalani pengasingan di Banda Neira.", "perlu-cek", [id(S.banda), id(S.hatta)], { endKey: 1942 }),
  ev("ev-bengkulu-1938", "pengasingan-bung-karno", 1938.5, "1938 - 1942", "peristiwa", "Pengasingan di Bengkulu", "Sukarno dipindahkan ke Bengkulu dan tinggal di rumah pengasingan hingga 1942.", "perlu-cek", [id(S.ende)], { endKey: 1942 }),

  // 1945
  ev("ev-prok-pegangsaan", "tugu-proklamasi", 1945.625, "17 Agustus 1945, pukul 10.00", "peristiwa", "Proklamasi dibacakan", "Teks proklamasi dibacakan di halaman rumah Jalan Pegangsaan Timur 56.", "perlu-cek", [id(S.proklamasi)]),
  ev("ev-yamato-1945", "hotel-majapahit", 1945.72, "19 September 1945", "peristiwa", "Insiden Hotel Yamato", "Pemuda Surabaya merobek bagian biru bendera Belanda di puncak hotel sehingga tersisa merah putih.", "perlu-cek", [id(S.majapahitHotel)]),
  ev("ev-semarang-1945", "lawang-sewu", 1945.79, "14 - 19 Oktober 1945", "peristiwa", "Pertempuran Lima Hari Semarang", "Kawasan Lawang Sewu menjadi salah satu titik pertempuran antara pemuda dan tentara Jepang.", "perlu-cek", [id(S.semarang)]),
  ev("ev-surabaya-1945", "tugu-pahlawan", 1945.86, "10 November 1945", "peristiwa", "Pertempuran Surabaya", "Pertempuran besar melawan pasukan Sekutu yang kemudian diperingati sebagai Hari Pahlawan.", "perlu-cek", [id(S.surabaya)]),
  ev("ev-siak-1945", "istana-siak", 1945.88, "1945", "peristiwa", "Siak bergabung dengan Republik", "Sultan Syarif Kasim II menyatakan Kesultanan Siak bergabung dengan Republik Indonesia dan menyerahkan hartanya untuk perjuangan.", "perlu-cek", [id(S.syarifkasim), id(S.siakId)]),
  ev("ev-gedungsate-1945", "gedung-sate", 1945.92, "3 Desember 1945", "peristiwa", "Tujuh pemuda gugur di Gedung Sate", "Pegawai muda Departemen Pekerjaan Umum gugur mempertahankan gedung dari serangan pasukan Sekutu.", "perlu-cek", [id(S.gedungsate), id(S.gedungsateId)]),

  // Modern
  ev("ev-tugupahlawan-1951", "tugu-pahlawan", 1951.86, "1951 - 1952", "dibangun", "Tugu Pahlawan dibangun", "Tugu peringatan didirikan di bekas lokasi gedung Raad van Justitie, diresmikan pada 10 November 1952.", "perlu-cek", [id(S.tugupahlawan)], { endKey: 1952.86 }),
  ev("ev-kaa-1955", "gedung-merdeka", 1955.3, "18 - 24 April 1955", "peristiwa", "Konferensi Asia Afrika", "Delegasi 29 negara Asia dan Afrika bersidang di Gedung Merdeka.", "perlu-cek", [id(S.kaa)]),
  ev("ev-pegangsaan-1960", "tugu-proklamasi", 1960, "1960", "rusak", "Rumah Pegangsaan dibongkar", "Rumah tempat proklamasi dibacakan dibongkar; kini lokasinya ditandai Tugu Proklamasi.", "perlu-cek", [id(S.tuguProk)]),
  ev("ev-monas-1961", "monas", 1961.62, "17 Agustus 1961", "dibangun", "Monas mulai dibangun", "Pemancangan pertama Monumen Nasional di Lapangan Merdeka.", "perlu-cek", [id(S.monas)], { endKey: 1975.53 }),
  ev("ev-cangkuang-1966", "cangkuang", 1966.3, "1966", "ditemukan", "Candi Cangkuang ditemukan kembali", "Tim peneliti menemukan reruntuhan candi berdasarkan catatan Belanda abad ke-19.", "perlu-cek", [id(S.cangkuang)]),
  ev("ev-sumpah-museum-1973", "gedung-sumpah-pemuda", 1973.38, "20 Mei 1973", "ditetapkan", "Museum Sumpah Pemuda", "Gedung Kramat 106 diresmikan sebagai museum.", "perlu-cek", [id(S.museumSumpah)]),
  ev("ev-fatahillah-1974", "kota-tua-jakarta", 1974.24, "30 Maret 1974", "ditetapkan", "Museum Sejarah Jakarta", "Bekas Stadhuis Batavia diresmikan sebagai Museum Sejarah Jakarta.", "perlu-cek", [id(S.fatahillah)]),
  ev("ev-cangkuang-1974", "cangkuang", 1974.6, "1974 - 1976", "dipugar", "Candi Cangkuang dipugar", "Candi disusun kembali dari batu-batu yang ditemukan.", "perlu-cek", [id(S.cangkuang), id(S.cangkuangId)], { endKey: 1976 }),
  ev("ev-cetho-1975", "cetho", 1975.2, "1970-an", "dipugar", "Pemugaran Candi Cetho", "Candi Cetho dipugar; sejumlah tambahan bangunan dalam pemugaran ini kemudian dipersoalkan para arkeolog.", "perlu-cek", [id(S.cetho), id(S.cethoId)]),
  ev("ev-pagaruyung-1976", "pagaruyung", 1976, "1976", "dibangun", "Replika Istano Basa", "Istano Basa dibangun kembali sebagai replika di Tanah Datar.", "perlu-cek", [id(S.pagaruyung)]),
  ev("ev-prajna-1978", "singosari", 1978, "1978", "peristiwa", "Prajnaparamita kembali ke Indonesia", "Arca Prajnaparamita yang lama tersimpan di Belanda dikembalikan ke Indonesia.", "perlu-cek", [id(S.prajna)]),
  ev("ev-kaa-museum-1980", "gedung-merdeka", 1980.31, "24 April 1980", "ditetapkan", "Museum Konferensi Asia Afrika", "Museum KAA diresmikan di Gedung Merdeka.", "perlu-cek", [id(S.merdeka)]),
  ev("ev-batujaya-1984", "batujaya", 1984, "1984", "ditemukan", "Batujaya diteliti", "Tim arkeologi Universitas Indonesia mulai meneliti gundukan-gundukan bata di persawahan Batujaya.", "perlu-cek", [id(S.batujaya)]),
  ev("ev-surakarta-1985", "keraton-surakarta", 1985.08, "31 Januari 1985", "rusak", "Kebakaran Keraton Surakarta", "Kebakaran menghanguskan sebagian bangunan inti keraton, yang kemudian dibangun kembali.", "perlu-cek", [id(S.surakarta)]),
  ev("ev-sewu-1993", "sewu", 1981, "1981 - 1993", "dipugar", "Pemugaran candi utama Sewu", "Candi utama Sewu dipugar dan diresmikan pada 1993.", "perlu-cek", [id(S.sewu)], { endKey: 1993 }),
  ev("ev-tsunami-baiturrahman", "baiturrahman", 2004.98, "26 Desember 2004", "rusak", "Masjid Raya selamat dari tsunami", "Gempa dan tsunami melanda Aceh. Masjid Raya Baiturrahman tetap berdiri dan menjadi tempat berlindung warga.", "perlu-cek", [id(S.baiturrahman)]),
  ev("ev-tsunami-pltd", "pltd-apung", 2004.981, "26 Desember 2004", "peristiwa", "Kapal PLTD Apung terseret ke darat", "Kapal pembangkit listrik seberat ribuan ton terseret tsunami beberapa kilometer ke tengah permukiman, kini menjadi monumen.", "perlu-cek", [id(S.pltd)]),
  ev("ev-sewu-2006", "sewu", 2006.401, "27 Mei 2006", "rusak", "Gempa merusak Candi Sewu", "Gempa Yogyakarta juga merusak Candi Sewu dan bangunan di Taman Sari serta Kotagede.", "perlu-cek", [id(S.sewu)]),
  ev("ev-pagaruyung-2007", "pagaruyung", 2007.16, "27 Februari 2007", "rusak", "Istano Basa disambar petir", "Petir menyambar dan membakar replika Istano Basa beserta sebagian koleksinya. Istana kemudian dibangun ulang.", "perlu-cek", [id(S.pagaruyung)]),
  ev("ev-subak-2012", "subak", 2012.49, "2012", "ditetapkan", "Subak menjadi Warisan Dunia", "UNESCO menetapkan Lanskap Budaya Provinsi Bali: Sistem Subak sebagai Warisan Dunia.", "terverifikasi", [id(S.subak)]),
  ev("ev-ombilin-2019", "ombilin", 2019.51, "6 Juli 2019", "ditetapkan", "Ombilin menjadi Warisan Dunia", "UNESCO menetapkan Warisan Tambang Batubara Ombilin Sawahlunto sebagai Warisan Dunia.", "terverifikasi", [id(S.ombilin)]),
  ev("ev-jeriji-2018", "lubang-jeriji-saleh", 2018.85, "November 2018", "diteliti", "Lukisan Kalimantan dipublikasikan", "Penanggalan lukisan Lubang Jeriji Saléh diterbitkan dan menempatkannya di antara seni figuratif tertua di dunia.", "perlu-cek", [id(S.jeriji)]),
  ev("ev-ngandong-2019", "ngandong", 2020, "2020", "diteliti", "Usia Ngandong dipastikan", "Penanggalan ulang menempatkan Homo erectus Ngandong pada 117.000 sampai 108.000 tahun lalu.", "perlu-cek", [id(S.soloMan)]),
  ev("ev-liangbua-2003", "liang-bua", 2003.7, "2003", "ditemukan", "Kerangka LB1 ditemukan", "Tim Indonesia-Australia menemukan kerangka manusia bertubuh kecil di Liang Bua.", "perlu-cek", [id(S.liangBua)]),
  ev("ev-liangbua-2004", "liang-bua", 2004.82, "Oktober 2004", "diteliti", "Homo floresiensis diumumkan", "Spesies baru Homo floresiensis diumumkan dalam jurnal ilmiah.", "perlu-cek", [id(S.floresiensis)]),
  ev("ev-trinil-1891", "trinil", 1891, "1891 - 1892", "ditemukan", "Fosil Trinil ditemukan", "Eugène Dubois menemukan atap tengkorak dan tulang paha di tepi Bengawan Solo.", "perlu-cek", [id(S.trinil), id(S.javaMan)], { endKey: 1892 }),
  ev("ev-gunungpadang-2023", "gunung-padang", 2023.8, "2023 - 2024", "diteliti", "Klaim usia Gunung Padang ditarik", "Artikel yang mengklaim lapisan terdalam Gunung Padang berumur puluhan ribu tahun terbit pada 2023, lalu ditarik penerbitnya pada 2024 karena kesimpulannya dinilai tidak didukung data.", "diperdebatkan", [id(S.padang)], { alternatives: ["Wikipedia (en) mencatat Natawidjaja dan rekan menyimpulkan Gunung Padang sebagai piramida buatan manusia tertua di dunia, berusia hingga 27.000 tahun.", "Wikipedia (en) mencatat pecahan tembikar di situs ini ditanggali biro arkeologi pada kisaran 45 SM sampai 22 M, dan ahli gunung api menilai Gunung Padang adalah leher gunung api purba, bukan piramida."] }),
  ev("ev-sumbu-2023", "keraton-yogyakarta", 2023.71, "18 September 2023", "ditetapkan", "Sumbu Filosofi menjadi Warisan Dunia", "UNESCO menetapkan Sumbu Kosmologis Yogyakarta dan penanda bersejarahnya sebagai Warisan Dunia.", "terverifikasi", [id(S.sumbu)]),
];
