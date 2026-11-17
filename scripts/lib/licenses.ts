/**
 * Aturan lisensi aset SETAPAK. Lihat docs/ASSET_PIPELINE.md.
 * Diizinkan: Public Domain (PD, PD-old, PD-Indonesia, PD-art), CC0, CC BY, CC BY-SA.
 * Ditolak: NC, ND, tanpa lisensi, fair use, "No restrictions" (tidak tegas), GFDL saja.
 */

export function isAllowedLicense(shortName: string | undefined | null): boolean {
  if (!shortName) return false;
  const s = shortName.toLowerCase().trim();
  if (/(^|[\s-])nc([\s-]|$)|non-?commercial|(^|[\s-])nd([\s-]|$)|no ?deriv/.test(s)) return false;
  if (/fair use|all rights reserved|copyrighted|no restrictions/.test(s)) return false;
  if (/^public domain|^pd([\s-]|$)|pd-old|pd-art|pd-indonesia|pd-us|pd-author|pd-self|^cc0|cc-zero/.test(s)) return true;
  if (/^cc[\s-]by([\s-]sa)?([\s-]\d|$)/.test(s)) return true;
  if (/^cc[\s-]by[\s-]\d|^cc[\s-]by[\s-]sa[\s-]\d/.test(s)) return true;
  return false;
}

export function licenseUrlFor(shortName: string, given?: string | null): string {
  if (given && /^https?:\/\//.test(given)) return given;
  const s = shortName.toLowerCase();
  const m = s.match(/cc[\s-]by([\s-]sa)?[\s-](\d\.\d)/);
  if (m) {
    const kind = m[1] ? "by-sa" : "by";
    return `https://creativecommons.org/licenses/${kind}/${m[2]}/`;
  }
  if (s.includes("cc0")) return "https://creativecommons.org/publicdomain/zero/1.0/";
  return "https://commons.wikimedia.org/wiki/Commons:Copyright_tags#Public_domain";
}

/** Membersihkan HTML dari metadata Commons menjadi teks polos. */
export function stripHtml(html: string | undefined | null): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractYear(raw: string | undefined | null): string | undefined {
  const t = stripHtml(raw);
  if (!t) return undefined;
  const range = t.match(/\b(1[5-9]\d\d|20[0-2]\d)\s*[-–]\s*(1[5-9]\d\d|20[0-2]\d)\b/);
  if (range) return `${range[1]}-${range[2]}`;
  const circa = t.match(/\b(1[5-9]\d\d|20[0-2]\d)s\b/);
  if (circa) return `${circa[1]}-an`;
  const y = t.match(/\b(1[5-9]\d\d|20[0-2]\d)\b/);
  return y ? y[1] : undefined;
}
