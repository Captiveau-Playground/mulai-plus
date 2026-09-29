import { format } from "date-fns";
import { id } from "date-fns/locale";

/**
 * Laporan PDF Test Minat & Bakat — engine pdfmake.
 *
 * Keunggulan: auto page-break, tabel & kolom otomatis, font Roboto (via vfs),
 * footer dinamis (nomor halaman), wrapper teks bawaan — tata letak konsisten.
 */

const NAVY = "#1A1F6D";
const TEAL = "#0D9488";
const ORANGE = "#FE9114";
const INK = "#3A3A42";
const GRAY = "#8A8A92";
const _FOAM = "#F2F3F7";

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

function hollandBarRows(report: TmbReportData) {
  const dims = ["R", "I", "A", "S", "E", "C"];
  const code = report.hollandCode ?? "---";
  const max = Math.max(...dims.map((d) => report.hollandScores?.[d] ?? 0), 0.1);
  return dims.map((d) => {
    const score = Math.round((report.hollandScores?.[d] ?? 0) * 100);
    const pct = Math.round(((report.hollandScores?.[d] ?? 0) / max) * 100);
    const isTop = code.includes(d);
    return [
      { text: `${d} · ${HOLLAND_NAME[d] ?? ""}`, bold: true, fontSize: 9.5, color: NAVY, width: "30%" },
      {
        columns: [
          {
            width: "100%",
            layout: "noBorders",
            table: {
              widths: [`${pct}%`, `${100 - pct}%`],
              body: [
                [
                  {
                    text: `${score}%`,
                    alignment: "right",
                    color: "white",
                    fontSize: 7.8,
                    fillColor: isTop ? TEAL : "#B0B1BA",
                    margin: [4, 1.2, 4, 1.8],
                  },
                  { text: "", fillColor: "#E8E9EE", margin: [0, 1.2, 0, 1.8] },
                ],
              ],
            },
          },
        ],
      },
    ];
  });
}

function abilityBarRows(report: TmbReportData) {
  return Object.entries(ABILITY_NAME).map(([key, label]) => {
    const s = report.abilityScores?.[key] ?? { correct: 0, total: 0 };
    const level = report.abilityLevels?.[key] ?? "medium";
    const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
    const lvlColor = level === "high" ? "#22C55E" : level === "medium" ? "#F59E0B" : "#F87171";
    const levelLabel = level === "high" ? "Tinggi" : level === "medium" ? "Sedang" : "Perlu Pengembangan";
    return [
      { text: label, fontSize: 9.5, color: INK, width: "24%" },
      {
        columns: [
          {
            width: "72%",
            layout: "noBorders",
            table: {
              widths: [`${pct}%`, `${100 - pct}%`],
              body: [
                [
                  { text: ",", fontSize: 0.1, color: lvlColor, fillColor: lvlColor, margin: [0, 2, 0, 2] },
                  { text: "", fillColor: "#E8E9EE", margin: [0, 2, 0, 2] },
                ],
              ],
            },
          },
          {
            text: `${s.correct}/${s.total} · ${levelLabel}`,
            fontSize: 8,
            color: GRAY,
            alignment: "right",
            width: "28%",
          },
        ],
      },
    ];
  });
}

