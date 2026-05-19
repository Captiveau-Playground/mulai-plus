import {
  emailLayout,
  NEWSLETTER_RESPONSIVE_CSS,
  newsletterCard,
  newsletterCta,
  newsletterDivider,
  newsletterFooter,
  newsletterHeader,
  newsletterHeading,
  newsletterHighlight,
  newsletterText,
} from "../components";
import { BRAND } from "../config";

/**
 * Newsletter Broadcast Templates
 *
 * Uses the same component system as transactional emails for consistency.
 * All templates follow the MULAI+ brand guidelines:
 *   - Navy #1A1F6D primary, Orange #FE9114 accent
 *   - Mobile-first responsive (default styles for mobile, min-width for desktop)
 *   - Resend merge tags: {{{contact.first_name}}}, {{{RESEND_UNSUBSCRIBE_URL}}}
 */

export interface NewsletterTemplate {
  id: string;
  label: string;
  description: string;
  snippet: string;
  html: string;
}

function buildNewsletter(title: string, children: string[]): string {
  // Use emailLayout but with newsletter-specific responsive CSS appended
  let html = emailLayout({ title, children: children.join(""), bgColor: "#f4f4f4" });
  // Inject newsletter responsive CSS after existing responsive CSS
  html = html.replace("</style>", `${NEWSLETTER_RESPONSIVE_CSS}</style>`);
  return html;
}

