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
  spacer,
  text,
} from "../components";
import { BRAND, COLORS } from "../config";

const X_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>`;

interface ApplicationRejectedData {
  firstName: string;
  programName: string;
  registrationId: string;
  rejectionReason: string;
}

/**
 * Email: Pendaftaran Ditolak
 * Sent when a user's application is rejected.
 * Brand: red (#F93447) for rejection, navy (#1A1F6D) for CTAs.
 */
export function getApplicationRejectedHtml(data: ApplicationRejectedData): string {
  return emailLayout({
    title: "Pendaftaran Ditolak — MULAI+",
    children: [
      emailHeader(),

      // X icon in red circle
      iconCircle({ icon: X_ICON, bgColor: COLORS.red }),

      // Heading
      heading({ text: "Pendaftaran Ditolak" }),

      // Greeting
      text({ content: `Halo ${data.firstName},`, padding: "0 40px 8px 40px" }),

      // Message
      text({
        content: `Terima kasih atas minat Anda untuk bergabung dalam program mentoring kami. Setelah melalui proses seleksi yang cermat, dengan berat hati kami sampaikan bahwa pendaftaran Anda <strong style="color: ${COLORS.red};">tidak dapat kami terima</strong> untuk periode ini.`,
      }),

      // Detail card
      infoCard({
        children: `
          ${sectionTitle("Detail Pendaftaran")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid ${COLORS.border};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td><p style="margin: 0; font-size: 13px; color: ${COLORS.textSubtle};">Program</p></td>
                    <td align="right"><p style="margin: 0; font-size: 14px; font-weight: 600; color: ${COLORS.textPrimary};">${data.programName}</p></td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid ${COLORS.border};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td><p style="margin: 0; font-size: 13px; color: ${COLORS.textSubtle};">No. Pendaftaran</p></td>
                    <td align="right"><p style="margin: 0; font-size: 14px; font-weight: 600; color: ${COLORS.textPrimary};">${data.registrationId}</p></td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td><p style="margin: 0; font-size: 13px; color: ${COLORS.textSubtle};">Status</p></td>
                    <td align="right">
                      <span style="display: inline-block; padding: 3px 14px; background-color: ${COLORS.rejectionBg}; color: ${COLORS.red}; font-size: 12px; font-weight: 600; border-radius: 20px;">Ditolak</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>`,
      }),

      // Rejection reason
      text({
        content: `
          <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: ${COLORS.navy};">Alasan Penolakan:</p>
          <p style="margin: 0; font-size: 14px; color: ${COLORS.textMuted}; line-height: 1.7; padding: 16px; background-color: #fafafa; border-radius: 8px; border: 1px solid ${COLORS.borderLight};">
            ${data.rejectionReason}
          </p>`,
        align: "left",
        padding: "0 40px 28px 40px",
      }),

      // Encouragement
      noticeBox({
        bgColor: "#f0f9ff",
        textColor: COLORS.infoText,
        children: `
          <strong style="color: ${COLORS.navy};">Jangan menyerah!</strong><br />
          Kami mendorong Anda untuk mendaftar kembali pada periode berikutnya. Tingkatkan keterampilan dan pengalaman Anda, dan kami berharap dapat melihat aplikasi Anda lagi di masa depan.`,
      }),

      spacer(8),

      // CTA
      ctaButton({ href: BRAND.dashboardUrl, label: "Lihat Program Lainnya" }),

      spacer(6),

      // Support link
      text({
        content: `<a href="mailto:${BRAND.supportEmail}" style="color: ${COLORS.navy}; text-decoration: underline; font-weight: 500;">Hubungi Kami</a> jika ada pertanyaan`,
        size: 13,
        color: COLORS.textMuted,
        padding: "0 40px 32px 40px",
      }),

      divider(),
      emailFooter(),
    ].join(""),
  });
}
