/** Tebak jenjang dari nama sekolah — dipakai untuk isian otomatis profil siswa. */
export function levelFromSchoolName(name: string | null | undefined): string {
  const n = (name ?? "").toUpperCase();
  if (/\bSMK\b|SEKOLAH MENENGAH KEJURUAN/.test(n)) return "SMK";
  if (/\bSMP\b|SEKOLAH MENENGAH PERTAMA|\bMTS\b|MADRASAH TSANAWIYAH/.test(n)) return "SMP";
  if (UNIVERSITY.test(n)) return "Universitas";
  if (/\bSMA\b|SEKOLAH MENENGAH ATAS|\bMA\b|MADRASAH ALIYAH/.test(n)) return "SMA";
  return "SMA";
}

const UNIVERSITY = /UNIVERSITAS|INSTITUT|POLITEKNIK|\bUIN\b|\bITB\b|\bUGM\b|\bUNESA\b|\bUNAIR\b/;
