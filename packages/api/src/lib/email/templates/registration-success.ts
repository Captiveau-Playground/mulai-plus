import {
  ctaButton,
  divider,
  emailFooter,
  emailHeader,
  emailLayout,
  heading,
  iconCircle,
  infoCard,
  noticeBox,
  sectionTitle,
  stepList,
  text,
} from "../components";
import { BRAND, COLORS } from "../config";

const CHECK_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>`;

interface RegistrationSuccessData {
  name: string;
  programName: string;
  batchName: string;
}

/**
 * Email: Pendaftaran Berhasil
 * Sent when a user successfully registers for a mentoring program.
 * Brand: navy (#1A1F6D) primary, orange (#FE9114) accent for completed steps.
 */
export function getRegistrationSuccessHtml(data: RegistrationSuccessData): string {
  const steps = [
    { number: 1, label: "Pendaftaran diterima", isCompleted: true },
    { number: 2, label: "Proses seleksi (sedang berlangsung)", isActive: true },
    { number: 3, label: "Pengumuman hasil seleksi" },
  ];

  return emailLayout({
    title: "Pendaftaran Berhasil — MULAI+",
    children: [
      // Brand header with navy + orange gradient bar
      emailHeader(),

      // Check icon in navy circle
      iconCircle({ icon: CHECK_ICON, bgColor: COLORS.navy }),

      // Heading
      heading({ text: "Pendaftaran Berhasil!" }),

      // Greeting
      text({ content: `Halo ${data.name},`, padding: "0 40px 8px 40px" }),

      // Main message
      text({
        content: `Terima kasih telah mendaftar program <strong style="color: ${COLORS.navy};">${data.programName} (${data.batchName})</strong>. Pendaftaran kamu telah kami terima dan sedang dalam proses seleksi.`,
      }),

      // Next steps card
      infoCard({
        children: `
          ${sectionTitle("Langkah Selanjutnya")}
          ${stepList(steps)}`,
      }),

      // Notice
      noticeBox({
        children: `<strong>Penting:</strong> Pantau terus email kamu untuk pengumuman hasil seleksi. Pastikan email dari ${BRAND.name} tidak masuk ke folder spam.`,
      }),

      // CTA
      ctaButton({ href: BRAND.dashboardUrl, label: "Lihat Status Pendaftaran" }),

      // Closing
      text({
        content: `Semoga sukses!<br /><strong style="color: ${COLORS.navy};">Tim ${BRAND.name}</strong>`,
        size: 14,
        color: COLORS.textMuted,
        padding: "0 40px 24px 40px",
      }),

      divider(),
      emailFooter(),
    ].join(""),
  });
}
