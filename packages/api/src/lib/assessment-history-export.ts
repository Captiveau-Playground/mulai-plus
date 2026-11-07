/**
 * Ekspor HASIL assessment (bukan bank soal) → workbook siap tulis.
 *
 * Bentuk yang diminta admin: **1 baris = 1 orang + 1 percobaan tes**, lalu ke kanan
 * kolomnya adalah item soal (Q1..Qn), lengkap dengan versi soal, output profil, dan
 * confidence score.
 *
 * Murni (tanpa DB, tanpa `xlsx`) supaya bisa diuji unit; penulisan file ada di web.
 */

export interface ExportAnswer {
  questionId: string;
  optionId?: string | null;
  text?: string | null;
  score?: number | null;
}

export interface ExportRow {
  studentId: string;
  name: string;
  email: string;
  isGuest: boolean;
  source: string;
  schoolName: string;
  batchName: string;
  testCode: string;
  testName: string;
  family: string | null;
  versionNumber: number | null;
  versionStatus: string;
  sessionId: string;
  versionId: string;
  startedAt: Date | string | null;
  finishedAt: Date | string | null;
  status: string;
  profileCode: string | null;
  topDimensions: string[];
  rawScores: Record<string, number>;
  timedOut: boolean;
  xpEarned: number;
  recommendations: { rank: number; name: string; confidence: number }[];
  confidenceProfile: string | null;
  differentiation: string | null;
  confidenceMatch: { attemptId: string; createdAt: Date | string | null } | null;
  answers: ExportAnswer[];
}

export interface ExportQuestion {
  id: string;
  versionId: string;
  order: number;
  code: string;
  text: string;
  type: string;
  dimensionId: string;
  presentationMode?: string | null;
}

export interface ExportOption {
  id: string;
  questionId: string;
  value: string;
  label: string;
  score: number;
}

export interface ExportDimension {
  id: string;
  versionId: string;
  code: string;
  name: string;
}

export interface ExportData {
  generatedAt: string;
  total: number;
  /** Jumlah baris hasil di sistem (termasuk yang tidak punya sesi/jawaban). */
  totalResults?: number;
  offset: number;
  limit: number;
  rows: ExportRow[];
  questions: ExportQuestion[];
  options: ExportOption[];
  dimensions: ExportDimension[];
}

export type Cell = string | number | boolean;
export type Aoa = Cell[][];
export interface Sheet {
  name: string;
  rows: Aoa;
}

/** Kolom identitas + hasil, sebelum kolom item soal Q1..Qn. */
export const PREFIX_COLUMNS = [
  "Nama",
  "Email",
  "ID Siswa",
  "Sumber",
  "Sekolah",
  "Batch",
  "Percobaan ke",
  "Tes",
  "Kode Tes",
  "Keluarga",
  "Versi Soal",
  "Status Versi",
  "Sesi",
  "Mulai",
  "Selesai",
  "Durasi (menit)",
  "Status Sesi",
  "Timeout",
  "Profil (kode)",
  "Dimensi Teratas",
  "Skor Mentah",
  "Differentiation",
  "Confidence (profil)",
  "Confidence (rekomendasi #1)",
  "Rekomendasi #1",
  "Rekomendasi #2",
  "Rekomendasi #3",
  "Dijawab",
  "Total Skor",
] as const;

const pad = (n: number) => String(n).padStart(2, "0");
const fmtDate = (d: Date | string | null | undefined): string => {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
};

const minutes = (a: Date | string | null, b: Date | string | null): number | "" => {
  if (!a || !b) return "";
  const start = a instanceof Date ? a : new Date(a);
  const end = b instanceof Date ? b : new Date(b);
  const ms = end.getTime() - start.getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  return Math.round(ms / 6000) / 10;
};

const scoresText = (m: Record<string, number> | null | undefined): string =>
  m && Object.keys(m).length
    ? Object.entries(m)
        .map(([k, v]) => `${k}:${v}`)
        .join(" · ")
    : "";

/** Label jawaban: "B. Ide kreatif" / "4 — Suka" / teks bebas. */
export function answerLabel(a: ExportAnswer | undefined, opts: Map<string, ExportOption>): string {
  if (!a) return "";
  if (a.text?.trim()) return a.text.trim();
  if (!a.optionId) return "";
  const o = opts.get(a.optionId);
  if (!o) return "";
  const letter = (o.value ?? "").toUpperCase();
  const label = (o.label ?? "").trim();
  if (!label) return letter;
  return letter ? `${letter}. ${label}` : label;
}

/** Kunci tes + versi: dipakai untuk mengelompokkan sheet & kolom soal. */
export function testKey(r: ExportRow): string {
  return `${r.testCode || "TANPA-KODE"} v${r.versionNumber ?? "?"}`;
}

