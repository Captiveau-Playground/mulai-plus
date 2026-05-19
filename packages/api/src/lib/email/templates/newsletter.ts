/**
 * Newsletter Broadcast Templates
 *
 * Ready-to-use HTML templates for Resend Broadcast.
 * Uses Resend's merge tag syntax:
 *   {{{contact.first_name|fallback}}}   — first name with default
 *   {{{contact.email}}}                 — email address
 *   {{{RESEND_UNSUBSCRIBE_URL}}}        — auto-generated unsubscribe link
 *
 * Usage:
 *   import { NEWSLETTER_TEMPLATES } from "@mulai-plus/api/lib/email";
 *   const html = NEWSLETTER_TEMPLATES.monthly_update.html;
 */

const BRAND = {
  name: "MULAI+",
  color: "#1A1F6D",
  accent: "#FE9114",
  logoUrl: "https://mulaiplus.id/light-type-logo.svg",
  homeUrl: "https://mulaiplus.id",
  supportEmail: "hello@mulaiplus.id",
};

/* ═══════════════════════════════════════════════════════════════════════════
 * MULAI+ Design System — Newsletter Templates
 * Mobile-first: default styles for mobile (<600px), min-width for desktop.
 * ═════════════════════════════════════════════════════════════════════════ */
const css = `
  /* ── Reset & Base (Mobile Default) ──────────────────────────────── */
  body {
    margin: 0; padding: 0; width: 100% !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: #f4f4f4; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;
  }
  img { border: 0; outline: none; text-decoration: none; display: block; max-width: 100%; }

  /* ── Wrapper (full-width on mobile) ─────────────────────────────── */
  .wrapper {
    width: 100% !important; max-width: 600px; margin: 0 auto;
    background: #ffffff; border-radius: 0; overflow: hidden;
  }

  /* ── Header ─────────────────────────────────────────────────────── */
  .header {
    background: ${BRAND.color}; padding: 28px 16px; text-align: center;
  }
  .header h1 {
    color: #ffffff; font-size: 20px; margin: 8px 0 4px;
    font-weight: 700; line-height: 1.3; letter-spacing: -0.3px;
  }
  .header p {
    color: rgba(255,255,255,0.75); font-size: 13px; margin: 0;
  }

  /* ── Body ───────────────────────────────────────────────────────── */
  .body {
    padding: 24px 16px;
  }
  .body h2 {
    color: ${BRAND.color}; font-size: 17px; margin: 0 0 12px; font-weight: 700; line-height: 1.3;
  }
  .body p {
    color: #333; font-size: 14px; line-height: 1.6; margin: 0 0 14px;
  }
  .body a { color: ${BRAND.color}; text-decoration: underline; }

  /* ── CTA Button (full-width on mobile) ──────────────────────────── */
  .cta {
    display: block; width: 100%; box-sizing: border-box;
    background: ${BRAND.accent}; color: #ffffff !important; text-decoration: none !important;
    padding: 14px 24px; border-radius: 8px; font-size: 15px; font-weight: 700;
    margin: 12px 0 16px; text-align: center;
  }

  /* ── Card ───────────────────────────────────────────────────────── */
  .card {
    background: #f8f9fc; border-radius: 12px; padding: 16px;
    margin: 14px 0;
  }
  .card h3 {
    color: ${BRAND.color}; font-size: 15px; margin: 0 0 6px; font-weight: 600;
  }
  .card p { font-size: 13px; margin: 0 0 6px; color: #555; line-height: 1.55; }
  .card p:last-child { margin-bottom: 0; }

  /* ── Divider ────────────────────────────────────────────────────── */
  .divider { border-top: 1px solid #e2e8f0; margin: 20px 0; }

  /* ── Highlight ──────────────────────────────────────────────────── */
  .highlight {
    background: #fef3c7; border-left: 4px solid #f59e0b;
    padding: 12px 14px; border-radius: 0 8px 8px 0; margin: 14px 0;
  }
  .highlight p { font-size: 13px; color: #92400e; margin: 0; line-height: 1.5; }

  /* ── Footer ─────────────────────────────────────────────────────── */
  .footer {
    background: #f8f9fc; padding: 20px 16px; text-align: center;
  }
  .footer p {
    font-size: 11px; color: #9ca3af; margin: 0 0 4px; line-height: 1.5;
  }
  .footer a { color: #9ca3af; text-decoration: underline; }

  /* ── Desktop enhancements (≥600px) ──────────────────────────────── */
  @media only screen and (min-width: 600px) {
    body { padding: 40px 20px; }
    .wrapper { border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .header { padding: 32px 32px; }
    .header h1 { font-size: 22px; }
    .header p { font-size: 14px; }
    .body { padding: 32px 32px; }
    .body h2 { font-size: 18px; }
    .body p { font-size: 15px; }
    .cta { display: inline-block; width: auto; padding: 14px 36px; }
    .card { padding: 20px 24px; }
    .card h3 { font-size: 16px; }
    .card p { font-size: 14px; }
    .footer { padding: 24px 32px; }
    .footer p { font-size: 12px; }
  }
`;

