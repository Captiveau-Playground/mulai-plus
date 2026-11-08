import {
  ctaButton,
  divider,
  emailFooter,
  emailHeader,
  emailLayout,
  heading,
  noticeBox,
  sectionTitle,
  text,
} from "../components";
import { COLORS } from "../config";

interface AssessmentRetakeData {
  /** Nama siswa (boleh kosong → sapaan generik). */
  name?: string | null;
  /** Link aplikasi (default: halaman tes). */
  url?: string;
  /** Kode minat lama (mis. "I-A-S"), ditampilkan sebagai konteks. */
  oldCode?: string | null;
}

/**
 * Email: Ajak siswa MENGULANG Tes Minat Bakat.
 *
 * Konteks: bank soal & mesin rekomendasi sudah diperbarui — 120 soal minat + 100 soal bakat,
 * 15.000+ prodi di 400+ kampus, dan jalur prodi per karier. Siswa yang hasilnya dari versi
 * lama perlu mengulang agar rekomendasinya ikut baru.
 */
export function getAssessmentRetakeHtml(data: AssessmentRetakeData = {}): string {
  const base = (data.url ?? "https://mulaiplus.id/dashboard/student/assessment").replace(/\/$/, "");
  const name = (data.name ?? "").trim();
  const greet = name ? `Halo ${name}! 👋` : "Halo! 👋";

  const items = [
    "<strong>Bank soal baru</strong> — 120 soal Tes Minat (20 per tipe) + 100 soal Tes Bakat (5 dimensi).",
    "<strong>Rekomendasi lebih kaya</strong> — 5 jurusan & 6 karier, tiap karier punya jalur prodi sendiri.",
    "<strong>Database terbaru</strong> — 15.000+ prodi aktif di 400+ kampus (negeri, swasta, keagamaan).",
    "<strong>Peta rekomendasi</strong> — profil → jurusan → karier → prodi, bisa dijelajahi & diunduh PDF.",
  ];

  const html = emailLayout({
    title: "Tes Minat Bakat MULAI+ sudah diperbarui — ayo coba lagi",
    children: [
      emailHeader(),
      heading({ text: "Tes Minat Bakatmu Sudah Versi Baru 🎉", size: 24 }),

      text({ content: greet, padding: "0 40px 8px 40px" }),
      text({
        content:
          "Kabar baik: <strong>Tes Minat Bakat MULAI+</strong> sudah kami perbarui. Soalnya lebih lengkap dan mesin rekomendasinya sekarang mencocokkan jurusan <em>dan</em> karier dengan data prodi terbaru.",
      }),

      data.oldCode
        ? `<tr><td style="padding: 0 40px 24px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid ${COLORS.border};">
              <tr>
                <td align="center" style="padding: 20px 24px;">
                  <p style="margin: 0; font-size: 13px; color: ${COLORS.textBody}; line-height: 1.7;">
                    Kode minat lamamu: <strong style="color:${COLORS.navy};">${data.oldCode}</strong> — hasil ini tetap tersimpan. Dengan mengulang tes, rekomendasimu akan dihitung ulang memakai data &amp; mesin terbaru.
                  </p>
                </td>
              </tr>
            </table>
          </td></tr>`
        : "",

      // sectionTitle mengembalikan <p> (bukan <tr>) → bungkus agar tidak "lompat" keluar tabel.
      `<tr><td style="padding: 0 40px 8px 40px;">${sectionTitle("Apa yang baru?")}</td></tr>`,
      ...items.map((it) => text({ content: `• ${it}`, padding: "0 40px 6px 40px", size: 13, align: "left" as const })),

      noticeBox({
        children:
          "Mengulang tes akan mengulang <strong>kedua</strong> tes (Tes Minat + Tes Bakat) — total ±45–75 menit. Hasil lama otomatis diganti hasil terbaru, dan kamu bisa mengulang kapan saja.",
      }),

      ctaButton({ href: `${base}`, label: "Mulai Tes Lagi", bgColor: COLORS.orange }),
      divider(),
      emailFooter(),
    ].join(""),
  });
  return html;
}
