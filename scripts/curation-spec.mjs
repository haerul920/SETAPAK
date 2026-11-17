/**
 * Spesifikasi kurasi aset SETAPAK v3 (hasil pemeriksaan visual lembar kontak).
 * Nomor = urutan pada scripts/.cache/sheets/<grup>.txt. Menghasilkan data/asset-curation.json.
 * Jalankan: node scripts/curation-spec.mjs
 */
import fs from "node:fs";
import path from "node:path";

const SHEETS = path.join("scripts", ".cache", "sheets");

/** [grup, nomor, alt, opsi] */
const spec = [
  ["sangiran__hero", 1, "Replika tengkorak Sangiran 17 di dalam vitrin museum, dengan papan keterangan di depannya"],
  ["sangiran__hero", 2, "Halaman Museum Sangiran yang teduh oleh pepohonan"],
  ["sangiran__hero", 3, "Dinding depan Museum Manusia Purba Sangiran Klaster Krikilan dengan siluet manusia purba"],
  ["sangiran__hero", 4, "Gerbang Museum Purbakala Sangiran berbentuk sepasang gading raksasa"],
  ["sangiran__gallery", 3, "Patung gajah purba di depan gedung Museum Manusia Purba Sangiran"],
  ["sangiran__gallery", 4, "Fosil tempurung kepala Sangiran II dipegang dua tangan di atas meja"],
  ["sangiran__gallery", 9, "Fosil tempurung kepala Sangiran II berwarna cokelat tua dilihat dari samping"],
  ["sangiran__gallery", 10, "Fosil tempurung kepala Sangiran II dilihat dari belakang di dalam vitrin"],

  ["karst-maros-pangkep__hero", 1, "Bukit karst menjulang di belakang sawah kuning di Rammang-Rammang, Maros"],
  ["karst-maros-pangkep__hero", 3, "Sungai tenang dengan bebatuan karst dan perahu kecil di Rammang-Rammang"],
  ["karst-maros-pangkep__hero", 6, "Tebing karst berhutan lebat di bawah langit biru, Maros"],
  ["karst-maros-pangkep__hero", 4, "Diorama dinding gua dengan lukisan cadas di Museum Karst dan Budaya Maros", { role: "gallery" }],
  ["karst-maros-pangkep__gallery", 1, "Batu-batu karst berdiri di padang rumput Taman Prasejarah Leang-Leang"],
  ["karst-maros-pangkep__gallery", 2, "Gugusan batu karst runcing di antara pepohonan, Leang-Leang"],
  ["karst-maros-pangkep__gallery", 3, "Cap tangan negatif berwarna merah di dinding Gua Pettakere, Maros", { role: "texture" }],
  ["karst-maros-pangkep__gallery", 4, "Beberapa cap tangan merah di dinding batu kapur Gua Pettakere", { role: "texture" }],
  ["karst-maros-pangkep__gallery", 5, "Detail cap tangan negatif merah di Gua Pettakere", { role: "texture" }],
  ["karst-maros-pangkep__gallery", 7, "Lukisan cadas merah berbentuk hewan di dinding Gua Pettakere"],
  ["karst-maros-pangkep__gallery", 6, "Foto arsip KITLV: alat-alat batu dan tulang dari gua Leang Petta, Sulawesi Selatan", { role: "then" }],
  ["karst-maros-pangkep__gallery", 9, "Foto arsip KITLV: mulut gua Leang Petta dengan tebing kapur dan semak", { role: "then" }],

  ["liyangan__hero", 1, "Situs Liyangan: fondasi batu candi dan talud di area terbuka, dengan atap peneduh"],
  ["liyangan__hero", 4, "Bangunan batu candi Liyangan yang tersingkap di tengah area tambang pasir"],
  ["liyangan__hero", 5, "Lingga-yoni batu dari Situs Liyangan", { role: "gallery" }],
  ["liyangan__gallery", 1, "Gunung Sindoro dan Sumbing dengan permukiman di kakinya"],
  ["liyangan__gallery", 2, "Puncak Gunung Sindoro menyembul di atas lautan awan"],
  ["liyangan__gallery", 5, "Gunung Sindoro dengan kebun dan bunga aster di lerengnya"],
  ["liyangan__gallery", 6, "Kebun tembakau di lereng Gunung Sindoro"],

  ["muarajambi__hero", 1, "Bangunan bata candi di Muarajambi di bawah pohon besar"],
  ["muarajambi__hero", 2, "Halaman luas kompleks candi Muarajambi dengan pepohonan tinggi"],
  ["muarajambi__hero", 3, "Gundukan tanah (menapo) di antara pepohonan di kawasan Muarajambi"],
  ["muarajambi__hero", 6, "Struktur bata rendah di tengah rumput, kawasan Muarajambi"],
  ["muarajambi__gallery", 7, "Candi bata bertingkat di Muarajambi di bawah langit berawan"],
  ["muarajambi__gallery", 1, "Bangunan terbesar di Candi Kembar Batu, Muarajambi"],
  ["muarajambi__gallery", 2, "Susunan bata berundak di Candi Kembar Batu"],
  ["muarajambi__gallery", 3, "Fondasi bata persegi di Candi Kembar Batu"],
  ["muarajambi__gallery", 4, "Dua candi dan tangga di Candi Kembar Batu"],
  ["muarajambi__gallery", 6, "Jalan bata dari gapura di Candi Kembar Batu"],
  ["muarajambi__gallery", 8, "Bangunan utama dan gapura di Candi Kembar Batu"],

  ["borobudur__hero", 1, "Candi Borobudur dilihat dari barat laut di bawah langit biru"],
  ["borobudur__hero", 2, "Siluet stupa Borobudur saat matahari terbit dengan gunung di kejauhan"],
  ["borobudur__hero", 3, "Deretan stupa Borobudur berlatar langit fajar jingga"],
  ["borobudur__hero", 5, "Stupa berterawang di teras atas Borobudur dengan kabut pagi"],
  ["borobudur__hero", 6, "Stupa Borobudur berlatar pegunungan Menoreh dan kabut"],
  ["borobudur__hero", 7, "Dinding berelief dan relung arca di Candi Borobudur"],
  ["borobudur__gallery", 1, "Stupa-stupa di teras atas Borobudur dengan stupa induk di puncak"],
  ["borobudur__gallery", 2, "Lorong di antara stupa berterawang di teras Borobudur"],
  ["borobudur__gallery", 3, "Stupa Borobudur berlatar Gunung Merapi dan Merbabu pagi hari"],
  ["borobudur__gallery", 7, "Stupa berterawang di teras melingkar Borobudur dengan gunung di belakang"],
  ["borobudur__gallery", 9, "Panel relief batu di dinding lorong Borobudur"],
  ["borobudur__gallery", 10, "Relief naratif di Borobudur dengan deretan figur"],
  ["borobudur__gallery", 12, "Teras stupa Borobudur saat cahaya pagi"],
  ["borobudur__gallery", 13, "Arca Buddha di stupa terbuka di teras atas Borobudur"],
  ["borobudur__then", 1, "Foto Kassian Cephas: relief di Borobudur, akhir abad ke-19"],
  ["borobudur__then", 2, "Foto Kassian Cephas: relief kaki tersembunyi Borobudur, 1890 sampai 1891"],
  ["borobudur__then", 3, "Foto Kassian Cephas: lorong di Borobudur sekitar 1888"],
  ["borobudur__then", 4, "Foto Kassian Cephas: panel relief Borobudur, 1890 sampai 1891"],
  ["borobudur__then", 5, "Foto Kassian Cephas: Borobudur dilihat dari halaman, 1872"],
  ["borobudur__now", 1, "Candi Borobudur dilihat dari barat laut dengan pohon besar di depan", { role: "now" }],
  ["borobudur__now", 3, "Foto Kassian Cephas: Borobudur dilihat dari barat laut, 1872", { role: "then" }],
  ["borobudur__now", 2, "Foto Isidore van Kinsbergen: sisi barat laut Borobudur di balik pepohonan, sekitar 1871", { role: "then" }],
  ["ev-borobudur-1973__restore", 2, "Foto UNESCO 1973: stupa-stupa Borobudur pada masa kerja sama pemugaran"],
  ["ev-borobudur-1973__restore", 3, "Foto UNESCO 1973: pemandangan Borobudur dari udara pada masa pemugaran"],
  ["ev-borobudur-1973__restore", 1, "Prasasti batu peresmian dimulainya pemugaran Borobudur 1973"],

  ["prambanan__hero", 2, "Gugusan candi Prambanan dengan candi Siwa di tengah"],
  ["prambanan__hero", 3, "Jalan taman menuju candi Prambanan"],
  ["prambanan__hero", 6, "Gerbang dan tangga menuju candi utama Prambanan"],
  ["prambanan__hero", 7, "Candi-candi Prambanan dengan reruntuhan batu di halaman depan"],
  ["prambanan__hero", 8, "Kompleks Prambanan dengan tumpukan batu candi perwara"],
  ["prambanan__hero", 1, "Detail panel hiasan pahatan di dinding candi Prambanan", { role: "gallery" }],
  ["prambanan__gallery", 1, "Relief Ramayana di candi Siwa, Prambanan"],
  ["prambanan__gallery", 2, "Panel relief Ramayana di candi Siwa, Prambanan"],
  ["prambanan__gallery", 3, "Foto 1896: dinding relief Ramayana Prambanan", { role: "then" }],
  ["prambanan__gallery", 6, "Foto arsip KITLV: relief Ramayana Prambanan", { role: "then" }],
  ["prambanan__gallery", 7, "Foto arsip KITLV: relief Ramayana dengan pasukan kera, Prambanan", { role: "then" }],
  ["prambanan__gallery", 8, "Foto arsip KITLV: deretan relief Ramayana Prambanan", { role: "then" }],
  ["prambanan__gallery", 9, "Relief pasukan kera bersiap menyerang di Prambanan"],
  ["prambanan__gallery", 11, "Foto arsip KITLV: adegan Ramayana di Prambanan", { role: "then" }],
  ["prambanan__now", 5, "Candi Siwa Prambanan menjulang di atas rumput hijau"],
  ["ev-prambanan-2006__quake", 1, "Kompleks Prambanan pada 2008, tampak perancah di salah satu candi"],
  ["ev-prambanan-2006__quake", 2, "Candi utama Prambanan pada 2007 dengan pagar pembatas di halaman"],

  ["sambisari__hero", 1, "Kompleks Candi Sambisari di dasar cekungan berpagar talud batu"],
  ["sambisari__hero", 3, "Panorama Candi Sambisari yang lebih rendah dari permukaan tanah sekitar"],
  ["sambisari__hero", 6, "Candi induk dan tiga candi perwara Sambisari dilihat dari atas"],
  ["sambisari__gallery", 1, "Lingga dan yoni di dalam bilik Candi Sambisari"],
  ["sambisari__gallery", 3, "Yoni berhias pahatan di Candi Sambisari"],
  ["sambisari__gallery", 4, "Yoni batu di halaman Candi Sambisari"],
  ["sambisari__gallery", 5, "Arca dalam relung di dinding Candi Sambisari"],
  ["sambisari__gallery", 6, "Pintu masuk bilik Candi Sambisari dengan hiasan kala"],
  ["sambisari__gallery", 7, "Candi Sambisari dilihat dari tepi cekungan"],
  ["sambisari__gallery", 8, "Relung berarca di dinding Candi Sambisari"],

  ["kimpulan__hero", 1, "Lapik arca di pelataran Candi Kimpulan"],
  ["kimpulan__hero", 2, "Yoni Candi Kimpulan dengan gedung perpustakaan di belakangnya"],
  ["kimpulan__hero", 3, "Candi induk dan perwara Kimpulan di halaman kampus"],
  ["kimpulan__hero", 4, "Mangkuk perunggu temuan Candi Kimpulan di vitrin", { role: "gallery" }],
  ["kimpulan__hero", 5, "Kotak peripih batu temuan Candi Kimpulan", { role: "gallery" }],
  ["kimpulan__gallery", 1, "Lubang ekskavasi Candi Kimpulan pada 2010 dengan gedung kampus di belakang"],

  ["trowulan__hero", 2, "Gapura bata Bajang Ratu di Trowulan dengan taman di depannya"],
  ["trowulan__hero", 4, "Detail puncak gapura bata Bajang Ratu"],
  ["trowulan__hero", 6, "Gapura Bajang Ratu menjulang di bawah langit biru"],
  ["trowulan__gallery", 1, "Candi Tikus, petirtaan bata di Trowulan, dilihat dari samping"],
  ["trowulan__gallery", 3, "Kolam petirtaan Candi Tikus dilihat dari atas"],
  ["trowulan__gallery", 4, "Bangunan tengah Candi Tikus di dalam kolam"],
  ["trowulan__gallery", 6, "Panorama kolam petirtaan bata di Trowulan"],
  ["trowulan__gallery", 7, "Candi Brahu dari bata merah dilihat dari depan"],
  ["trowulan__gallery", 8, "Candi Brahu dilihat dari belakang"],
  ["trowulan__then", 1, "Foto arsip KITLV: gapura Bajang Ratu diselimuti tanaman"],
  ["trowulan__then", 2, "Foto arsip KITLV: Bajang Ratu dengan pohon besar tumbuh di strukturnya"],
  ["trowulan__then", 3, "Foto arsip KITLV: gapura Bajang Ratu di tengah pepohonan"],
  ["trowulan__then", 4, "Foto arsip KITLV: gapura Bajang Ratu dengan pohon di sisinya"],

  ["somba-opu__hero", 1, "Papan informasi di kawasan Benteng Somba Opu"],
  ["somba-opu__hero", 3, "Rumah adat bertangga merah di kawasan Somba Opu"],
  ["somba-opu__hero", 5, "Rumah panggung kayu di kawasan Somba Opu"],
  ["somba-opu__hero", 2, "Rumah adat beratap melengkung di kawasan Somba Opu", { role: "gallery" }],
  ["somba-opu__gallery", 2, "Lukisan Johannes Vingboons: pemandangan kota Somba Opu dari laut dengan kapal-kapal layar, sekitar 1665", { role: "then" }],

  ["fort-rotterdam__hero", 1, "Halaman dalam Fort Rotterdam dengan bangunan beratap merah"],
  ["fort-rotterdam__hero", 3, "Bangunan bergaya Belanda berdinding kuning di Fort Rotterdam"],
  ["fort-rotterdam__hero", 6, "Deretan bangunan putih beratap merah di Fort Rotterdam"],
  ["fort-rotterdam__hero", 5, "Litografi 1845: Fort Rotterdam di Makassar dilihat dari jalan pantai", { role: "then" }],
  ["fort-rotterdam__gallery", 1, "Foto 1972: maket Fort Rotterdam dilihat dari tenggara"],
  ["fort-rotterdam__gallery", 3, "Foto 1972: maket bangunan di dalam Fort Rotterdam"],
  ["fort-rotterdam__gallery", 5, "Foto 1972: maket Fort Rotterdam dengan bastion"],
  ["fort-rotterdam__gallery", 7, "Foto 1972: bangunan yang dipugar dilihat dari bastion Fort Rotterdam"],
  ["fort-rotterdam__gallery", 9, "Foto 1972: tembok bastion Fort Rotterdam"],
  ["fort-rotterdam__then", 4, "Foto arsip KITLV: bangunan panjang di dalam Fort Rotterdam"],
  ["fort-rotterdam__then", 5, "Foto arsip KITLV: bangunan bertingkat beratap tinggi di Fort Rotterdam"],
  ["fort-rotterdam__then", 2, "Foto arsip KITLV: jalan dan tembok Fort Rotterdam di kejauhan"],
  ["ev-bungaya-1667__map", 1, "Denah Fort Rotterdam abad ke-18 dengan lima bastion", { target: "fort-rotterdam", role: "then" }],
  ["ev-bungaya-1667__map", 2, "Lukisan Johannes Vingboons: kota Somba Opu dari laut, sekitar 1665"],

  ["istana-maimun__hero", 2, "Pintu masuk Istana Maimun berwarna kuning dengan tangga di depan"],
  ["istana-maimun__hero", 4, "Istana Maimun dengan kubah-kubah hitam dilihat dari halaman"],
  ["istana-maimun__hero", 5, "Fasad Istana Maimun yang memanjang dengan taman di depan"],
  ["istana-maimun__hero", 6, "Balairung Istana Maimun dengan singgasana dan hiasan kuning hijau", { role: "gallery" }],
  ["istana-maimun__then", 1, "Foto arsip KITLV: aula di dalam istana Sultan Deli, Medan"],
  ["istana-maimun__then", 2, "Foto arsip KITLV: istana Sultan Deli di Medan dengan gerbang dan taman"],
  ["istana-maimun__then", 3, "Foto arsip KITLV: istana Sultan Deli di Medan dilihat dari lapangan"],
  ["istana-maimun__then", 5, "Foto arsip KITLV: panorama istana Sultan Deli di Medan"],
  ["istana-maimun__gallery", 2, "Masjid Raya Al Mashun di Medan dengan kubah hitam"],
  ["istana-maimun__gallery", 7, "Masjid Raya Al Mashun di bawah langit biru"],
  ["istana-maimun__gallery", 1, "Gerbang Masjid Raya Al Mashun berhias hijau"],

  ["rumah-maeda__hero", 1, "Museum Perumusan Naskah Proklamasi, bangunan putih bergaya kolonial di Menteng"],

  ["global__map-java", 2, "Peta Jawa 1817 dari survei masa pemerintahan Inggris, dengan lima peta sisipan", { target: "global" }],
  ["global__map-java", 5, "Peta Jawa karya J. Walker, 1817", { target: "global" }],
];

