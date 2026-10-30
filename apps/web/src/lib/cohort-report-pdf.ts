// Laporan insight kelas (B2B) — PDF ber-kop sekolah, dibuat di klien dengan jsPDF.
// Dipakai halaman /sekolah/kelas/[id]/laporan.

export interface CohortInsight {
  batch: { id: string; name: string | null; className: string | null; major: string | null };
  school: string | null;
  counts: { total: number; completed: number; inProgress: number; invited: number };
  confidenceAvg: number | null;
  hollandDist: Array<{ code: string; count: number; pct: number; avg: number }>;
  ability: Array<{ key: string; correct: number; total: number; pct: number }>;
  strongest: { key: string; pct: number } | null;
  weakest: { key: string; pct: number } | null;
  topMajors: Array<{ name: string; count: number; pct: number }>;
  topCareers: Array<{ name: string; count: number; pct: number }>;
  attention: Array<{ participantId: string; name: string; reasons: string[] }>;
  range: { first: string | Date | null; last: string | Date | null };
}

const HOLLAND_LABEL: Record<string, string> = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};

const DIM_LABEL: Record<string, string> = {
  verbal: "Verbal",
  numerical: "Numerik",
  logical: "Logika",
  spatial: "Spasial",
  clerical: "Ketelitian",
};

const fmtDate = (v: string | Date | null | undefined) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
};

export async function generateCohortReportPdf(insight: CohortInsight): Promise<Blob> {
  const { default: JsPDF } = await import("jspdf");
  const pdf = new JsPDF("p", "mm", "a4");

  const pageW = 210;
  const mx = 18; // margin kiri/kanan
  const cw = pageW - mx * 2;
  let y = 18;

  const ensure = (need: number) => {
    if (y + need > 275) {
      pdf.addPage();
      y = 18;
    }
  };

  // ── KOP SEKOLAH ──
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text(String(insight.school ?? "Sekolah").toUpperCase(), pageW / 2, y, { align: "center" });
  y += 6;
  pdf.setFontSize(11);
  pdf.text("LAPORAN INSIGHT TES MINAT & BAKAT", pageW / 2, y, { align: "center" });
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const kelas = [insight.batch.className, insight.batch.major].filter(Boolean).join(" · ") || insight.batch.name || "—";
  const periode =
    insight.range.first || insight.range.last
      ? `${fmtDate(insight.range.first)} – ${fmtDate(insight.range.last)}`
      : fmtDate(new Date());
  pdf.text(`Kelas: ${kelas}   |   Periode: ${periode}`, pageW / 2, y, { align: "center" });
  y += 3;
  pdf.setLineWidth(0.6);
  pdf.line(mx, y, pageW - mx, y);
  y += 7;

  // ── RINGKASAN ──
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10.5);
  pdf.text("Ringkasan", mx, y);
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const c = insight.counts;
  pdf.text(
    `Peserta ${c.total} · Selesai ${c.completed} · Mengerjakan ${c.inProgress} · Belum mulai ${c.invited}`,
    mx,
    y,
  );
  y += 4.5;
  pdf.text(
    `Rata-rata keyakinan: ${insight.confidenceAvg ?? "—"}%   |   Dimensi terkuat: ${
      insight.strongest
        ? `${DIM_LABEL[insight.strongest.key] ?? insight.strongest.key} (${insight.strongest.pct}%)`
        : "—"
    }   |   Terlemah: ${
      insight.weakest ? `${DIM_LABEL[insight.weakest.key] ?? insight.weakest.key} (${insight.weakest.pct}%)` : "—"
    }`,
    mx,
    y,
  );
  y += 8;

  // ── DISTRIBUSI HOLLAND ──
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10.5);
  pdf.text("Distribusi Minat (Holland)", mx, y);
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  for (const h of insight.hollandDist) {
    ensure(6);
    const label = `${h.code} — ${HOLLAND_LABEL[h.code] ?? h.code}`;
    pdf.text(label, mx, y);
    const barX = mx + 52;
    const barW = cw - 52 - 26;
    pdf.setFillColor(235, 235, 235);
    pdf.rect(barX, y - 3, barW, 3.4, "F");
    pdf.setFillColor(38, 60, 102);
    pdf.rect(barX, y - 3, Math.max(0.6, (barW * h.pct) / 100), 3.4, "F");
    pdf.text(`${h.count} siswa (${h.pct}%)`, pageW - mx, y, { align: "right" });
    y += 6;
  }
  y += 3;

  // ── KEMAMPUAN ──
  if (insight.ability.length) {
    ensure(10);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.text("Kemampuan per Dimensi", mx, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    for (const a of insight.ability) {
      ensure(6);
      pdf.text(`${DIM_LABEL[a.key] ?? a.key}`, mx, y);
      const barX = mx + 52;
      const barW = cw - 52 - 26;
      pdf.setFillColor(235, 235, 235);
      pdf.rect(barX, y - 3, barW, 3.4, "F");
      pdf.setFillColor(20, 130, 120);
      pdf.rect(barX, y - 3, Math.max(0.6, (barW * a.pct) / 100), 3.4, "F");
      pdf.text(`${a.pct}% (${a.correct}/${a.total})`, pageW - mx, y, { align: "right" });
      y += 6;
    }
    y += 3;
  }

  // ── JURUSAN & KARIER TERATAS ──
  const listSection = (title: string, rows: Array<{ name: string; count: number; pct: number }>) => {
    if (!rows.length) return;
    ensure(14);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.text(title, mx, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    rows.forEach((r, i) => {
      ensure(5.5);
      pdf.text(`${i + 1}. ${r.name}`, mx + 2, y);
      pdf.text(`${r.count} siswa (${r.pct}%)`, pageW - mx, y, { align: "right" });
      y += 5;
    });
    y += 3;
  };
  listSection("Jurusan Teratas (agregat pilihan 1–3)", insight.topMajors);
  listSection("Karier Teratas", insight.topCareers);

  // ── PERLU PERHATIAN ──
  if (insight.attention.length) {
    ensure(14);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.text(`Perlu Perhatian (${insight.attention.length} siswa)`, mx, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    for (const a of insight.attention) {
      ensure(5.5);
      const line = `${a.name} — ${a.reasons.join(", ")}`;
      for (const part of pdf.splitTextToSize(line, cw - 2) as string[]) {
        ensure(5.5);
        pdf.text(part, mx + 2, y);
        y += 4.6;
      }
    }
    y += 2;
  }

  // ── FOOTER ──
  y += 4;
  ensure(14);
  pdf.setLineWidth(0.3);
  pdf.line(mx, y, pageW - mx, y);
  y += 5;
  pdf.setFontSize(7.5);
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    `Dibuat otomatis oleh MULAI+ pada ${fmtDate(new Date())} · Laporan ini bersifat rahasia dan hanya untuk kepentingan bimbingan sekolah.`,
    pageW / 2,
    y,
    { align: "center" },
  );

  return pdf.output("blob");
}
