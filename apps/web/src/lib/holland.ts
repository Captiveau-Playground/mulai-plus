// Meta tipe Holland (RIASEC) — satu sumber untuk semua halaman yang menampilkan kode minat.
// Sebelumnya label & warna disalin di 5+ tempat dengan varian berbeda.

export interface HollandMeta {
  code: string;
  name: string;
  /** ringkasan singkat untuk tooltip/keterangan */
  desc: string;
  /** kelas tailwind untuk teks */
  text: string;
  /** kelas tailwind untuk latar lembut (badge) */
  soft: string;
  /** kelas tailwind untuk bar/aksen */
  bar: string;
}

export const HOLLAND_ORDER = ["R", "I", "A", "S", "E", "C"] as const;

const META: Record<string, Omit<HollandMeta, "code">> = {
  R: {
    name: "Realistic",
    desc: "Praktis, alat & benda, aktivitas fisik",
    text: "text-sky-700",
    soft: "bg-sky-50 border-sky-200",
    bar: "bg-sky-500",
  },
  I: {
    name: "Investigative",
    desc: "Analisis, riset, pemecahan masalah",
    text: "text-violet-700",
    soft: "bg-violet-50 border-violet-200",
    bar: "bg-violet-500",
  },
  A: {
    name: "Artistic",
    desc: "Kreatif, ekspresi, estetika",
    text: "text-pink-700",
    soft: "bg-pink-50 border-pink-200",
    bar: "bg-pink-500",
  },
  S: {
    name: "Social",
    desc: "Membantu, mengajar, berinteraksi",
    text: "text-teal-700",
    soft: "bg-teal-50 border-teal-200",
    bar: "bg-teal-500",
  },
  E: {
    name: "Enterprising",
    desc: "Memimpin, memengaruhi, berbisnis",
    text: "text-amber-700",
    soft: "bg-amber-50 border-amber-200",
    bar: "bg-amber-500",
  },
  C: {
    name: "Conventional",
    desc: "Teratur, teliti, prosedural",
    text: "text-indigo-700",
    soft: "bg-indigo-50 border-indigo-200",
    bar: "bg-indigo-500",
  },
};

/** Meta satu kode; kode tak dikenal tetap aman (fallback netral). */
export function holland(code?: string | null): HollandMeta {
  const key = (code ?? "").trim().charAt(0).toUpperCase();
  const m = META[key];
  if (!m) {
    return {
      code: key || "?",
      name: key || "Tidak diketahui",
      desc: "",
      text: "text-gray-600",
      soft: "bg-gray-100 border-gray-200",
      bar: "bg-gray-400",
    };
  }
  return { code: key, ...m };
}

/** "RIA" → "Realistic · Investigative · Artistic" */
export function hollandNames(code?: string | null): string {
  return (code ?? "")
    .split("")
    .filter((c) => c.trim())
    .map((c) => holland(c).name)
    .join(" · ");
}
