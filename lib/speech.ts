/**
 * Bacakan (docs/PETA_WAKTU.md bagian 7): membacakan judul dan narasi dengan Web Speech API,
 * memakai suara id-ID atau en-US sesuai bahasa. Tidak memuat apa pun dari luar.
 */
export const speechSupported = (): boolean => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}

export function speak(text: string, _lang?: "id" | "en", onEnd?: () => void): boolean {
  if (!speechSupported()) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "id-ID";
  u.rate = 0.95;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
  return true;
}
