/**
 * Pita kerajaan dan masa untuk "Band chronology" di halaman Peta Waktu.
 * SEMUA rentang adalah PERKIRAAN dan banyak yang diperdebatkan ahli. Tampilkan label "perkiraan".
 * Jalankan verify-facts untuk mencocokkan dengan sumber; jangan menggambar batas wilayah (tidak ada data GIS yang sahih).
 */
export interface Kingdom {
  id: string;
  name: string;
  start: number;
  end: number;
  region: string;
  center: { lat: number; lng: number };
  approx: true;
  note?: string;
  source: string;
}
const wp = (t: string) => `https://en.wikipedia.org/wiki/${t}`;
export const kingdoms: Kingdom[] = [
  { id: "kutai", name: "Kutai Martadipura", start: 350, end: 1635, region: "Kalimantan Timur", center: { lat: -0.2, lng: 116.73 }, approx: true, note: "Awal berdasarkan yupa; akhir saat ditaklukkan Kutai Kartanegara.", source: wp("Kutai") },
  { id: "tarumanagara", name: "Tarumanagara", start: 358, end: 669, region: "Jawa Barat", center: { lat: -6.3, lng: 106.9 }, approx: true, source: wp("Tarumanagara") },
  { id: "sriwijaya", name: "Sriwijaya", start: 671, end: 1377, region: "Sumatra dan Selat Malaka", center: { lat: -2.99, lng: 104.76 }, approx: true, source: wp("Srivijaya") },
  { id: "mataram-kuno", name: "Mataram Kuno", start: 716, end: 1016, region: "Jawa Tengah lalu Jawa Timur", center: { lat: -7.75, lng: 110.4 }, approx: true, source: wp("Mataram_Kingdom") },
  { id: "kediri", name: "Kediri", start: 1042, end: 1222, region: "Jawa Timur", center: { lat: -7.82, lng: 112.01 }, approx: true, source: wp("Kediri_Kingdom") },
  { id: "singhasari", name: "Singhasari", start: 1222, end: 1292, region: "Jawa Timur", center: { lat: -7.89, lng: 112.66 }, approx: true, source: wp("Singhasari") },
  { id: "majapahit", name: "Majapahit", start: 1293, end: 1527, region: "Jawa Timur dan Nusantara", center: { lat: -7.56, lng: 112.38 }, approx: true, source: wp("Majapahit") },
  { id: "samudera-pasai", name: "Samudera Pasai", start: 1267, end: 1521, region: "Aceh", center: { lat: 5.18, lng: 97.25 }, approx: true, source: wp("Samudera_Pasai_Sultanate") },
  { id: "demak", name: "Kesultanan Demak", start: 1475, end: 1554, region: "Jawa Tengah", center: { lat: -6.89, lng: 110.64 }, approx: true, source: wp("Demak_Sultanate") },
  { id: "aceh", name: "Kesultanan Aceh", start: 1496, end: 1903, region: "Aceh", center: { lat: 5.55, lng: 95.32 }, approx: true, source: wp("Aceh_Sultanate") },
  { id: "banten", name: "Kesultanan Banten", start: 1527, end: 1813, region: "Banten", center: { lat: -6.04, lng: 106.15 }, approx: true, source: wp("Banten_Sultanate") },
  { id: "gowa", name: "Kesultanan Gowa-Tallo", start: 1300, end: 1669, region: "Sulawesi Selatan", center: { lat: -5.19, lng: 119.43 }, approx: true, note: "Akhir di sini menandai jatuhnya Somba Opu; kesultanan tetap ada dengan wilayah jauh lebih kecil.", source: wp("Sultanate_of_Gowa") },
  { id: "ternate", name: "Kesultanan Ternate", start: 1257, end: 1914, region: "Maluku Utara", center: { lat: 0.79, lng: 127.38 }, approx: true, source: wp("Sultanate_of_Ternate") },
  { id: "mataram-islam", name: "Kesultanan Mataram", start: 1587, end: 1755, region: "Jawa Tengah", center: { lat: -7.83, lng: 110.4 }, approx: true, source: wp("Mataram_Sultanate") },
  { id: "voc", name: "VOC", start: 1602, end: 1799, region: "Kongsi dagang Belanda", center: { lat: -6.13, lng: 106.81 }, approx: true, source: wp("Dutch_East_India_Company") },
  { id: "hindia-belanda", name: "Hindia Belanda", start: 1800, end: 1942, region: "Pemerintahan kolonial", center: { lat: -6.13, lng: 106.81 }, approx: true, source: wp("Dutch_East_Indies") },
  { id: "jepang", name: "Pendudukan Jepang", start: 1942, end: 1945, region: "Nusantara", center: { lat: -6.2, lng: 106.83 }, approx: true, source: wp("Japanese_occupation_of_the_Dutch_East_Indies") },
  { id: "ri", name: "Republik Indonesia", start: 1945, end: 2026, region: "Indonesia", center: { lat: -6.18, lng: 106.83 }, approx: true, source: wp("Indonesia") },
];