/**
 * Baris satu sheet tes: identitas + Q1..Qn.
 * Kolom soal diambil dari item versi yang dipakai baris tersebut, diurutkan `order`;
 * bila satu sheet memuat beberapa versi, jumlah kolom = versi dengan item terbanyak.
 */
export function buildTestSheet(testRows: ExportRow[], data: ExportData, attemptNumbers?: Map<string, number>): Aoa {
  const optsById = new Map(data.options.map((o) => [o.id, o]));
  const dimById = new Map(data.dimensions.map((d) => [d.id, d]));

  const questionsByVersion = new Map<string, ExportQuestion[]>();
  for (const q of [...data.questions].sort((a, b) => a.order - b.order)) {
    const list = questionsByVersion.get(q.versionId) ?? [];
    list.push(q);
    questionsByVersion.set(q.versionId, list);
  }

  const maxItems = Math.max(0, ...testRows.map((r) => (questionsByVersion.get(r.versionId) ?? []).length));
  const headers: Cell[] = [...PREFIX_COLUMNS];
  for (let i = 1; i <= maxItems; i++) headers.push(`Q${i}`);

  const sorted = [...testRows].sort((a, b) => {
    const ta = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
    const tb = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
    return ta - tb;
  });
  // nomor percobaan per (orang, kode tes) — lintas versi, dihitung pemanggil
  const attemptNo = attemptNumbers ?? numberAttempts(testRows);

  const rows: Aoa = [headers];
  for (const r of sorted) {
    const items = questionsByVersion.get(r.versionId) ?? [];
    const qPos = new Map(items.map((q, i) => [q.id, i]));
    const answersByQuestion = new Map(r.answers.map((a) => [a.questionId, a]));
    const totalScore = r.answers.reduce((sum, a) => sum + (a.score ?? 0), 0);
    const recos = [...r.recommendations].sort((a, b) => a.rank - b.rank);
    const dimsTop = (r.topDimensions ?? [])
      .map((t) => dimById.get(t)?.code ?? t)
      .filter(Boolean)
      .join("-");

    const row: Cell[] = [
      r.name,
      r.email,
      r.studentId,
      r.source,
      r.schoolName,
      r.batchName,
      attemptNo.get(r.sessionId) ?? 1,
      r.testName,
      r.testCode,
      r.family ?? "",
      r.versionNumber ?? "",
      r.versionStatus,
      r.sessionId,
      fmtDate(r.startedAt),
      fmtDate(r.finishedAt),
      minutes(r.startedAt, r.finishedAt),
      r.status,
      r.timedOut ? "ya" : "tidak",
      r.profileCode ?? "",
      dimsTop,
      scoresText(r.rawScores),
      r.differentiation ?? "",
      r.confidenceProfile ?? "",
      recos[0]?.confidence != null ? recos[0].confidence : "",
      recos[0] ? `${recos[0].name} (${recos[0].confidence}%)` : "",
      recos[1] ? `${recos[1].name} (${recos[1].confidence}%)` : "",
      recos[2] ? `${recos[2].name} (${recos[2].confidence}%)` : "",
      r.answers.length,
      totalScore,
    ];

    const answerCols: Cell[] = new Array(maxItems).fill("");
    for (const [qid, pos] of qPos) answerCols[pos] = answerLabel(answersByQuestion.get(qid), optsById);
    rows.push([...row, ...answerCols]);
  }

  return rows;
}

/** Sheet "Soal": peta Q1..Qn → teks item per versi, supaya kolom bisa dibaca. */
export function buildQuestionSheet(testRows: ExportRow[], data: ExportData): Aoa {
  const byVersion = new Map<string, ExportRow>();
  for (const r of testRows) if (!byVersion.has(r.versionId)) byVersion.set(r.versionId, r);
  const dimById = new Map(data.dimensions.map((d) => [d.id, d]));
  const optsByQuestion = new Map<string, ExportOption[]>();
  for (const o of data.options) {
    const list = optsByQuestion.get(o.questionId) ?? [];
    list.push(o);
    optsByQuestion.set(o.questionId, list);
  }

  const rows: Aoa = [
    [
      "Kode Tes",
      "Versi Soal",
      "Status Versi",
      "Q",
      "Kode Soal",
      "Dimensi",
      "Tipe",
      "Teks Soal",
      "Opsi A",
      "Opsi B",
      "Opsi C",
      "Opsi D",
      "Opsi E",
      "Opsi F",
    ],
  ];

  for (const [versionId, ref] of byVersion) {
    const items = data.questions.filter((q) => q.versionId === versionId).sort((a, b) => a.order - b.order);
    items.forEach((q, i) => {
      const opts = (optsByQuestion.get(q.id) ?? []).sort((a, b) => a.value.localeCompare(b.value));
      const cells = ["A", "B", "C", "D", "E", "F"].map((L) => {
        const o = opts.find((x) => (x.value ?? "").toUpperCase() === L);
        return o ? o.label : "";
      });
      rows.push([
        ref.testCode,
        ref.versionNumber ?? "",
        ref.versionStatus,
        `Q${i + 1}`,
        q.code,
        dimById.get(q.dimensionId)?.code ?? "",
        q.type,
        q.text,
        ...cells,
      ]);
    });
  }

  return rows;
}

