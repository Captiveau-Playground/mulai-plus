import { format } from "date-fns";
import { id } from "date-fns/locale";

const NAVY: [number, number, number] = [26, 31, 109];
const TEAL: [number, number, number] = [13, 148, 136];
const ORANGE: [number, number, number] = [254, 145, 20];
const GRAY: [number, number, number] = [120, 120, 120];
const _LIGHT: [number, number, number] = [245, 245, 248];

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
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 210;
  const margin = 16;
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > 290) {
      doc.addPage();
      y = 16;
    }
  };

  // ── Header ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 34, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(0, 34, pageWidth, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Laporan Hasil Test Minat Bakat", margin, 15);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Test by MULAI+ — Kenali Minat & Bakatmu", margin, 22);
  doc.setFontSize(8.5);
  doc.setTextColor(220, 220, 230);
  doc.text(`Diterbitkan: ${format(new Date(), "dd MMMM yyyy", { locale: id })}`, margin, 28);

  y = 44;

  // ── Identitas ──
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Identitas Peserta", margin, y);
  y += 6;
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Nama: ${report.studentName || "-"}`, margin, y);
  y += 5.5;
  doc.text(`Sekolah: ${report.schoolName || "-"}`, margin, y);
  y += 8;

  // ── RIASEC ──
  ensureSpace(60);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("1. Profil Minat (Holland RIASEC)", margin, y);
  y += 3;

  // bar chart
  const code = report.hollandCode ?? "---";
  const dims = ["R", "I", "A", "S", "E", "C"];
  const chartTop = y;
  const chartW = pageWidth - margin * 2;
  const barH = 5;
  const gap = 2.6;
  const labelW = 26;
  const maxScore = Math.max(...dims.map((d) => report.hollandScores?.[d] ?? 0), 0.1);

  dims.forEach((d, i) => {
    const yy = chartTop + i * (barH + gap);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    const isTop = code.includes(d);
    doc.text(`${d} · ${HOLLAND_NAME[d] ?? ""}`, margin, yy + 4);
    doc.setFillColor(230, 230, 235);
    doc.roundedRect(margin + labelW, yy, chartW - labelW, barH, 1.2, 1.2, "F");
    const score = report.hollandScores?.[d] ?? 0;
    const w = (chartW - labelW) * (score / maxScore);
    doc.setFillColor(...(isTop ? TEAL : ([180, 180, 190] as [number, number, number])));
    if (w > 0) doc.roundedRect(margin + labelW, yy, Math.max(w, 2), barH, 1.2, 1.2, "F");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(`${Math.round(score * 100)}%`, margin + labelW + w + 2, yy + 4);
  });

  y = chartTop + 6 * (barH + gap) + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEAL);
  doc.text(`Kode Minat: ${code}`, margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(60, 60, 60);
  const diffLabel =
    report.differentiation === "strong"
      ? "Tinggi"
      : report.differentiation === "moderate"
        ? "Sedang"
        : "Perlu Eksplorasi";
  doc.text(`Kejelasan minat: ${diffLabel}   ·   Confidence: ${report.confidenceScore}%`, margin, y);
  y += 10;

  // ── Ability ──
  ensureSpace(58);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("2. Profil Kemampuan", margin, y);
  y += 3;

  Object.entries(ABILITY_NAME).forEach(([key, label]) => {
    const s = report.abilityScores?.[key] ?? { correct: 0, total: 0 };
    const level = report.abilityLevels?.[key] ?? "medium";
    const pct = s.total ? (s.correct / s.total) * 100 : 0;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    doc.text(`${label}`, margin, y + 4);
    doc.setFillColor(230, 230, 235);
    doc.roundedRect(margin + 26, y, chartW - 26, 4, 1, 1, "F");
    const w = (chartW - 26) * (pct / 100);
    const color: [number, number, number] =
      level === "high" ? [34, 197, 94] : level === "medium" ? [251, 191, 36] : [248, 113, 113];
    if (w > 0) {
      doc.setFillColor(...color);
      doc.roundedRect(margin + 26, y, Math.max(w, 2), 4, 1, 1, "F");
    }
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    const levelLabel = level === "high" ? "Tinggi" : level === "medium" ? "Sedang" : "Perlu Pengembangan";
    doc.text(`${s.correct}/${s.total} · ${levelLabel}`, margin + 26 + w + 2, y + 3.4);
    y += 6.2;
  });
  y += 6;

  // ── Recommendations ──
  ensureSpace(40);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("3. Rekomendasi Jurusan & Karier", margin, y);
  y += 5;

  report.majors.slice(0, 5).forEach((m, i) => {
    ensureSpace(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...NAVY);
    doc.text(`${i + 1}. ${m.itemName}`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(`Kecocokan: ${m.confidence}%`, margin + 95, y);
    y += 5;
    const prodi = (m.prodiRefs ?? []).slice(0, 2);
    if (prodi.length > 0) {
      doc.setFontSize(8.5);
      doc.setTextColor(90, 90, 90);
      doc.text(`Contoh: ${prodi.map((p) => `${p.prodi} — ${p.university}`).join("  |  ")}`, margin + 6, y);
      y += 4.5;
    }
    y += 1.5;
  });
  y += 2;

  if (report.careers.length > 0) {
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...NAVY);
    doc.text("Karier yang cocok:", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    doc.text(report.careers.slice(0, 6).join("  •  "), margin, y);
    y += 8;
  }

  // ── AI Summary ──
  if (report.summary) {
    ensureSpace(30);
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("4. Ringkasan AI", margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    // wrap text
    const lines = doc.splitTextToSize(report.summary.replace(/\*\*/g, "").replace(/#+\s*/g, ""), chartW);
    for (const line of lines) {
      ensureSpace(6);
      doc.text(line as string, margin, y);
      y += 5;
    }
    y += 6;
  }

  // ── Footer disclaimer ──
  ensureSpace(20);
  doc.setDrawColor(220, 220, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  const disclaimer = doc.splitTextToSize(
    "Disclaimer: Laporan ini merupakan alat bantu eksplorasi minat-bakat non-klinis dan bukan pengganti asesmen psikologi profesional. Hasil rekomendasi bersifat referensi berdasarkan data program studi di MULAI+.",
    chartW,
  );
  for (const line of disclaimer) {
    doc.text(line as string, margin, y);
    y += 3.6;
  }
  y += 4;
  doc.setTextColor(180, 180, 190);
  doc.text("Dibuat oleh Test by MULAI+ · mulaiplus.id", margin, y);

  return doc.output("blob");
}
