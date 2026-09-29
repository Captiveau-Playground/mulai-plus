import { ROBOTO_MEDIUM, ROBOTO_REGULAR } from "./pdf-fonts";

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
function issuedDate(): string {
  const d = new Date();
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Laporan PDF Test Minat & Bakat — SERVER-SIDE, font Roboto embedded.
 * Layout disiplin: baseline teks dihitung dari kotak (bukan tebakan), section
 * konsisten, wrap via splitTextToSize, header+footer per halaman.
 * Mengembalikan base64 PDF.
 */

const NAVY: [number, number, number] = [26, 31, 109];
const TEAL: [number, number, number] = [13, 148, 136];
const ORANGE: [number, number, number] = [254, 145, 20];
const GRAY: [number, number, number] = [120, 120, 125];
const INK: [number, number, number] = [58, 58, 66];
const TRACK: [number, number, number] = [232, 232, 237];

const PAGE_W = 210;
const M = 16;
const W = PAGE_W - M * 2;
const TOP = 40;
const BOTTOM = 264; // bagian atas footer zone

const FS = { hero: 19, section: 13, sub: 11, body: 9.8, small: 8.6, cap: 7.6 };
// leading dalam mm; baseline teks relatif kotak = size*0.35
const LEAD = { hero: 8, section: 6.2, sub: 5.2, body: 4.6, small: 4.1, cap: 3.6 };

const HOLLAND_NAME: Record<string, string> = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};
const ABILITY_NAME: Record<string, string> = {
  numerical: "Numerik",
  verbal: "Verbal",
  logical: "Logika",
  spatial: "Spasial",
  clerical: "Ketelitian",
};

export interface TmbReportData {
  studentName: string;
  schoolName?: string | null;
  hollandCode: string;
  hollandScores: Record<string, number>;
  abilityScores: Record<string, { correct: number; total: number }>;
  abilityLevels: Record<string, string>;
  differentiation: string;
  confidenceScore: string;
  majors: { itemName: string; confidence: string; prodiRefs?: { prodi: string; university: string }[] }[];
  careers: string[];
  summary?: string | null;
}

