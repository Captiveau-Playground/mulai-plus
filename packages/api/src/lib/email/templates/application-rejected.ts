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
  spacer,
  text,
} from "../components";
import { BRAND, COLORS } from "../config";

const X_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${COLORS.red}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>`;

const INFO_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${COLORS.infoText}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>`;

interface ApplicationRejectedData {
  firstName: string;
  programName: string;
  registrationId: string;
  rejectionReason: string;
}

/**
 * Email sent when a user's application is rejected.
 */
export function getApplicationRejectedHtml(data: ApplicationRejectedData): string {
  return emailLayout({
    title: "Pendaftaran Mentoring Ditolak",
    children: [
      emailHeader(),
      iconCircle({ icon: X_ICON, bgColor: COLORS.rejectionBg }),
      heading({ text: "Pendaftaran Ditolak" }),
      text({
        content: `Halo ${data.firstName},`,
        padding: "0 40px 8px 40px",
      }),
      text({
        content: `Terima kasih atas minat Anda untuk bergabung dalam program mentoring kami. Setelah melalui proses seleksi yang cermat, dengan berat hati kami sampaikan bahwa pendaftaran Anda <strong style="color: ${COLORS.red};">tidak dapat kami terima</strong> untuk periode ini.`,
      }),
      infoCard({
        children: `
          <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: ${COLORS.textSubtle}; text-transform: uppercase; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            Detail Pendaftaran
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid ${COLORS.border};">
                <span style="font-size: 14px; color: ${COLORS.textSubtle}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Program</span>
              </td>
              <td align="right" style="padding: 8px 0; border-bottom: 1px solid ${COLORS.border};">
                <span style="font-size: 14px; color: ${COLORS.textPrimary}; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${data.programName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid ${COLORS.border};">
                <span style="font-size: 14px; color: ${COLORS.textSubtle}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Nomor Pendaftaran</span>
              </td>
              <td align="right" style="padding: 8px 0; border-bottom: 1px solid ${COLORS.border};">
                <span style="font-size: 14px; color: ${COLORS.textPrimary}; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${data.registrationId}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="font-size: 14px; color: ${COLORS.textSubtle}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Status</span>
              </td>
              <td align="right" style="padding: 8px 0;">
                <span style="display: inline-block; padding: 4px 12px; background-color: ${COLORS.rejectionBg}; color: ${COLORS.rejectionText}; font-size: 12px; font-weight: 600; border-radius: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Ditolak</span>
              </td>
            </tr>
          </table>`,
      }),
      // Reason section
      text({
        content: `
          <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: ${COLORS.textPrimary};">Alasan Penolakan:</p>
          <p style="margin: 0; font-size: 15px; color: ${COLORS.textMuted}; line-height: 1.6; padding: 16px; background-color: #fafafa; border-radius: 6px; border: 1px solid ${COLORS.borderLight};">
            ${data.rejectionReason}
          </p>`,
        align: "left",
        padding: "0 40px 32px 40px",
      }),
      // Encouragement
      noticeBox({
        iconSvg: INFO_ICON,
        bgColor: COLORS.infoBg,
        borderColor: COLORS.infoText,
        textColor: COLORS.infoText,
        children: `
          <strong>Jangan menyerah!</strong><br />
          Kami mendorong Anda untuk mendaftar kembali pada periode berikutnya. Tingkatkan keterampilan dan pengalaman Anda, dan kami berharap dapat melihat aplikasi Anda lagi di masa depan.`,
      }),
      spacer(8),
      ctaButton({ href: BRAND.dashboardUrl, label: "Lihat Program Lainnya" }),
      spacer(8),
      text({
        content: `<table role="presentation" cellpadding="0" cellspacing="0" class="mobile-full-width" align="center">
          <tr>
            <td style="border-radius: 8px; border: 2px solid ${COLORS.borderLight};">
              <a href="mailto:${BRAND.supportEmail}" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: ${COLORS.textMuted}; text-decoration: none; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Hubungi Kami
              </a>
            </td>
          </tr>
        </table>`,
        padding: "0 40px 40px 40px",
      }),
      divider(),
      emailFooter(),
    ].join(""),
  });
}