export const NEWSLETTER_TEMPLATES: Record<string, NewsletterTemplate> = {
  // ═══════════════════════════════════════════════════════════════════════
  // 1. Monthly Update
  // ═══════════════════════════════════════════════════════════════════════
  monthly_update: {
    id: "monthly_update",
    label: "Update Bulanan",
    description: "Kirim update program, artikel terbaru, atau kabar bulanan ke subscriber",
    snippet: "Update Bulanan MULAI+ — [Bulan] [Tahun]",
    html: buildNewsletter("Update Bulanan MULAI+", [
      newsletterHeader("📬 Update Bulanan MULAI+", "Edisi {{{contact.month|Mei}}} {{{contact.year|2026}}}"),

      newsletterText(
        `Halo <strong>{{{contact.first_name|peserta}}}</strong>, ada beberapa kabar terbaru dari ${BRAND.name} yang ingin kami bagikan bulan ini:`,
      ),

      newsletterCard(
        "🚀 Program Terbaru",
        `{{{contact.program_title|Judul program mentoring terbaru}}}<br><br>{{{contact.program_desc|Deskripsi singkat program.}}}<br><br><a href="{{{contact.program_link|${BRAND.homeUrl}}}}" style="color:#1A1F6D;font-weight:600;font-size:13px">Lihat Program →</a>`,
      ),

      newsletterCard(
        "📝 Artikel Pilihan",
        `{{{contact.article_title|Judul artikel terbaru}}}<br><br>{{{contact.article_excerpt|Cuplikan artikel singkat.}}}<br><br><a href="{{{contact.article_link|${BRAND.homeUrl}}}}" style="color:#1A1F6D;font-weight:600;font-size:13px">Baca selengkapnya →</a>`,
      ),

      newsletterHighlight("💡 <strong>Tips:</strong> {{{contact.tip|Tips singkat yang bermanfaat untuk pembaca.}}}"),

      newsletterDivider(),
      newsletterCta(BRAND.homeUrl, "Jelajahi MULAI+"),
      newsletterFooter(),
    ]),
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 2. Product Launch
  // ═══════════════════════════════════════════════════════════════════════
  product_launch: {
    id: "product_launch",
    label: "Peluncuran Produk / Program",
    description: "Umumkan program mentoring baru, kursus, atau fitur terbaru",
    snippet: "🚀 Telah Hadir: [Nama Program] — Daftar Sekarang!",
    html: buildNewsletter("Peluncuran Program — MULAI+", [
      newsletterHeader("🚀 Telah Hadir!", "{{{contact.program_name|Nama Program Baru}}}"),

      newsletterText(
        `Halo <strong>{{{contact.first_name|peserta}}}</strong>, kami dengan bangga memperkenalkan program terbaru dari ${BRAND.name}:`,
      ),

      newsletterCard(
        "{{{contact.program_name|Nama Program}}}",
        "{{{contact.program_tagline|Tagline singkat program.}}}",
      ),

      newsletterHeading("Apa yang kamu dapatkan:"),
      newsletterText("✅ {{{contact.benefit_1|Benefit pertama}}}"),
      newsletterText("✅ {{{contact.benefit_2|Benefit kedua}}}"),
      newsletterText("✅ {{{contact.benefit_3|Benefit ketiga}}}"),

      newsletterHighlight("🎯 <strong>Batch 1 dibuka:</strong> {{{contact.start_date|1 Juni 2026}}} — Kuota terbatas!"),

      newsletterCta("{{{contact.registration_link|https://mulaiplus.id}}}", "Daftar Sekarang 🎯"),
      newsletterFooter(),
    ]),
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 3. Weekly Digest
  // ═══════════════════════════════════════════════════════════════════════
  weekly_digest: {
    id: "weekly_digest",
    label: "Ringkasan Mingguan",
    description: "Kirim ringkasan konten, artikel, atau aktivitas mingguan",
    snippet: "📰 Ringkasan Mingguan MULAI+ — [Tanggal]",
    html: buildNewsletter("Ringkasan Mingguan — MULAI+", [
      newsletterHeader("📰 Ringkasan Mingguan", "{{{contact.week_label|Minggu ke-3 Mei 2026}}}"),

      newsletterText("Halo <strong>{{{contact.first_name|peserta}}}</strong>, ini rangkuman minggu ini:"),

      newsletterCard(
        "📝 Artikel Terpopuler",
        `<a href="{{{contact.article_1_link|#}}}" style="color:#1A1F6D;text-decoration:underline">{{{contact.article_1_title|Judul artikel 1}}}</a><br><br><a href="{{{contact.article_2_link|#}}}" style="color:#1A1F6D;text-decoration:underline">{{{contact.article_2_title|Judul artikel 2}}}</a><br><br><a href="{{{contact.article_3_link|#}}}" style="color:#1A1F6D;text-decoration:underline">{{{contact.article_3_title|Judul artikel 3}}}</a>`,
      ),

      newsletterCard("📊 Insight Mentoring", "{{{contact.insight|Insight atau data menarik minggu ini.}}}"),

      newsletterCard(
        "📅 Event Mendatang",
        '<strong>{{{contact.event_date|Tanggal}}}</strong> — {{{contact.event_name|Nama event}}}<br><span style="font-size:11px;color:#888">{{{contact.event_desc|Deskripsi singkat event.}}}</span>',
      ),

      newsletterDivider(),
      newsletterCta("{{{contact.cta_link|https://mulaiplus.id}}}", "{{{contact.cta_text|Lihat Semua Konten}}}"),
      newsletterFooter(),
    ]),
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 4. Simple Announcement
  // ═══════════════════════════════════════════════════════════════════════
  simple_announcement: {
    id: "simple_announcement",
    label: "Pengumuman Singkat",
    description: "Template minimalis untuk pengumuman cepat",
    snippet: "📢 [Judul Pengumuman]",
    html: buildNewsletter("Pengumuman — MULAI+", [
      newsletterHeader("📢 Pengumuman", "{{{contact.announcement_title|Judul Pengumuman}}}"),

      newsletterText("Halo <strong>{{{contact.first_name|peserta}}}</strong>,"),

      newsletterText(
        "{{{contact.announcement_body|Isi pengumuman di sini. Jelaskan apa yang berubah atau apa yang perlu diketahui.}}}",
      ),

      newsletterHighlight("{{{contact.highlight|Poin penting yang perlu digarisbawahi.}}}"),

      newsletterCta("{{{contact.cta_link|https://mulaiplus.id}}}", "{{{contact.cta_text|Pelajari Lebih Lanjut}}}"),
      newsletterFooter(),
    ]),
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 5. Changelog
  // ═══════════════════════════════════════════════════════════════════════
  changelog: {
    id: "changelog",
    label: "Changelog / Pembaruan",
    description: "Umumkan fitur baru, perbaikan, atau perubahan platform",
    snippet: "🔄 Apa yang Baru di MULAI+ — [Tanggal]",
    html: buildNewsletter("Changelog — MULAI+", [
      newsletterHeader("🔄 Apa yang Baru", "{{{contact.version|Versi 2.1}}} — {{{contact.release_date|19 Mei 2026}}}"),

      newsletterText("Halo <strong>{{{contact.first_name|peserta}}}</strong>, berikut pembaruan terbaru:"),

      newsletterCard("✨ Fitur Baru", "{{{contact.feature_new|Deskripsi fitur baru.}}}"),
      newsletterCard("🔧 Perbaikan", "{{{contact.feature_fix|Deskripsi perbaikan.}}}"),
      newsletterCard("📈 Peningkatan", "{{{contact.feature_improve|Deskripsi peningkatan.}}}"),

      newsletterText(
        `<span style="color:#888;font-size:12px">Punya saran? Balas email ini atau hubungi <a href="mailto:${BRAND.supportEmail}" style="color:#1A1F6D">${BRAND.supportEmail}</a></span>`,
      ),

      newsletterFooter(),
    ]),
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
