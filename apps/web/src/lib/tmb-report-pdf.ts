import { format } from "date-fns";
import { id } from "date-fns/locale";

/**
 * Laporan PDF Test Minat & Bakat — tata letak terdisiplin (konsisten).
 *
 * Prinsip:
 *  - SEMUA teks melewati splitTextToSize (wrap) + leading proporsional font-size.
 *  - Ukuran font bertahap (tokens), spacing tetap per prompt tipografi, bukan y manual acak.
 *  - Page-break terukur (diukur dari tinggi blok), header pertama + footer per halaman.
 *  - Bar label tidak pernah meluber: label % ditempatkan aman di dalam kartu.
 */

const NAVY: [number, number, number] = [26, 31, 109];
const TEAL: [number, number, number] = [13, 148, 136];
const ORANGE: [number, number, number] = [254, 145, 20];
const GRAY: [number, number, number] = [120, 120, 120];
const INK: [number, number, number] = [58, 58, 66];

const PAGE_W = 210;
const M = 16;
const W = PAGE_W - M * 2; // lebar konten
const BOTTOM = 20; // footer zone
const TOP = 36; // mulai konten setelah header

const FS: Record<string, number> = { hero: 18, section: 13, sub: 11, body: 9.8, small: 8.6, cap: 7.6 };
const LEAD: Record<string, number> = { hero: 7.5, section: 6, sub: 5, body: 4.4, small: 3.9, cap: 3.4 };

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

