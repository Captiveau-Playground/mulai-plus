import { client } from "@/lib/client";

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

const HOLLAND_DESC: Record<string, string> = {
  R: "Nyaman dengan kerja praktis, alat, dan aktivitas lapangan — suka menyelesaikan sesuatu dengan tangan. Relevan untuk Teknik, Pertanian, dan bidang operasional.",
  I: "Analitis, suka riset, mengamati, dan memecahkan masalah abstrak. Relevan untuk Sains, Kedokteran, dan Teknologi.",
  A: "Kreatif, ekspresif, dan bebas berimajinasi — menghindari rutinitas kaku. Relevan untuk Desain, Sastra, dan Seni.",
  S: "Senang membantu, mengajar, dan berinteraksi dengan banyak orang. Relevan untuk Psikologi, Keperawatan, dan Keguruan.",
  E: "Pemimpin, persuasif, dan berjiwa bisnis — nyaman mengambil inisiatif & risiko. Relevan untuk Manajemen, Marketing, dan Kewirausahaan.",
  C: "Terstruktur, teliti, dan menyukai kerapian serta prosedur jelas. Relevan untuk Akuntansi, Administrasi, dan Analisis Data.",
};
const ABILITY_DESC: Record<string, string> = {
  numerical: "Kecepatan & ketepatan bekerja dengan angka dan pola. Relevan untuk Teknik, Akuntansi, dan Statistik.",
  verbal: "Pemahaman & penggunaan bahasa, makna kata, dan bacaan. Relevan untuk Hukum, Komunikasi, dan Jurnalistik.",
  logical: "Penalaran berurutan, deduksi, dan hubungan antar konsep. Relevan untuk IT, Matematika, dan Hukum.",
  spatial:
    "Kemampuan membayangkan bentuk, orientasi, dan rotasi ruang. Relevan untuk Arsitektur, Teknik Sipil, dan Desain.",
  clerical:
    "Ketelitian, konsistensi, dan kecepatan tugas administratif. Relevan untuk Administrasi, Laboratorium, dan QA.",
};
const HOLLAND_CAREERS: Record<string, string> = {
  R: "Teknik Mesin, Pertanian, Perhotelan, Arsitektur",
  I: "Kedokteran, Matematika, Farmasi, Data Science",
  A: "DKV, Sastra, Musik, Desain Interior",
  S: "Psikologi, Keperawatan, Keguruan, Ilmu Komunikasi",
  E: "Manajemen, Marketing, Hukum Bisnis, Kewirausahaan",
  C: "Akuntansi, Administrasi, Statistik, Manajemen Operasional",
};
const ABILITY_CAREERS: Record<string, string> = {
  numerical: "Teknik, Akuntansi, Statistik",
  verbal: "Hukum, Komunikasi, Jurnalistik",
  logical: "IT, Matematika, Hukum",
  spatial: "Arsitektur, Teknik Sipil, Desain",
  clerical: "Administrasi, Laboratorium, QA",
};

function strongestHolland(code: string): string {
  const letters = Array.from(new Set((code || "").toUpperCase().replace(/[^A-Z]/g, ""))).slice(0, 2);
  if (!letters.length) return "";
  return letters.map((L) => `${L} (${HOLLAND_NAME[L] ?? ""}) — ${HOLLAND_DESC[L] ?? ""}`).join(" ");
}
function strongestAbility(scores: Record<string, { correct: number; total: number }>): string {
  const entries = Object.entries(scores).map(([k, v]) => ({ k, pct: v.total ? (v.correct / v.total) * 100 : 0 }));
  entries.sort((a, b) => b.pct - a.pct);
  const top = entries[0];
  if (!top || top.pct <= 0) return "";
  return `${ABILITY_NAME[top.k] ?? top.k} — ${ABILITY_DESC[top.k] ?? ""}`;
}