export interface NewsletterTemplate {
  id: string;
  label: string;
  description: string;
  /** Brief copy-paste example */
  snippet: string;
  /** Full HTML template */
  html: string;
}

export const NEWSLETTER_TEMPLATES: Record<string, NewsletterTemplate> = {
  // ── Monthly Update ─────────────────────────────────────────────────────
  monthly_update: {
    id: "monthly_update",
    label: "Update Bulanan",
    description: "Kirim update program, artikel terbaru, atau kabar bulanan ke subscriber",
    snippet: "Update Bulanan MULAI+ — [Bulan] [Tahun]",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${css}</style></head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 20px;">
<tr><td align="center">
<table class="wrapper" cellpadding="0" cellspacing="0">
  <tr><td class="header">
    <h1>📬 Update Bulanan MULAI+</h1>
    <p>Edisi {{{contact.month|Mei}}} {{{contact.year|2026}}}</p>
  </td></tr>
  <tr><td class="body">
    <p>Halo <strong>{{{contact.first_name|peserta}}}</strong>,</p>
    <p>Ada beberapa kabar terbaru dari MULAI+ yang ingin kami bagikan bulan ini:</p>

    <div class="card">
      <h3>🚀 Program Terbaru</h3>
      <p>{{{contact.program_title|Judul program mentoring terbaru}}}</p>
      <p style="margin-top:8px">{{{contact.program_desc|Deskripsi singkat program.}}}</p>
      <a href="{{{contact.program_link|https://mulaiplus.id}}}" class="cta">Lihat Program →</a>
    </div>

    <div class="card">
      <h3>📝 Artikel Pilihan</h3>
      <p>{{{contact.article_title|Judul artikel terbaru}}}</p>
      <p style="margin-top:8px">{{{contact.article_excerpt|Cuplikan artikel singkat.}}}</p>
      <a href="{{{contact.article_link|https://mulaiplus.id}}}" style="color:${BRAND.color};font-weight:600;font-size:14px">Baca selengkapnya →</a>
    </div>

    <div class="highlight">
      <p>💡 <strong>Tips:</strong> {{{contact.tip|Tips singkat yang bermanfaat untuk pembaca.}}}</p>
    </div>

    <div class="divider"></div>
    <p style="text-align:center">
      <a href="${BRAND.homeUrl}" class="cta">Jelajahi MULAI+</a>
    </p>
  </td></tr>
  <tr><td class="footer">
    <p>${BRAND.name} — Platform Mentoring &amp; Pembelajaran</p>
    <p><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a> dari newsletter ini kapan saja.</p>
    <p style="margin-top:8px">${BRAND.supportEmail}</p>
  </td></tr>
</table>
</td></tr></table></body></html>`,
  },

  // ── Product Launch ──────────────────────────────────────────────────────
  product_launch: {
    id: "product_launch",
    label: "Peluncuran Produk / Program",
    description: "Umumkan program mentoring baru, kursus, atau fitur terbaru",
    snippet: "🚀 Telah Hadir: [Nama Program] — Daftar Sekarang!",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${css}</style></head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 20px;">
<tr><td align="center">
<table class="wrapper" cellpadding="0" cellspacing="0">
  <tr><td class="header">
    <h1>🚀 Telah Hadir!</h1>
    <p>{{{contact.program_name|Nama Program Baru}}}</p>
  </td></tr>
  <tr><td class="body">
    <p>Halo <strong>{{{contact.first_name|peserta}}}</strong>,</p>
    <p>Kami dengan bangga memperkenalkan program terbaru dari MULAI+:</p>

    <div class="card" style="text-align:center">
      <h3>{{{contact.program_name|Nama Program}}}</h3>
      <p>{{{contact.program_tagline|Tagline singkat program.}}}</p>
    </div>

    <h2>Apa yang kamu dapatkan:</h2>
    <p>✅ {{{contact.benefit_1|Benefit pertama}}}</p>
    <p>✅ {{{contact.benefit_2|Benefit kedua}}}</p>
    <p>✅ {{{contact.benefit_3|Benefit ketiga}}}</p>

    <div class="highlight">
      <p>🎯 <strong>Batch 1 dibuka:</strong> {{{contact.start_date|1 Juni 2026}}} — Kuota terbatas!</p>
    </div>

    <p style="text-align:center;margin-top:20px">
      <a href="{{{contact.registration_link|https://mulaiplus.id}}}" class="cta">Daftar Sekarang 🎯</a>
    </p>
  </td></tr>
  <tr><td class="footer">
    <p>${BRAND.name} — Platform Mentoring &amp; Pembelajaran</p>
    <p><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a> dari newsletter ini kapan saja.</p>
    <p style="margin-top:8px">${BRAND.supportEmail}</p>
  </td></tr>
</table>
</td></tr></table></body></html>`,
  },

  // ── Weekly Digest ───────────────────────────────────────────────────────
  weekly_digest: {
    id: "weekly_digest",
    label: "Ringkasan Mingguan",
    description: "Kirim ringkasan konten, artikel, atau aktivitas mingguan",
    snippet: "📰 Ringkasan Mingguan MULAI+ — [Tanggal]",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${css}</style></head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 20px;">
<tr><td align="center">
<table class="wrapper" cellpadding="0" cellspacing="0">
  <tr><td class="header">
    <h1>📰 Ringkasan Mingguan</h1>
    <p>{{{contact.week_label|Minggu ke-3 Mei 2026}}}</p>
  </td></tr>
  <tr><td class="body">
    <p>Halo <strong>{{{contact.first_name|peserta}}}</strong>, ini rangkuman minggu ini:</p>

    <div class="card">
      <h3>📝 Artikel Terpopuler</h3>
      <p><a href="{{{contact.article_1_link|#}}}">{{{contact.article_1_title|Judul artikel 1}}}</a></p>
      <p><a href="{{{contact.article_2_link|#}}}">{{{contact.article_2_title|Judul artikel 2}}}</a></p>
      <p><a href="{{{contact.article_3_link|#}}}">{{{contact.article_3_title|Judul artikel 3}}}</a></p>
    </div>

    <div class="card">
      <h3>📊 Insight Mentoring</h3>
      <p>{{{contact.insight|Insight atau data menarik minggu ini.}}}</p>
    </div>

    <div class="card">
      <h3>📅 Event Mendatang</h3>
      <p><strong>{{{contact.event_date|Tanggal}}}</strong> — {{{contact.event_name|Nama event}}}</p>
      <p style="font-size:13px;color:#888">{{{contact.event_desc|Deskripsi singkat event.}}}</p>
    </div>

    <div class="divider"></div>
    <p style="text-align:center">
      <a href="{{{contact.cta_link|https://mulaiplus.id}}}" class="cta">{{{contact.cta_text|Lihat Semua Konten}}}</a>
    </p>
  </td></tr>
  <tr><td class="footer">
    <p>${BRAND.name} — Platform Mentoring &amp; Pembelajaran</p>
    <p><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a> dari newsletter ini kapan saja.</p>
    <p style="margin-top:8px">${BRAND.supportEmail}</p>
  </td></tr>
</table>
</td></tr></table></body></html>`,
  },

  // ── Simple Announcement ─────────────────────────────────────────────────
  simple_announcement: {
    id: "simple_announcement",
    label: "Pengumuman Singkat",
    description: "Template minimalis untuk pengumuman cepat",
    snippet: "📢 [Judul Pengumuman]",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${css}</style></head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 20px;">
<tr><td align="center">
<table class="wrapper" cellpadding="0" cellspacing="0">
  <tr><td class="header">
    <h1>📢 Pengumuman</h1>
    <p>{{{contact.announcement_title|Judul Pengumuman}}}</p>
  </td></tr>
  <tr><td class="body">
    <p>Halo <strong>{{{contact.first_name|peserta}}}</strong>,</p>
    <p>{{{contact.announcement_body|Isi pengumuman di sini. Jelaskan apa yang berubah atau apa yang perlu diketahui.}}}</p>

    <div class="highlight">
      <p>{{{contact.highlight|Poin penting yang perlu digarisbawahi.}}}</p>
    </div>

    <p style="text-align:center;margin-top:20px">
      <a href="{{{contact.cta_link|https://mulaiplus.id}}}" class="cta">{{{contact.cta_text|Pelajari Lebih Lanjut}}}</a>
    </p>
  </td></tr>
  <tr><td class="footer">
    <p>${BRAND.name} — Platform Mentoring &amp; Pembelajaran</p>
    <p><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a> dari newsletter ini kapan saja.</p>
    <p style="margin-top:8px">${BRAND.supportEmail}</p>
  </td></tr>
</table>
</td></tr></table></body></html>`,
  },

  // ── Changelog / Update ──────────────────────────────────────────────────
  changelog: {
    id: "changelog",
    label: "Changelog / Pembaruan",
    description: "Umumkan fitur baru, perbaikan, atau perubahan platform",
    snippet: "🔄 Apa yang Baru di MULAI+ — [Tanggal]",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${css}</style></head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 20px;">
<tr><td align="center">
<table class="wrapper" cellpadding="0" cellspacing="0">
  <tr><td class="header">
    <h1>🔄 Apa yang Baru</h1>
    <p>{{{contact.version|Versi 2.1}}} — {{{contact.release_date|19 Mei 2026}}}</p>
  </td></tr>
  <tr><td class="body">
    <p>Halo <strong>{{{contact.first_name|peserta}}}</strong>,</p>
    <p>Berikut pembaruan terbaru dari platform MULAI+:</p>

    <div class="card">
      <h3>✨ Fitur Baru</h3>
      <p>{{{contact.feature_new|Deskripsi fitur baru yang ditambahkan.}}}</p>
    </div>

    <div class="card">
      <h3>🔧 Perbaikan</h3>
      <p>{{{contact.feature_fix|Deskripsi perbaikan yang dilakukan.}}}</p>
    </div>

    <div class="card">
      <h3>📈 Peningkatan</h3>
      <p>{{{contact.feature_improve|Deskripsi peningkatan performa/UX.}}}</p>
    </div>

    <p style="color:#888;font-size:13px">Punya saran atau feedback? Balas email ini atau hubungi kami di ${BRAND.supportEmail}</p>
  </td></tr>
  <tr><td class="footer">
    <p>${BRAND.name} — Platform Mentoring &amp; Pembelajaran</p>
    <p><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a> dari newsletter ini kapan saja.</p>
    <p style="margin-top:8px">${BRAND.supportEmail}</p>
  </td></tr>
</table>
</td></tr></table></body></html>`,
  },
};

/** Get all template metadata (for listing in UI) */
export function getNewsletterTemplateList() {
  return Object.values(NEWSLETTER_TEMPLATES).map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description,
    snippet: t.snippet,
  }));
}