export async function generateTmbReportPdf(report: TmbReportData): Promise<Blob> {
  const { default: pdfMake } = await import("pdfmake/build/pdfmake");
  const { default: pdfFonts } = await import("pdfmake/build/vfs_fonts");
  // Bentuk ekspor berbeda antara bundler browser ({pdfMake:{vfs}}) vs Bun/Node (vfs langsung).
  const vfs = (pdfFonts as any)?.pdfMake?.vfs ?? (pdfFonts as any);
  (pdfMake as any).vfs = vfs;
  (pdfMake as any).fonts = {
    Roboto: {
      normal: "Roboto-Regular.ttf",
      bold: "Roboto-Medium.ttf",
      italics: "Roboto-Italic.ttf",
      bolditalics: "Roboto-MediumItalic.ttf",
    },
  };

  const issued = format(new Date(), "dd MMMM yyyy", { locale: id });
  const diffLabel =
    report.differentiation === "strong"
      ? "Tinggi"
      : report.differentiation === "moderate"
        ? "Sedang"
        : "Perlu Eksplorasi";

  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [48, 58, 48, 56],
    info: {
      title: `Laporan Test Minat Bakat — ${report.studentName || ""}`,
      author: "MULAI+",
      subject: "Hasil Tes Minat & Bakat",
    },
    defaultStyle: { font: "Roboto", fontSize: 9.8, lineHeight: 1.45, color: INK },
    header: (_currentPage: number, _pageCountN: number) => ({
      margin: [48, 26, 48, 0],
      columns: [
        { text: "Test by MULAI+", color: NAVY, bold: true, fontSize: 8.5 },
        { text: `Diterbitkan: ${issued}`, color: GRAY, fontSize: 8, alignment: "right" },
      ],
    }),
    footer: (currentPage: number, pageCountN: number) => ({
      margin: [48, 0, 48, 24],
      columns: [
        { text: "mulaiplus.id · Bimbingan Universitas & Jurusan", color: "#B9BAC3", fontSize: 7.4 },
        { text: `${currentPage} / ${pageCountN}`, color: "#B9BAC3", fontSize: 7.4, alignment: "right" },
      ],
    }),
    content: [
      // ── Hero ──
      {
        table: {
          widths: ["100%"],
          body: [
            [
              {
                fillColor: NAVY,
                margin: [24, 22, 24, 20],
                stack: [
                  { text: "Laporan Hasil Test Minat Bakat", fontSize: 20, bold: true, color: "white" },
                  { text: "Kenali Minat & Bakatmu", fontSize: 11, color: "#D9DCEF", margin: [0, 4, 0, 0] },
                ],
              },
            ],
          ],
        },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
      },
      { canvas: [{ type: "rect", x: 48, y: -4, w: 0, h: 0 }], margin: [0, 0, 0, 12] },

      // ── Identitas ──
      section("Identitas Peserta"),
      {
        layout: "lightHorizLines",
        table: {
          widths: ["30%", "70%"],
          body: [[kv("Nama", report.studentName || "-"), kv("Sekolah", report.schoolName || "-")]],
        },
        margin: [0, 2, 0, 14],
      },

      // ── RIASEC ──
      section("1. Profil Minat (Holland RIASEC)"),
      {
        layout: "lightHorizLines",
        table: { widths: ["30%", "70%"], body: hollandBarRows(report) },
        margin: [0, 4, 0, 6],
      },
      {
        columns: [
          { text: `Kode Minat: ${report.hollandCode ?? "---"}`, bold: true, color: TEAL, fontSize: 11 },
          {
            text: `Kejelasan: ${diffLabel} · Confidence ${report.confidenceScore}%`,
            color: GRAY,
            fontSize: 9,
            alignment: "right",
          },
        ],
        margin: [0, 8, 0, 14],
      },

      // ── Ability ──
      section("2. Profil Kemampuan"),
      {
        layout: "lightHorizLines",
        table: { widths: ["24%", "48%", "28%"], body: abilityBarRows(report) },
        margin: [0, 4, 0, 14],
      },

      // ── Rekomendasi ──
      section("3. Rekomendasi Jurusan & Karier"),
      {
        ol: report.majors.slice(0, 5).map((m) => ({
          margin: [0, 1, 0, 7],
          stack: [
            {
              columns: [
                { text: m.itemName, bold: true, color: NAVY, fontSize: 10.2 },
                { text: `Kecocokan ${m.confidence}%`, color: ORANGE, fontSize: 8.6, alignment: "right" },
              ],
            },
            ...((m.prodiRefs ?? []).slice(0, 2).flatMap((p) => [
              {
                text: `${p.prodi} — ${p.university}`,
                color: GRAY,
                fontSize: 8.4,
                margin: [10, 2, 0, 0],
              },
            ]) || []),
          ],
        })),
        margin: [0, 4, 0, 4],
      },
      report.careers.length > 0
        ? {
            text: [
              { text: "Karier yang cocok: ", bold: true, color: NAVY },
              { text: report.careers.slice(0, 6).join("  •  ") },
            ],
            fontSize: 9.6,
            margin: [0, 6, 0, 4],
          }
        : {},

      // ── Ringkasan AI ──
      ...(report.summary
        ? [
            section("4. Ringkasan AI"),
            {
              text: report.summary.replace(/\*\*/g, "").replace(/#+\s*/g, ""),
              fontSize: 9.8,
              color: INK,
              margin: [0, 4, 0, 4],
            },
          ]
        : []),

      // ── Disclaimer ──
      {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 514, y2: 0, lineColor: "#E2E3E9", lineWidth: 0.6 }],
        margin: [0, 10, 0, 6],
      },
      {
        text: "Disclaimer: Laporan ini merupakan alat bantu eksplorasi minat-bakat non-klinis dan bukan pengganti asesmen psikologi profesional. Hasil rekomendasi bersifat referensi berdasarkan data program studi di MULAI+.",
        fontSize: 7.6,
        color: GRAY,
        margin: [0, 0, 0, 4],
      },
      { text: "Dibuat oleh Test by MULAI+ · mulaiplus.id", fontSize: 7.6, color: "#B9BAC3" },
    ],
  };

  return await new Promise<Blob>((resolve, _reject) => {
    pdfMake.createPdf(docDefinition).getBlob((blob) => resolve(blob));
  });
}

function section(title: string) {
  return {
    stack: [
      {
        canvas: [{ type: "rect", x: 0, y: 2.2, w: 3, h: 9.5, color: ORANGE }],
        absolutePosition: { x: 40, y: 0 },
      },
      { text: title, fontSize: 13.5, bold: true, color: NAVY, margin: [6, 0, 0, 8] },
    ],
  };
}

function kv(label: string, value: string) {
  return {
    stack: [
      { text: label.toUpperCase(), fontSize: 7, color: GRAY, characterSpacing: 0.6 },
      { text: value, fontSize: 10.5, color: NAVY, margin: [0, 2, 0, 0] },
    ],
    margin: [0, 4, 0, 6],
  };
}