export interface TmbReportData {
  studentName: string;
  studentId?: string | null;
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
/** Bar minat & bakat memakai satu warna (matching palet S.teal); perbedaan = opacity. */
function rgba(hex: string, a: number) {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
}
function levelAlpha(l: string) {
  return l === "high" ? 1 : l === "medium" ? 0.62 : 0.38;
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

function bar(label: string, pct: number, color: string, right?: string, desc?: string) {
  const w = Math.max(Math.min(pct, 100), 0);
  return `
    <tr>
      <td style="width:37%;padding:3px 6px 3px 0;font-size:11px;color:${S.ink};vertical-align:middle;">
        ${label}
        ${desc ? `<div style="font-size:8.6px;color:#5F6572;line-height:1.4;margin-top:1px;">${desc}</div>` : ""}
      </td>
      <td style="width:53%;padding:3px 0;vertical-align:middle;">
        <div style="position:relative;height:14px;border-radius:7px;background:#EEEFF4;overflow:hidden">
          <div style="height:100%;width:${w}%;border-radius:7px;background:${color}"></div>
        </div>
      </td>
      <td style="width:10%;padding:3px 0 3px 6px;font-size:10px;color:${S.gray};text-align:right;vertical-align:middle;">${right ?? ""}</td>
    </tr>`;
}

export function renderReportHtml(r: TmbReportData, qrData = ""): string {
  const dims = ["R", "I", "A", "S", "E", "C"];
  const max = Math.max(...dims.map((d) => r.hollandScores?.[d] ?? 0), 0.1);
  const riasec = dims
    .map((d) => {
      const score = Math.round((r.hollandScores?.[d] ?? 0) * 100);
      const pct = ((r.hollandScores?.[d] ?? 0) / max) * 100;
      // 100% = hijau penuh; skor lebih rendah → opacity menurun (indikator melemah)
      const alpha = 0.3 + 0.7 * (pct / 100);
      return bar(
        `${d} · ${HOLLAND_NAME[d] ?? ""}`,
        pct,
        rgba(S.teal, alpha),
        `${score}%`,
        `${HOLLAND_DESC[d]} <b>Karier:</b> ${HOLLAND_CAREERS[d]}`,
      );
    })
    .join("");

  const ability = Object.entries(ABILITY_NAME)
    .map(([k, label]) => {
      const s = r.abilityScores?.[k] ?? { correct: 0, total: 0 };
      const lv = r.abilityLevels?.[k] ?? "medium";
      const pct = s.total ? (s.correct / s.total) * 100 : 0;
      return bar(
        label,
        pct,
        rgba(S.teal, levelAlpha(lv)),
        `${s.correct}/${s.total} · ${levelLabel(lv)}`,
        `${ABILITY_DESC[k]} <b>Cocok untuk:</b> ${ABILITY_CAREERS[k]}`,
      );
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
    @page { size: A4; margin: 12mm 13mm 16mm 13mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sec, .head, table.majors, .closing { break-inside: avoid; page-break-inside: avoid; }
    .pfoot { display: none; }
    body { margin:0; padding:0; font-family: 'Segoe UI', Roboto, system-ui, sans-serif; color: ${S.ink}; font-size: 11.5px; line-height: 1.5; }
    .head { background: ${S.navy}; color:#fff; padding: 16px 22px 14px; border-radius: 10px; position:relative; }
    .head h1 { margin:0; font-size: 21px; }
    .head p { margin:3px 0 0; color:#D9DCEF; font-size:11px; }
    .head .meta { margin-top:7px; font-size:9px; color:#AEB2D6; }
    .logo { position:absolute; right:20px; top:16px; height:26px; }
    .sec { margin-top: 20px; }
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
      <div style="margin-top:8px;font-size:11.5px;"><b style="color:${S.teal};">Kode Minat: ${r.hollandCode || "---"}</b></div>
      ${r.hollandCode ? `<div style="margin-top:6px;font-size:10px;color:#4A4F5C;background:#F4F6FB;border-left:3px solid ${S.orange};padding:7px 10px;border-radius:6px;"><b style="color:${S.navy};">Apa arti kode ini?</b><br/>${strongestHolland(r.hollandCode)}<div style="margin-top:6px;padding-top:5px;border-top:1px dashed #D7DBE6;font-size:8.5px;color:#7A7F8C;line-height:1.5;">💡 Huruf kode ditulis berurutan dari skor tertinggi ke terendah. Jika ada skor yang sama, urutan mengikuti abjad huruf (mis. A sebelum R). Referensi: teori tipe kepribadian karier Holland (RIASEC).</div></div>` : ""}
    </div>

    <div class="sec">
      <h2>2. Profil Kemampuan</h2>
      <table class="bars"><tbody>${ability}</tbody></table>
      ${r.abilityScores ? `<div style="margin-top:8px;font-size:10px;color:#4A4F5C;background:#F4F6FB;border-left:3px solid #0D9488;padding:7px 10px;border-radius:6px;"><b style="color:${S.navy};">Kekuatanmu kini:</b> ${strongestAbility(r.abilityScores)}</div>` : ""}
    </div>

    <div class="sec">
      <h2>3. Rekomendasi Jurusan &amp; Karier</h2>
      <table class="majors">${majorsHead}<tbody>${majors}</tbody></table>
      ${r.careers?.length ? `<div style="margin-top:10px;font-size:11.5px;"><b style="color:${S.navy};">Karier yang cocok:</b> ${r.careers.slice(0, 6).join(" • ")}</div>` : ""}
      <div class="link-explore">📚 Lihat semua jurusan &amp; bandingkan passing grade di <a href="https://mulaiplus.id/explore" style="color:${S.teal};">mulaiplus.id/explore</a></div>
    </div>

    ${r.summary ? `<div class="sec"><h2>4. Ringkasan AI</h2><div>${r.summary.replace(/\*\*/g, "").replace(/#+\s*/g, "")}</div></div>` : ""}

    <div class="pfoot">Product by MULAI+ · mulaiplus.id · Laporan Test Minat Bakat</div>

    <div class="closing" style="margin-top:20px;border:1px solid #E5E7EF;border-left:4px solid #FE9114;background:#FBFBFE;border-radius:8px;padding:10px 12px;font-size:9.5px;color:#5F6572;line-height:1.55;">
      <div style="display:flex;gap:14px;align-items:flex-start;">
        <div style="flex:1;">
      <b style="color:#1A1F6D;">Penutup</b><br/>
      Tes dan laporan ini <b>hanya sebatas alat bantu eksplorasi</b> minat, bakat, dan preferensi — bersifat informatif,
      <b>bukan penilaian psikologis atau penentu keputusan</b>. Hasil rekomendasi jurusan/karier tidak menjamin keberhasilan
      atau kesesuaian mutlak; keputusan akhir sepenuhnya di tangan kamu bersama keluarga, guru BK, atau psikolog/ahli karier.
      Data yang kami gunakan bersumber dari database program studi MULAI+ (PDDikti &amp; SNPMB) dan dipakai secara terbatas
      untuk personalisasi. Jika kamu ragu, konsultasikan hasil ini sebelum mengambil keputusan besar.
        </div>
        ${
          qrData
            ? `<div style="text-align:center;flex-shrink:0;">
                <img src="${qrData}" alt="QR verifikasi MULAI+" style="width:80px;height:80px;display:block;margin:0 auto 5px;"/>
                <div style="font-size:8px;color:#9AA0AC;line-height:1.35;">Tanda tangan digital<br/>MULAI+ · verifikasi laporan</div>
              </div>`
            : ""
        }
      </div>
    </div>

    <div class="footer-note">Dokumen ini dibuat otomatis oleh Product by MULAI+ · mulaiplus.id · Diterbitkan ${issued} · Ditandatangani digital dengan QR.</div>
  </body></html>`;
}

export async function printTmbReport(r: TmbReportData): Promise<void> {
  const QR = await import("qrcode").then((m) => m.default).catch(() => null);
  // URL verifikasi dari modul esign (HMAC token) — kadar unik per siswa
  let verifyUrl = "";
  if (r.studentId) {
    try {
      const res = await client.esign.signTmbReport({
        studentName: r.studentName || "-",
        studentId: r.studentId,
        documentDate: new Date().toISOString().slice(0, 10),
      });
      if (res?.url) verifyUrl = `https://mulaiplus.id${res.url}`;
    } catch {
      /* esign off — fallback */
    }
  }
  const QR_TEXT =
    verifyUrl ||
    `https://mulaiplus.id/laporan-tmb?nama=${encodeURIComponent(r.studentName || "")}&tgl=${encodeURIComponent(new Date().toISOString().slice(0, 10))}`;
  const qrData =
    QR && typeof document !== "undefined"
      ? await QR.toDataURL(QR_TEXT, {
          margin: 2,
          width: 300,
          errorCorrectionLevel: "M",
          color: { dark: "#15205B" },
        }).catch(() => "")
      : "";
  const IF = "mulai-pdf-print-frame";
  const old = document.getElementById(IF);
  if (old) old.remove();

  const wrap = document.createElement("div");
  wrap.id = IF;
  wrap.innerHTML = renderReportHtml(r, qrData);
  Object.assign(wrap.style, { position: "absolute", left: "-9999px", top: "0" });
  document.body.appendChild(wrap);

  // sembunyikan konten lain saat print, tampilkan hanya frame
  const style = document.createElement("style");
  style.id = `${IF}-css`;
  style.textContent = `@media print {
      body > *:not(#mulai-pdf-print-frame) { display: none !important; }
      body { margin: 0 !important; padding: 0 !important; }
      #mulai-pdf-print-frame { display: block !important; position: static !important; }
      #mulai-pdf-print-frame .pfoot { display: block !important; position: fixed !important; bottom: 4mm; left: 0; right: 0; text-align: center; font-size: 8px; color: #9AA0AC; }
      #mulai-pdf-print-frame .footer-note { margin-bottom: 10mm; }
    }`;
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