/** Nomor percobaan per (orang, kode tes), urut kronologis — dipakai lintas versi. */
export function numberAttempts(rows: ExportRow[]): Map<string, number> {
  const sorted = [...rows].sort((a, b) => {
    const ta = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
    const tb = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
    return ta - tb;
  });
  const counter = new Map<string, number>();
  const out = new Map<string, number>();
  for (const r of sorted) {
    const key = `${r.studentId}::${r.testCode}`;
    const n = (counter.get(key) ?? 0) + 1;
    counter.set(key, n);
    out.set(r.sessionId, n);
  }
  return out;
}

export function buildGuideRows(data: ExportData, sheets: { name: string; count: number }[]): Aoa {
  return [
    ["Ekspor hasil assessment — MULAI+"],
    [],
    ["Dibuat", fmtDate(data.generatedAt)],
    ["Percobaan diekspor", data.rows.length],
    ["Total percobaan di sistem", data.total],
    ...(data.totalResults
      ? [
          [
            "Catatan cakupan",
            `${data.totalResults} baris hasil ada di sistem; hanya yang punya sesi tes (jawaban tersimpan) yang bisa diekspor.`,
          ] as Cell[],
        ]
      : []),
    ["Sheet per tes", sheets.map((s) => `${s.name} (${s.count} percobaan)`).join(" · ")],
    [],
    ["Cara baca"],
    ["1 baris", "1 orang + 1 percobaan tes (satu sesi tes yang selesai)."],
    ["Percobaan ke", "Urutan percobaan orang tersebut (1 = pertama)."],
    ["Versi Soal", "Nomor versi bank soal yang dipakai percobaan itu — item di kolom Q mengikuti versi ini."],
    ["Q1..Qn", "Jawaban peserta per item, urut tampil saat tes. Format: 'B. teks opsi' / teks isian."],
    ["Sheet Soal", "Peta Q1..Qn → teks item, dimensi, dan opsi untuk setiap versi."],
    [],
    ["Profil & confidence"],
    ["Profil (kode)", "Hasil engine: kode dimensi teratas (mis. I-A-S)."],
    ["Dimensi Teratas", "Kode dimensi hasil profil (versi kode, bukan nama)."],
    ["Skor Mentah", "Skor per id dimensi. Id bisa dicocokkan lewat sheet Soal (kolom Dimensi)."],
    ["Confidence (profil)", "confidence score baris hasil profil (0–100). Dicocokkan ke percobaan lewat user + waktu."],
    ["Confidence (rekomendasi #1)", "Skor keyakinan rekomendasi jurusan peringkat 1 — terikat langsung ke sesi ini."],
    ["Differentiation", "strong / moderate / weak — seberapa tegas selisih dimensi teratas."],
    [],
    ["Catatan"],
    [
      "Pencocokan",
      "Confidence (profil) & differentiation berasal dari baris hasil yang paling dekat waktunya dengan sesi.",
    ],
    ["Timeout", "Sesi yang ditutup karena waktu habis tetap diekspor (status timeout)."],
    ["Kosong", "Kolom Q kosong = item tidak dijawab pada percobaan itu."],
    ["Guest", 'Nama "Guest" = percobaan tanpa akun/roster aktif; pakai kolom ID Siswa untuk melacak.'],
  ] as Aoa;
}

/** Susun semua sheet: satu sheet per (kode tes + versi). */
export function buildHistorySheets(data: ExportData): Sheet[] {
  const groups = new Map<string, ExportRow[]>();
  for (const r of data.rows) {
    const key = testKey(r);
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  const attemptNos = numberAttempts(data.rows);
  const sheets: Sheet[] = [];
  for (const [key, rows] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const name = key.replace(/[\\/*?:[\]]/g, "-").slice(0, 31) || "HASIL";
    sheets.push({ name, rows: buildTestSheet(rows, data, attemptNos) });
  }

  sheets.push({ name: "Soal", rows: buildQuestionSheet(data.rows, data) });
  sheets.push({
    name: "Petunjuk",
    rows: buildGuideRows(
      data,
      sheets.map((s) => ({ name: s.name, count: (groups.get(s.name) ?? []).length || 0 })),
    ),
  });
  return sheets;
}