const audioSpec = [
  ["global-audio-gamelan-17kmpi", "Rekaman gamelan dari Kraton Ngayogyakarta"],
  ["global-audio-gamelan-btuhdv", "Rekaman bonang gamelan degung"],
  ["global-audio-nature-15k9ox", "Suara ombak memecah"],
  ["global-audio-nature-16h9ov", "Suara suasana lingkungan"],
  ["global-audio-ocean-2xcsfx", "Suara ombak di tepi danau"],
  ["global-audio-cave-i29nia", "Musik suasana bertema gua"],
  ["global-audio-morning-1fqtcy", "Kicau burung"],
];

const accepted = [];
for (const [group, n, alt, opt = {}] of spec) {
  const lines = fs.readFileSync(path.join(SHEETS, `${group}.txt`), "utf8").trim().split("\n");
  const line = lines.find((l) => l.startsWith(`${n}. `));
  if (!line) throw new Error(`Tidak ada nomor ${n} di ${group}`);
  const cid = line.slice(`${n}. `.length).split(" | ")[0].trim();
  accepted.push({ cid, alt, ...opt });
}
// v4: situs baru dikurasi per cid dari lembar kontak ringkas (scripts/pack-sheets.ts).
// Format baris di scripts/curation-v4.txt: cid | teks alt | role (opsional, misalnya gallery atau then)
const v4File = path.join("scripts", "curation-v4.txt");
if (fs.existsSync(v4File)) {
  for (const line of fs.readFileSync(v4File, "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.startsWith("#")) continue;
    const [cid, alt, role] = line.split(" | ").map((x) => x.trim());
    accepted.push(role ? { cid, alt, role } : { cid, alt });
  }
}
for (const [cid, alt] of audioSpec) accepted.push({ cid, alt });

fs.writeFileSync(
  path.join("data", "asset-curation.json"),
  JSON.stringify({ _note: "Dibuat oleh scripts/curation-spec.mjs setelah pemeriksaan visual.", accepted }, null, 2) + "\n"
);
console.log(`${accepted.length} aset diterima`);
