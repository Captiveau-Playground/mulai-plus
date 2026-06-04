import jsPDF from "jspdf";

interface ReportItem {
  title: string;
  description: string;
}

interface ReportData {
  studentName: string;
  mentorName: string;
  batchName: string;
  programName: string;
  items: ReportItem[];
  mentorNotes?: string | null;
  date: string;
}

export async function generateSummaryReportPdf(report: ReportData): Promise<Blob> {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  // ── Helper ──
  const wrap = (text: string, size: number, maxW: number): string[] => {
    pdf.setFontSize(size);
    return pdf.splitTextToSize(text, maxW);
  };

  // ── Colors ──
  const _navy = "#1A1F6D";
  const _teal = "#0D9488";
  const _gray = "#6B7280";
  const _lightBg = "#F8F9FC";

  // ── Background ──
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageW, 297, "F");

  // ── Top Decorative Bar ──
  pdf.setFillColor(26, 31, 109);
  pdf.rect(0, 0, pageW, 8, "F");
  pdf.setFillColor(13, 148, 136);
  pdf.rect(0, 8, pageW, 2, "F");

  y += 25;

  // ── Logo / Title ──
  pdf.setFont("Helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(26, 31, 109);
  pdf.text("MULAI+", pageW / 2, y, { align: "center" });
  y += 10;

  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128);
  pdf.setFont("Helvetica", "normal");
  pdf.text("Summary Report — Mentoring Program", pageW / 2, y, { align: "center" });
  y += 20;

  // ── Separator ──
  pdf.setDrawColor(229, 231, 235);
  pdf.line(margin, y, pageW - margin, y);
  y += 12;

  // ── Header Info ──
  pdf.setFontSize(10);
  pdf.setFont("Helvetica", "bold");
  pdf.setTextColor(26, 31, 109);

  const col1 = margin;
  const col2 = pageW / 2 + 5;

  pdf.text("Student", col1, y);
  pdf.setFont("Helvetica", "normal");
  pdf.setTextColor(55, 65, 81);
  pdf.text(report.studentName, col1, y + 5);

  pdf.setFont("Helvetica", "bold");
  pdf.setTextColor(26, 31, 109);
  pdf.text("Program", col2, y);
  pdf.setFont("Helvetica", "normal");
  pdf.setTextColor(55, 65, 81);
  pdf.text(`${report.programName} — ${report.batchName}`, col2, y + 5);

  y += 15;

  pdf.setFont("Helvetica", "bold");
  pdf.setTextColor(26, 31, 109);
  pdf.text("Mentor", col1, y);
  pdf.setFont("Helvetica", "normal");
  pdf.setTextColor(55, 65, 81);
  pdf.text(report.mentorName, col1, y + 5);

  pdf.setFont("Helvetica", "bold");
  pdf.setTextColor(26, 31, 109);
  pdf.text("Date", col2, y);
  pdf.setFont("Helvetica", "normal");
  pdf.setTextColor(55, 65, 81);
  pdf.text(report.date, col2, y + 5);

  y += 25;

  // ── Separator ──
  pdf.setDrawColor(229, 231, 235);
  pdf.line(margin, y, pageW - margin, y);
  y += 12;

  // ── Assessment Items ──
  pdf.setFont("Helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(26, 31, 109);
  pdf.text("Assessment Results", margin, y);
  y += 10;

  for (let i = 0; i < report.items.length; i++) {
    const item = report.items[i];

    // Check page break
    const needed = 25 + wrap(item.description, 10, contentW).length * 5;
    if (y + needed > 270) {
      pdf.addPage();
      y = margin + 10;
    }

    // Item number circle
    pdf.setFillColor(26, 31, 109);
    pdf.circle(margin + 4, y + 3, 4, "F");
    pdf.setFont("Helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`${i + 1}`, margin + 4, y + 5, { align: "center" });

    // Title
    pdf.setFont("Helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(26, 31, 109);
    pdf.text(item.title, margin + 12, y + 4);

    // Description
    pdf.setFont("Helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(107, 114, 128);
    const descLines = wrap(item.description, 10, contentW - 12);
    pdf.text(descLines, margin + 12, y + 12);

    y += 18 + descLines.length * 5;
  }

  // ── Mentor Notes ──
  if (report.mentorNotes) {
    y += 5;
    if (y + 30 > 270) {
      pdf.addPage();
      y = margin + 10;
    }

    pdf.setDrawColor(229, 231, 235);
    pdf.line(margin, y, pageW - margin, y);
    y += 10;

    pdf.setFont("Helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(13, 148, 136);
    pdf.text("Mentor Notes", margin, y);
    y += 8;

    pdf.setFont("Helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(55, 65, 81);
    const noteLines = wrap(report.mentorNotes, 10, contentW);
    pdf.text(noteLines, margin, y);
    y += noteLines.length * 5 + 10;
  }

  // ── Footer / Bottom Bar ──
  y = 280;
  pdf.setFillColor(26, 31, 109);
  pdf.rect(0, y, pageW, 2, "F");
  pdf.setFillColor(13, 148, 136);
  pdf.rect(0, y + 2, pageW, 1, "F");

  pdf.setFont("Helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(156, 163, 175);
  pdf.text("MULAI+ — Bimbingan Universitas, Jurusan & Beasiswa", pageW / 2, y + 10, { align: "center" });
  pdf.text(report.date, pageW / 2, y + 15, { align: "center" });

  return pdf.output("blob");
}
