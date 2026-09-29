/**
 * Laporan PDF via HTML → print (Save as PDF).
 * Layout & font DIDUKUNG browser (rapi, konsisten), link klikable — tanpa engine PDF.
 */

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
  email?: string | null;
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

function levelLabel(l: string) {
  return l === "high" ? "Tinggi" : l === "medium" ? "Sedang" : "Perlu Pengembangan";
}
function levelColor(l: string) {
  return l === "high" ? "#22C55E" : l === "medium" ? "#F59E0B" : "#F87171";
}

const S = {
  navy: "#1A1F6D",
  teal: "#0D9488",
  orange: "#FE9114",
  ink: "#3A3A42",
  gray: "#8A8A92",
  foam: "#F4F5F9",
  track: "#E8E9EE",
};

function bar(label: string, pct: number, color: string, right?: string) {
  const w = Math.max(Math.min(pct, 100), 0);
  return `
    <tr>
      <td style="width:30%;padding:3px 6px 3px 0;font-size:11px;color:${S.ink};vertical-align:middle;">${label}</td>
      <td style="width:60%;padding:3px 0;vertical-align:middle;">
        <div style="position:relative;height:14px;border-radius:7px;background:#EEEFF4;overflow:hidden">
          <div style="height:100%;width:${w}%;border-radius:7px;background:${color}"></div>
        </div>
      </td>
      <td style="width:10%;padding:3px 0 3px 6px;font-size:10px;color:${S.gray};text-align:right;vertical-align:middle;">${right ?? ""}</td>
    </tr>`;
}