export async function generateTmbReportPdf(report: TmbReportData): Promise<string> {
  const { jsPDF: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR);
  doc.addFileToVFS("Roboto-Medium.ttf", ROBOTO_MEDIUM);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.addFont("Roboto-Medium.ttf", "Roboto", "bold");

  let y = 0;
  const pageCount = () => doc.getNumberOfPages();

  const ensure = (needed: number) => {
    if (y + needed > BOTTOM) {
      doc.addPage();
      header();
      footer();
      y = TOP;
    }
  };

  /** Teks ter-wrap; baseline disesuaikan. Menulis dari `top= y` → y += lead*l. */
  const put = (
    txt: string,
    o: {
      size?: keyof typeof FS;
      color?: [number, number, number];
      style?: "normal" | "bold";
      x?: number;
      w?: number;
      gap?: number;
    } = {},
  ) => {
    const size = (o.size ?? "body") as keyof typeof FS;
    const lead = LEAD[size];
    const x = o.x ?? M;
    const width = o.w ?? W;
    doc.setFont("Roboto", o.style ?? "normal");
    doc.setFontSize(FS[size]);
    doc.setTextColor(...(o.color ?? INK));
    const lines = doc.splitTextToSize(txt.replace(/\*\*/g, "").replace(/#+\s*/g, ""), width) as string[];
    for (const line of lines) {
      ensure(lead * 1.05);
      doc.text(line, x, y);
      y += lead;
    }
  };

  const section = (t: string) => {
    ensure(16);
    doc.setFillColor(...ORANGE);
    doc.rect(M, y - 4.6, 1.2, 4.8, "F");
    doc.setFont("Roboto", "bold");
    doc.setFontSize(FS.section);
    doc.setTextColor(...NAVY);
    doc.text(t, M + 3.2, y);
    y += LEAD.section;
  };

  const header = () => {
    if (pageCount() === 1) {
      doc.setFillColor(...NAVY);
      doc.rect(0, 0, PAGE_W, 26, "F");
      doc.setFillColor(...ORANGE);
      doc.rect(0, 26, PAGE_W, 1.4, "F");
      doc.setFont("Roboto", "bold");
      doc.setFontSize(FS.hero);
      doc.setTextColor(255, 255, 255);
      doc.text("Laporan Hasil Test Minat Bakat", M, 12);
      doc.setFont("Roboto", "normal");
      doc.setFontSize(10);
      doc.setTextColor(224, 226, 236);
      doc.text("Test by MULAI+ — Kenali Minat & Bakatmu", M, 18.5);
      doc.setFontSize(8);
      doc.setTextColor(198, 200, 214);
      doc.text(`Diterbitkan: ${issuedDate()}`, M, 23.3);
    }
  };

  const footer = () => {
    const n = pageCount();
    doc.setPage(n);
    doc.setDrawColor(226, 227, 232);
    doc.setLineWidth(0.25);
    doc.line(M, 283, PAGE_W - M, 283);
    doc.setFont("Roboto", "normal");
    doc.setFontSize(7.4);
    doc.setTextColor(...GRAY);
    doc.text("Test by MULAI+ · mulaiplus.id", M, 288);
    doc.text(`${n} / ${n}`, PAGE_W - M, 288, { align: "right" });
  };

  /** Kotak bar + label di dalam — baseline dihitung dari box: teks baseline = top + h*0.5 + fs*0.35. */
  const bar = (
    top: number,
    labelText: string,
    trackX: number,
    trackW: number,
    pct: number,
    fill: [number, number, number],
    rightText?: string,
  ) => {
    const h = 4.6;
    doc.setFont("Roboto", "normal");
    doc.setFontSize(9.2);
    doc.setTextColor(...INK);
    doc.text(labelText, M, top + h * 0.5 + 3.2);
    doc.setFillColor(...TRACK);
    doc.roundedRect(trackX, top, trackW, h, 1.0, 1.0, "F");
    const w = Math.max(Math.min(pct, 100), 0) * trackW;
    if (w > 0.8) {
      doc.setFillColor(...fill);
      doc.roundedRect(trackX, top, w, h, 1.0, 1.0, "F");
    }
    if (rightText) {
      doc.setFontSize(7.6);
      doc.setTextColor(...GRAY);
      doc.text(rightText, Math.min(trackX + w + 1.5, PAGE_W - M - 8), top + h * 0.5 + 2.8);
    }
  };

  // ── Sampul/header halaman 1 ──
  header();
  y = TOP;

  section("Identitas Peserta");
  put(`Nama: ${report.studentName || "-"}`, { size: "body" });
  put(`Sekolah: ${report.schoolName || "-"}`, { size: "body", gap: 0.5 });
  y += 2.4;

  // ── 1. RIASEC ──
  section("1. Profil Minat (Holland RIASEC)");
  const dims = ["R", "I", "A", "S", "E", "C"];
  const code = report.hollandCode ?? "---";
  const maxScore = Math.max(...dims.map((d) => report.hollandScores?.[d] ?? 0), 0.1);
  const lw = 34; // lebar label
  const trackX = M + lw;
  const trackW = W - lw;
  y += 1.6;
  dims.forEach((d) => {
    ensure(10);
    const score = report.hollandScores?.[d] ?? 0;
    const pct = (score / maxScore) * 100;
    const isTop = code.includes(d);
    bar(
      y,
      `${d} · ${HOLLAND_NAME[d] ?? ""}`,
      trackX,
      trackW,
      pct,
      isTop ? TEAL : [176, 177, 186],
      `${Math.round(score * 100)}%`,
    );
    y += 7.4;
  });
  y += 2.4;

  put(`Kode Minat: ${code}`, { size: "sub", color: TEAL, style: "bold", w: W - 60 });
  const dLabel =
    report.differentiation === "strong"
      ? "Tinggi"
      : report.differentiation === "moderate"
        ? "Sedang"
        : "Perlu Eksplorasi";
  put(`Kejelasan: ${dLabel} · Confidence ${report.confidenceScore}%`, { size: "small", color: GRAY });
  y += 3;

  // ── 2. Ability ──
  section("2. Profil Kemampuan");
  y += 1.6;
  Object.entries(ABILITY_NAME).forEach(([key, label]) => {
    ensure(9);
    const s = report.abilityScores?.[key] ?? { correct: 0, total: 0 };
    const level = report.abilityLevels?.[key] ?? "medium";
    const pct = s.total ? (s.correct / s.total) * 100 : 0;
    const color: [number, number, number] =
      level === "high" ? [34, 197, 94] : level === "medium" ? [245, 158, 11] : [248, 113, 113];
    const lvl = level === "high" ? "Tinggi" : level === "medium" ? "Sedang" : "Perlu Pengembangan";
    bar(y, label, M + 36, W - 36, pct, color, `${s.correct}/${s.total} · ${lvl}`);
    y += 7.2;
  });
  y += 3;

  // ── 3. Rekomendasi ──
  section("3. Rekomendasi Jurusan & Karier");
  y += 1.6;
  report.majors.slice(0, 5).forEach((m, i) => {
    ensure(16);
    doc.setFont("Roboto", "bold");
    doc.setFontSize(10.2);
    doc.setTextColor(...NAVY);
    doc.text(`${i + 1}. ${m.itemName}`, M, y);
    doc.setFont("Roboto", "normal");
    doc.setFontSize(8.4);
    doc.setTextColor(...ORANGE);
    doc.text(`Kecocokan ${m.confidence}%`, PAGE_W - M, y, { align: "right" });
    y += 5.2;
    const prodi = (m.prodiRefs ?? []).slice(0, 2);
    if (prodi.length) {
      doc.setFontSize(8.4);
      doc.setTextColor(...GRAY);
      doc.text(`Contoh: ${prodi.map((p) => `${p.prodi} — ${p.university}`).join("   •   ")}`, M + 6, y, {
        maxWidth: W - 6,
      });
      y += 4.4;
    }
    y += 2;
  });
  y += 2;

  if (report.careers.length) {
    put("Karier yang cocok:", { size: "sub", color: NAVY, style: "bold" });
    put(report.careers.slice(0, 6).join("  •  "), { size: "body" });
    y += 2;
  }
  if (report.summary) {
    section("4. Ringkasan AI");
    put(report.summary, { size: "body" });
    y += 3;
  }

  // ── Disclaimer ──
  ensure(12);
  doc.setDrawColor(226, 227, 232);
  doc.setLineWidth(0.25);
  doc.line(M, y, PAGE_W - M, y);
  y += 5.4;
  put(
    "Disclaimer: Laporan ini merupakan alat bantu eksplorasi minat-bakat non-klinis dan bukan pengganti asesmen psikologi profesional. Hasil rekomendasi bersifat referensi berdasarkan data program studi di MULAI+.",
    { size: "cap", color: GRAY },
  );
  put("Dibuat oleh Test by MULAI+ · mulaiplus.id", { size: "cap", color: [176, 177, 184] });

  // footer nomor halaman benar (current/total)
  const total = pageCount();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 227, 232);
    doc.setLineWidth(0.25);
    doc.line(M, 283, PAGE_W - M, 283);
    doc.setFont("Roboto", "normal");
    doc.setFontSize(7.4);
    doc.setTextColor(...GRAY);
    doc.text("Test by MULAI+ · mulaiplus.id", M, 288);
    doc.text(`${i} / ${total}`, PAGE_W - M, 288, { align: "right" });
  }

  const ab = doc.output("arraybuffer") as ArrayBuffer;
  const bytes = new Uint8Array(ab);
  // base64 — worker/browser: chunked btoa; node: Buffer
  if (typeof globalThis.btoa === "function") {
    let bin = "";
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) {
      bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CH)) as unknown as number[]);
    }
    return globalThis.btoa(bin);
  }
  return Buffer.from(bytes).toString("base64");
}
