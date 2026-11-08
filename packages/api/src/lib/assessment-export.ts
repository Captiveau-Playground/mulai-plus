/**
 * Ekspor soal versi assessment → baris spreadsheet (AoA).
 *
 * Murni (tanpa DB, tanpa `xlsx`) supaya bisa diuji unit dan dipakai di browser.
 * Kolom mengikuti kontrak fitur "Import Soal" (`TEMPLATE_COLUMNS`) lalu ditambah
 * kolom lanjutan yang dibaca importer bila ada — jadi file hasil ekspor bisa
 * diedit di Excel dan diimpor ulang tanpa kehilangan media/target/ikon/skor.
 */

const LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

/** 15 kolom kontrak import (urutan wajib sama dengan TEMPLATE_COLUMNS). */
export const BASE_COLUMNS = [
  "Teks",
  "Dimensi",
  "Tipe",
  "Opsi A",
  "Opsi B",
  "Opsi C",
  "Opsi D",
  "Opsi E",
  "Opsi F",
  "Kunci",
  "Bobot",
  "Kunci Isian",
  "Cara nilai",
  "Toleransi",
  "Tampilan",
] as const;

/** Kolom lanjutan (aditif; importer mengabaikan yang tidak ada). */
export const EXTRA_COLUMNS = [
  "Kode",
  "Durasi",
  "Aktif",
  "Media URL",
  "Media Tipe",
  "Media Caption",
  ...LETTERS.map((l) => `Target ${l}`),
  ...LETTERS.map((l) => `Ikon ${l}`),
  ...LETTERS.map((l) => `Skor ${l}`),
  ...LETTERS.map((l) => `Gambar ${l}`),
  ...LETTERS.map((l) => `Caption Gambar ${l}`),
] as const;

export const EXPORT_COLUMNS = [...BASE_COLUMNS, ...EXTRA_COLUMNS] as const;

export interface ExportQuestion {
  id: string;
  dimensionId: string;
  questionText: string;
  questionType: string;
  presentationMode?: string | null;
  weight?: number | null;
  questionCode?: string | null;
  durationSeconds?: number | null;
  isActive?: boolean | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaCaption?: string | null;
  displayOrder?: number | null;
}

export interface ExportOption {
  questionId: string;
  optionValue: string;
  label: string;
  targetDimension?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
  imageCaption?: string | null;
  score?: number | null;
  displayOrder?: number | null;
}

export interface ExportTextConfig {
  questionId: string;
  evaluationType: string;
  answerKey: string;
  numericTolerance?: string | null;
}

export interface ExportDimension {
  id: string;
  code: string;
  name: string;
}

export interface ExportContent {
  questions: ExportQuestion[];
  options: ExportOption[];
  textConfigs: ExportTextConfig[];
  dimensions: ExportDimension[];
}

export interface ExportMeta {
  name: string;
  code: string;
  versionNumber: number;
  status: string;
  config?: Record<string, unknown> | null;
}

export type Cell = string | number | boolean;
export type Aoa = Cell[][];

/** Tipe soal → label yang dikenali importer (`pilihan`/`isian`/`skala`). */
export function tipeLabel(questionType: string): string {
  if (questionType === "text_input") return "isian (mengetik)";
  if (questionType === "likert") return "skala (likert)";
  return "pilihan ganda";
}

/** `evaluationType` → label `Cara nilai`. */
export function evalLabel(evaluationType?: string | null): string {
  switch (evaluationType) {
    case "keyword_match":
      return "kata";
    case "pattern_match":
      return "pola";
    case "numeric_tolerance":
      return "angka";
    case "exact_match":
      return "persis";
    default:
      return "";
  }
}

/** `presentationMode` → label `Tampilan`. */
export function tampilanLabel(presentationMode?: string | null): string {
  switch (presentationMode) {
    case "emoji_option":
      return "emoji";
    case "image_option":
      return "gambar";
    case "visual_comparison":
      return "banding";
    case "standard_option_card":
      return "standar";
    default:
      return "";
  }
}

/** Huruf kunci = opsi pertama yang berskor > 0 (kontrak import hanya satu kunci). */
export function keyLetter(options: ExportOption[]): string {
  const hit = options.find((o) => (o.score ?? 0) > 0);
  return (hit?.optionValue ?? "").toUpperCase().slice(0, 1);
}

function byLetter(options: ExportOption[]): Map<string, ExportOption> {
  const m = new Map<string, ExportOption>();
  for (const o of options) m.set((o.optionValue ?? "").toUpperCase().slice(0, 1), o);
  return m;
}

const s = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

/**
 * Satu baris per soal, urutan kolom = EXPORT_COLUMNS.
 * `includeInactive: false` (default) hanya mengekspor soal aktif.
 */