export function renderReportHtml(r: TmbReportData): string {
  const dims = ["R", "I", "A", "S", "E", "C"];
  const max = Math.max(...dims.map((d) => r.hollandScores?.[d] ?? 0), 0.1);
  const diff =
    r.differentiation === "strong" ? "Tinggi" : r.differentiation === "moderate" ? "Sedang" : "Perlu Eksplorasi";

  const riasec = dims
    .map((d) => {
      const score = Math.round((r.hollandScores?.[d] ?? 0) * 100);
      const pct = ((r.hollandScores?.[d] ?? 0) / max) * 100;
      const top = r.hollandCode?.includes(d);
      return bar(`${d} · ${HOLLAND_NAME[d] ?? ""}`, pct, top ? S.teal : "#B0B1BA", `${score}%`);
    })
    .join("");

  const ability = Object.entries(ABILITY_NAME)
    .map(([k, label]) => {
      const s = r.abilityScores?.[k] ?? { correct: 0, total: 0 };
      const lv = r.abilityLevels?.[k] ?? "medium";
      const pct = s.total ? (s.correct / s.total) * 100 : 0;
      return bar(label, pct, levelColor(lv), `${s.correct}/${s.total} · ${levelLabel(lv)}`);
    })
    .join("");

  const majorsHead = `<thead><tr><th style="width:6%">No</th><th style="width:44%">Jurusan</th><th>Contoh Prodi</th></tr></thead>`;
  const majors = (r.majors ?? [])
    .slice(0, 5)
    .map(
      (m, i) => `
      <tr style="border-top:1px solid ${S.foam}">
        <td style="padding:7px 4px;font-size:11px;color:${S.gray};vertical-align:top;">${i + 1}</td>
        <td style="padding:7px 8px;vertical-align:top;">
          <div style="font-weight:700;font-size:12px;color:${S.navy};">${m.itemName}</div>
          <div style="font-size:10px;color:#C2540B;margin-top:1px;font-weight:600;">Kecocokan ${m.confidence}%</div>
        </td>
        <td style="padding:7px 4px 7px 8px;vertical-align:top;font-size:10.5px;">
          ${
            (m.prodiRefs ?? []).slice(0, 2).length === 0
              ? `<span style="color:${S.gray}">-</span>`
              : (m.prodiRefs ?? [])
                  .slice(0, 2)
                  .map(
                    (p) =>
                      `<div style="margin-bottom:2px;color:${S.teal}"><a href="https://mulaiplus.id/explore/study-programs?search=${encodeURIComponent(p.prodi.trim())}" style="color:${S.teal};text-decoration:underline;">${p.prodi}</a> <span style="color:${S.gray}">· ${p.university}</span></div>`,
                  )
                  .join("")
          }
        </td>
      </tr>`,
    )
    .join("");

  const issued = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  return `
  <!doctype html><html lang="id"><head><meta charset="utf-8"/>
  <style>
    @page { size: A4; margin: 14mm 14mm 16mm 14mm; }
    * { box-sizing: border-box; }
    body { margin:0; padding:0; font-family: 'Segoe UI', Roboto, system-ui, sans-serif; color: ${S.ink}; font-size: 11.5px; line-height: 1.5; }
    .head { background: ${S.navy}; color:#fff; padding: 16px 22px 14px; border-radius: 10px; position:relative; }
    .head h1 { margin:0; font-size: 21px; }
    .head p { margin:3px 0 0; color:#D9DCEF; font-size:11px; }
    .head .meta { margin-top:7px; font-size:9px; color:#AEB2D6; }
    .logo { position:absolute; right:20px; top:16px; height:26px; }
    .sec { margin-top: 26px; }
    .sec h2 { font-size: 13.5px; color: ${S.navy}; margin:0 0 8px; padding-left: 8px; border-left: 4px solid ${S.orange}; }
    table.bars { width: 100%; border-collapse: collapse; }
    table.bars td { border-bottom: 1px solid #F3F4F8; }
    table.majors { width: 100%; border-collapse: collapse; margin-top: 4px; }
    table.majors thead th { background: #F2F3F7; color: #5F6572; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; text-align: left; padding: 6px 8px; border-bottom: 1px solid #E6E8EF; }
    table.majors tbody tr { border-bottom: 1px solid #F3F4F8; }
    table.majors tbody tr:nth-child(even) { background: #FBFCFE; }
    table.majors td { font-size: 10.5px; }
    .footer-note { margin-top: 30px; border-top: 1px solid ${S.foam}; padding-top: 10px; font-size: 9px; color: ${S.gray}; }
    .link-explore { font-size: 10.5px; color: ${S.teal}; margin-top: 12px; }
    .ident { display:grid; grid-template-columns: 1fr 1fr; gap: 4px 22px; font-size: 11.5px; }
    .ident b { color: ${S.navy}; }
    .kv { font-size: 9px; color: ${S.gray}; text-transform: uppercase; letter-spacing:.5px; margin-bottom:1px; }
  </style></head>
  <body>
    <div class="head">
      <img class="logo" src="/light-type-logo.svg" alt="MULAI+" />
      <h1>Laporan Hasil Test Minat Bakat</h1>
      <p>Kenali Minat &amp; Bakatmu — Product by MULAI+</p>
      <div class="meta">Diterbitkan: ${issued}</div>
    </div>

    <div class="sec">
      <h2>Identitas Peserta</h2>
      <div class="ident">
        <div><div class="kv">Nama</div><b>${r.studentName || "-"}</b></div>
        <div><div class="kv">Email</div><b>${r.email || "-"}</b></div>
        <div><div class="kv">Sekolah</div>${r.schoolName || "-"}</div>
      </div>
    </div>

    <div class="sec">
      <h2>1. Profil Minat (Holland RIASEC)</h2>
      <table class="bars"><tbody>${riasec}</tbody></table>
      <div style="margin-top:8px;font-size:11.5px;"><b style="color:${S.teal};">Kode Minat: ${r.hollandCode || "---"}</b>
        <span style="color:${S.gray};float:right;">Kejelasan: ${diff} · Confidence ${r.confidenceScore}%</span></div>
    </div>

    <div class="sec">
      <h2>2. Profil Kemampuan</h2>
      <table class="bars"><tbody>${ability}</tbody></table>
    </div>

    <div class="sec">
      <h2>3. Rekomendasi Jurusan &amp; Karier</h2>
      <table class="majors">${majorsHead}<tbody>${majors}</tbody></table>
      ${r.careers?.length ? `<div style="margin-top:10px;font-size:11.5px;"><b style="color:${S.navy};">Karier yang cocok:</b> ${r.careers.slice(0, 6).join(" • ")}</div>` : ""}
      <div class="link-explore">📚 Lihat semua jurusan &amp; bandingkan passing grade di <a href="https://mulaiplus.id/explore" style="color:${S.teal};">mulaiplus.id/explore</a></div>
    </div>

    ${r.summary ? `<div class="sec"><h2>4. Ringkasan AI</h2><div>${r.summary.replace(/\*\*/g, "").replace(/#+\s*/g, "")}</div></div>` : ""}

    <div class="footer-note">
      Disclaimer: Laporan ini merupakan alat bantu eksplorasi minat-bakat non-klinis dan bukan pengganti asesmen psikologi profesional.
      Hasil rekomendasi bersifat referensi berdasarkan data program studi di MULAI+. — Dibuat oleh Product by MULAI+ · mulaiplus.id
    </div>
  </body></html>`;
}

export async function printTmbReport(r: TmbReportData): Promise<void> {
  const IF = "mulai-pdf-print-frame";
  const old = document.getElementById(IF);
  if (old) old.remove();

  const wrap = document.createElement("div");
  wrap.id = IF;
  wrap.innerHTML = renderReportHtml(r);
  Object.assign(wrap.style, { position: "fixed", inset: "0", zIndex: "-1" });
  document.body.appendChild(wrap);

  // sembunyikan konten lain saat print, tampilkan hanya frame
  const style = document.createElement("style");
  style.id = `${IF}-css`;
  style.textContent =
    "@media print { body *:not(#mulai-pdf-print-frame):not(#mulai-pdf-print-frame *) { visibility: hidden !important; } #mulai-pdf-print-frame { position: absolute !important; inset: 0; z-index: 9999; } }";
  document.head.appendChild(style);

  const cleanup = () => {
    wrap.remove();
    style.remove();
  };
  window.addEventListener("afterprint", cleanup, { once: true });
  await new Promise<void>((r) => setTimeout(r, 50));
  window.print();
  // fallback kalau afterprint tidak jalan (mis. dialog batal)
  setTimeout(cleanup, 8000);
}
