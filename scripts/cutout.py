"""
SETAPAK - Potong latar foto bangunan menjadi WebP transparan (cutout) dengan rembg (MIT).

Pemakaian:  python scripts/cutout.py [id ...]
Tanpa argumen memakai daftar CUTOUTS di bawah. Masukan: public/media/<target>/<role-n>-1920.webp.
Keluaran: public/media/<target>/<role-n>-cutout.webp (lebar maks 1400 px, dipangkas ke isi),
lalu field "cutout" di data/media.json diperbarui. Hasil wajib diperiksa visual; yang rusak
dicatat di REJECTED agar tidak dipakai (objek memakai foto utuh bermasker lembut sebagai gantinya).
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageFilter
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parent.parent
MEDIA_JSON = ROOT / "data" / "media.json"

CUTOUTS = [
    "borobudur-hero-1",
    "prambanan-now-1",
    "muarajambi-gallery-1",
    "trowulan-hero-3",
    "trowulan-gallery-5",
    "istana-maimun-hero-2",
    "fort-rotterdam-hero-2",
    "sambisari-hero-3",
    "kimpulan-hero-3",
    "liyangan-hero-2",
    "rumah-maeda-hero-1",
    "sangiran-gallery-3",
    # v4: bangunan baru dengan siluet bersih
    "kalasan-hero-1",
    "mendut-hero-1",
    "singosari-hero-1",
    "jam-gadang-hero-1",
    "gedung-sate-hero-1",
    "lawang-sewu-hero-1",
    "istana-siak-hero-1",
    "monas-hero-1",
    "tugu-pahlawan-hero-1",
    "gunung-padang-hero-1",
    "plaosan-hero-1",
    "sukuh-hero-1",
    "penataran-hero-1",
    "katangka-hero-1",
    "kasepuhan-hero-1",
    "penyengat-hero-1",
]

# Hasil yang gagal pemeriksaan visual (diisi setelah dilihat).
# sambisari-hero-3: sisa balok di kiri; kimpulan-hero-3: hampir kosong; liyangan-hero-2: dua orang di atas struktur.
# Ketiganya memakai foto utuh bermasker lembut. Model u2net dipakai ulang untuk borobudur, maimun, maeda.
# v4 ditolak setelah pemeriksaan visual: singosari (hantu transparan), gedung-sate (hanya puncak), tugu-pahlawan (tiang bendera
# liar), gunung-padang, plaosan, sukuh, kasepuhan, penyengat (hampir kosong atau terpecah), katangka (tiang dan kabel listrik).
REJECTED: set[str] = {
    "sambisari-hero-3", "kimpulan-hero-3", "liyangan-hero-2",
    "singosari-hero-1", "gedung-sate-hero-1", "tugu-pahlawan-hero-1", "gunung-padang-hero-1",
    "plaosan-hero-1", "sukuh-hero-1", "katangka-hero-1", "kasepuhan-hero-1", "penyengat-hero-1",
}


def main() -> None:
    ids = sys.argv[1:] or list(CUTOUTS)
    if ids and ids[0].startswith("--model=") and len(ids) == 1:
        ids += CUTOUTS
    media = json.loads(MEDIA_JSON.read_text(encoding="utf-8"))
    by_id = {m["id"]: m for m in media}
    model = "isnet-general-use"
    if ids and ids[0].startswith("--model="):
        model = ids.pop(0).split("=", 1)[1]
    session = new_session(model)
    for mid in ids:
        m = by_id.get(mid)
        if not m:
            print(f"  ! tidak ada {mid}")
            continue
        src = ROOT / "public" / (m["src"].lstrip("/") + "-1920.webp")
        out = ROOT / "public" / (m["src"].lstrip("/") + "-cutout.webp")
        img = Image.open(src).convert("RGB")
        cut = remove(img, session=session, post_process_mask=True)
        alpha = cut.getchannel("A").filter(ImageFilter.GaussianBlur(0.8))
        cut.putalpha(alpha)
        bbox = alpha.point(lambda a: 255 if a > 24 else 0).getbbox()
        if bbox:
            cut = cut.crop(bbox)
        if cut.width > 1400:
            cut = cut.resize((1400, round(cut.height * 1400 / cut.width)), Image.LANCZOS)
        cut.save(out, "WEBP", quality=82, method=6)
        print(f"  ok {mid} -> {out.relative_to(ROOT)} ({cut.width}x{cut.height})")
    for m in media:
        cut_path = ROOT / "public" / (m["src"].lstrip("/") + "-cutout.webp") if m["kind"] == "image" else None
        if cut_path and cut_path.exists() and m["id"] not in REJECTED:
            m["cutout"] = m["src"] + "-cutout.webp"
        else:
            m.pop("cutout", None)
    MEDIA_JSON.write_text(json.dumps(media, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