export function buildQuestionRows(content: ExportContent, opts?: { includeInactive?: boolean }): Aoa {
  const includeInactive = opts?.includeInactive ?? false;
  const dimById = new Map(content.dimensions.map((d) => [d.id, d]));
  const optsByQuestion = new Map<string, ExportOption[]>();
  for (const o of content.options) {
    const list = optsByQuestion.get(o.questionId) ?? [];
    list.push(o);
    optsByQuestion.set(o.questionId, list);
  }
  const textByQuestion = new Map(content.textConfigs.map((t) => [t.questionId, t]));

  const questions = [...content.questions]
    .filter((q) => includeInactive || q.isActive !== false)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  const rows: Aoa = [Array.from(EXPORT_COLUMNS) as Cell[]];

  for (const q of questions) {
    const qOpts = (optsByQuestion.get(q.id) ?? []).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    const map = byLetter(qOpts);
    const tc = textByQuestion.get(q.id);
    const dim = dimById.get(q.dimensionId);
    const isLikert = q.questionType === "likert";
    const isText = q.questionType === "text_input";

    const base: Cell[] = [
      q.questionText ?? "",
      dim?.code ?? dim?.name ?? "",
      tipeLabel(q.questionType),
      ...LETTERS.map((l) => (isText ? "" : (map.get(l)?.label ?? ""))),
      isText || isLikert ? "" : keyLetter(qOpts),
      q.weight ?? 1,
      isText ? (tc?.answerKey ?? "") : "",
      isText ? evalLabel(tc?.evaluationType) : "",
      isText && tc?.evaluationType === "numeric_tolerance" ? s(tc?.numericTolerance ?? "0.01") : "",
      tampilanLabel(q.presentationMode),
    ];

    const extra: Cell[] = [
      q.questionCode ?? "",
      q.durationSeconds ?? "",
      q.isActive === false ? "tidak" : "ya",
      q.mediaUrl ?? "",
      q.mediaType ?? "",
      q.mediaCaption ?? "",
      ...LETTERS.map((l) => map.get(l)?.targetDimension ?? ""),
      ...LETTERS.map((l) => map.get(l)?.icon ?? ""),
      ...LETTERS.map((l) => (map.get(l) ? (map.get(l)?.score ?? 0) : "")),
      ...LETTERS.map((l) => map.get(l)?.imageUrl ?? ""),
      ...LETTERS.map((l) => map.get(l)?.imageCaption ?? ""),
    ];

    rows.push([...base, ...extra]);
  }

  return rows;
}

const CONFIG_LABELS: Record<string, string> = {
  total_dim: "Jumlah dimensi",
  result_dim_count: "Dimensi yang ditampilkan di hasil",
  min_q_per_dim: "Minimal soal per dimensi",
  randomize_q: "Acak urutan soal",
  randomize_a: "Acak urutan pilihan",
  timer_enabled: "Timer aktif",
  timer_scope: "Cakupan timer",
  timer_minutes: "Durasi timer (menit)",
  allow_pause: "Boleh dijeda",
  scoring_method: "Metode penilaian",
  section_mode: "Mode bagian",
};

/** Sheet "Konfigurasi": aturan versi + daftar dimensi (informatif saat ini). */
export function buildConfigRows(meta: ExportMeta, dims: ExportDimension[]): Aoa {
  const rows: Aoa = [
    ["Kunci", "Nilai", "Arti"],
    ["Tes", meta.name, meta.code],
    ["Versi", `v${meta.versionNumber}`, meta.status],
  ];
  const cfg = (meta.config ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(cfg)) {
    rows.push([k, typeof v === "object" ? JSON.stringify(v) : (v as Cell), CONFIG_LABELS[k] ?? ""]);
  }
  rows.push([]);
  rows.push(["Dimensi", "Nama", "Kode"]);
  for (const d of dims) rows.push([d.code, d.name, d.code]);
  return rows;
}

/** Sheet "Petunjuk": cara pakai + apa yang tidak bisa dipulihkan lewat Excel. */
export function buildGuideRows(meta: ExportMeta, questionCount: number): Aoa {
  return [
    [`Ekspor soal — ${meta.name} (${meta.code}) · v${meta.versionNumber} · ${meta.status}`],
    [],
    ["Isi file"],
    ["Soal", `${questionCount} soal pada sheet "Soal" — urutan kolom sama dengan fitur Import Soal.`],
    ["Konfigurasi", "Aturan versi + daftar dimensi. Belum dibaca importer (atur ulang di panel Aturan tes)."],
    ["Petunjuk", "Halaman ini."],
    [],
    ["Cara pakai"],
    ["1", "Edit isi sheet Soal (jangan ubah nama/urutan kolom dasarnya)."],
    ["2", "Buka Admin → Assessment → Editor Soal, pilih tes, buat/aktifkan versi DRAFT."],
    ["3", "Klik Import Soal, pilih file ini, periksa pratinjau, lalu impor."],
    [],
    ["Penting"],
    [
      "Import = menambah",
      "Import menambahkan soal ke versi tujuan (tidak menghapus yang lama). Untuk mengganti, impor ke draft kosong.",
    ],
    [
      "Kolom lanjutan",
      "Kode · Durasi · Aktif · Media URL/Tipe/Caption · Target A–F · Ikon A–F · Skor A–F · Gambar A–F · Caption Gambar A–F.",
    ],
    ["Target A–F", "Kode dimensi tujuan skor opsi (pair/reverse). Kosong = ikut dimensi soal."],
    ["Skor A–F", "Skor tiap opsi. Bila diisi, kolom 'Kunci' diabaikan; bila kosong, dipakai 'Kunci'."],
    [
      "Gambar A–F",
      "URL aset (R2). File gambarnya tidak ikut diekspor — unggah ulang lewat Galeri bila pindah environment.",
    ],
    ["Media URL", "Lampiran soal (gambar). Sama: hanya URL, bukan filenya."],
  ] as Aoa;
}