export async function generateTmbReportPdf(report: TmbReportData): Promise<Blob> {
  const { default: JsPDF } = await import("jspdf");
  const { ROBOTO_REGULAR, ROBOTO_MEDIUM } = await import("@/lib/pdf-fonts");
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR);
  doc.addFileToVFS("Roboto-Medium.ttf", ROBOTO_MEDIUM);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.addFont("Roboto-Medium.ttf", "Roboto", "bold");
  const pageCount = () => doc.getNumberOfPages();
  let y = 0;

  const remaining = () => 297 - BOTTOM - y;
  const breakIf = (needed: number) => {
    if (remaining() < needed) {
      doc.addPage();
      drawChrome();
      y = TOP;
    }
  };

  /** Teks ter-wrap — mengembalikan tinggi yg dipakai & menggeser y. */
  const put = (
    txt: string,
    opts: {
      size?: keyof typeof FS | string;
      color?: [number, number, number];
      style?: "normal" | "bold" | "italic";
      x?: number;
      w?: number;
      gap?: number;
      align?: "left" | "right" | "center";
    } = {},
  ) => {
    const size = (opts.size ?? "body") as string;
    const fs = FS[size] ?? 9.8;
    const lead = LEAD[size] ?? 4.4;
    const color = opts.color ?? INK;
    const x = opts.x ?? M;
    const width = opts.w ?? W;
    const style = opts.style ?? "normal";
    const align = opts.align ?? "left";
    doc.setFont("Roboto", style);
    doc.setFontSize(fs);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(txt.replace(/\*\*/g, "").replace(/#+\s*/g, ""), width) as string[];
    let used = 0;
    for (const line of lines) {
      breakIf(lead + (opts.gap ?? 0) * 0.4);
      doc.text(line, x, y, { align });
      y += lead;
      used += lead;
    }
    return used;
  };

  const sectionTitle = (t: string) => {
    breakIf(8 + leadOf("section"));
    doc.setFillColor(...ORANGE);
    doc.rect(M, y - 4.2, 1.4, 4.6, "F");
    doc.setFont("Roboto", "bold");
    doc.setFontSize(FS.section);
    doc.setTextColor(...NAVY);
    doc.text(t, M + 3.5, y);
    y += LEAD.section;
    return t;
  };
  const leadOf = (key: string) => LEAD[key] ?? 4.4;

  /** Garis pemisah halus + konsumsi spasi vertikal. */
  const rule = () => {
    breakIf(6);
    doc.setDrawColor(225, 226, 231);
    doc.setLineWidth(0.25);
    doc.line(M, y, PAGE_W - M, y);
    y += 5.5;
  };

  const drawChrome = () => {
    // header pertama
    if (pageCount() === 1) {
      doc.setFillColor(...NAVY);
      doc.rect(0, 0, PAGE_W, 26, "F");
      doc.setFillColor(...ORANGE);
      doc.rect(0, 26, PAGE_W, 1.6, "F");
      doc.setFont("Roboto", "bold");
      doc.setFontSize(FS.hero);
      doc.setTextColor(255, 255, 255);
      doc.text("Laporan Hasil Test Minat Bakat", M, 12);
      doc.setFont("Roboto", "normal");
      doc.setFontSize(10);
      doc.setTextColor(225, 225, 235);
      doc.text("Test by MULAI+ — Kenali Minat & Bakatmu", M, 18.5);
      doc.setFontSize(8);
      doc.setTextColor(200, 200, 212);
      doc.text(`Diterbitkan: ${format(new Date(), "dd MMMM yyyy", { locale: id })}`, M, 23.5);
    }
  };
  drawChrome();
  y = TOP;

  // ── Identitas ──
  sectionTitle("Identitas Peserta");
  put(`Nama: ${report.studentName || "-"}`, { size: "body", color: INK });
  put(`Sekolah: ${report.schoolName || "-"}`, { size: "body", color: INK, gap: 0.6 });
  y += 2.5;

  // ── RIASEC ──
  sectionTitle("1. Profil Minat (Holland RIASEC)");
  const dims = ["R", "I", "A", "S", "E", "C"];
  const code = report.hollandCode ?? "---";
  const _chartW = W;
  const barW = W - 32;
  const maxScore = Math.max(...dims.map((d) => report.hollandScores?.[d] ?? 0), 0.1);
  y += 1;
  dims.forEach((d) => {
    breakIf(7);
    const score = report.hollandScores?.[d] ?? 0;
    const w = barW * (score / maxScore);
    const isTop = code.includes(d);
    doc.setFont("Roboto", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text(`${d} · ${HOLLAND_NAME[d] ?? ""}`, M, y + 3.4);
    doc.setFillColor(232, 232, 237);
    doc.roundedRect(M + 32, y, barW, 4.4, 1.1, 1.1, "F");
    doc.setFillColor(...(isTop ? TEAL : ([176, 177, 186] as [number, number, number])));
    if (w > 1) doc.roundedRect(M + 32, y, Math.max(w, 2.2), 4.4, 1.1, 1.1, "F");
    // label % — selalu di dalam lebar bar (tidak meluber)
    doc.setFont("Roboto", "normal");
    doc.setFontSize(7.6);
    doc.setTextColor(...GRAY);
    const pct = `${Math.round(score * 100)}%`;
    const labelX = M + 32 + Math.min(w + 1.6, barW - 8);
    doc.text(pct, labelX, y + 3.2);
    y += 6.4;
  });
  y += 2;

  put(`Kode Minat: ${code}`, { size: "sub", color: TEAL, style: "bold", w: W - 20 });
  const diffLabel =
    report.differentiation === "strong"
      ? "Tinggi"
      : report.differentiation === "moderate"
        ? "Sedang"
        : "Perlu Eksplorasi";
  put(`Kejelasan minat: ${diffLabel} · Confidence: ${report.confidenceScore}%`, { size: "small", color: GRAY });
  y += 3;

  // ── Ability ──
  sectionTitle("2. Profil Kemampuan");
  y += 1;
  Object.entries(ABILITY_NAME).forEach(([key, label]) => {
    breakIf(7);
    const s = report.abilityScores?.[key] ?? { correct: 0, total: 0 };
    const level = report.abilityLevels?.[key] ?? "medium";
    const pct = s.total ? (s.correct / s.total) * 100 : 0;
    const w = (W - 42) * (pct / 100);
    doc.setFont("Roboto", "normal");
    doc.setFontSize(9.3);
    doc.setTextColor(...INK);
    doc.text(`${label}`, M, y + 3.2);
    doc.setFillColor(232, 232, 237);
    doc.roundedRect(M + 33, y, W - 33, 3.8, 0.9, 0.9, "F");
    const color: [number, number, number] =
      level === "high" ? [34, 197, 94] : level === "medium" ? [245, 158, 11] : [248, 113, 113];
    if (w > 1) {
      doc.setFillColor(...color);
      doc.roundedRect(M + 33, y, Math.max(w, 2), 3.8, 0.9, 0.9, "F");
    }
    const levelLabel = level === "high" ? "Tinggi" : level === "medium" ? "Sedang" : "Perlu Pengembangan";
    doc.setFont("Roboto", "normal");
    doc.setFontSize(7.6);
    doc.setTextColor(...GRAY);
    doc.text(`${s.correct}/${s.total} · ${levelLabel}`, M + 33 + Math.min(w + 2, W - 14), y + 2.9);
    y += 5.9;
  });
  y += 3;
  rule();

  // ── Rekomendasi ──
  sectionTitle("3. Rekomendasi Jurusan & Karier");
  y += 1;
  report.majors.slice(0, 5).forEach((m, i) => {
    breakIf(15);
    put(`${i + 1}. ${m.itemName}`, { size: "body", color: NAVY, style: "bold", w: W - 34 });
    doc.setFont("Roboto", "normal");
    doc.setFontSize(8.4);
    doc.setTextColor(...GRAY);
    doc.text(`Kecocokan ${m.confidence}%`, M + W - 34, y - LEAD.body + 0.6, { align: "right" });
    const prodi = (m.prodiRefs ?? []).slice(0, 2);
    if (prodi.length > 0) {
      put(`Contoh: ${prodi.map((p) => `${p.prodi} — ${p.university}`).join("  |  ")}`, {
        size: "cap",
        color: [105, 105, 115],
        x: M + 4,
        w: W - 8,
      });
    }
    y += 1.6;
  });
  y += 2;

  if (report.careers.length > 0) {
    put("Karier yang cocok:", { size: "sub", color: NAVY, style: "bold" });
    put(report.careers.slice(0, 6).join("  •  "), { size: "body", color: INK });
    y += 2;
  }
  if (report.summary) {
    sectionTitle("4. Ringkasan AI");
    put(report.summary, { size: "body", color: INK });
    y += 3;
  } else {
    rule();
  }

  // ── Footer disclaimer (+ nomor halaman tiap halaman) ──
  breakIf(10);
  rule();
  put(
    "Disclaimer: Laporan ini merupakan alat bantu eksplorasi minat-bakat non-klinis dan bukan pengganti asesmen psikologi profesional. Hasil rekomendasi bersifat referensi berdasarkan data program studi di MULAI+.",
    { size: "cap", color: GRAY },
  );
  y += 2;
  put("Dibuat oleh Test by MULAI+ · mulaiplus.id", { size: "cap", color: [180, 180, 190] });

  // footer nomor halaman (semua halaman)
  const pages = pageCount();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("Roboto", "normal");
    doc.setFontSize(7.4);
    doc.setTextColor(...GRAY);
    doc.text("Test by MULAI+ · mulaiplus.id", M, 291);
    doc.text(`${i} / ${pages}`, PAGE_W - M, 291, { align: "right" });
  }

  return doc.output("blob");
}
