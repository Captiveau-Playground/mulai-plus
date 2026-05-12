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
  stepList,
  text,
} from "../components";
import { BRAND, COLORS } from "../config";

const CHECK_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${COLORS.greenDark}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>`;

const CLOCK_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${COLORS.navy}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>`;

const BELL_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
  </svg>`;

interface RegistrationSuccessData {
  name: string;
  programName: string;
  batchName: string;
}

/**
 * Email sent when a user successfully registers for a mentoring program.
 */
export function getRegistrationSuccessHtml(data: RegistrationSuccessData): string {
  const steps = [
    { number: 1, label: "Pendaftaran diterima", isCompleted: true },
    { number: 2, label: "Proses seleksi (sedang berlangsung)", isActive: true },
    { number: 3, label: "Pengumuman hasil seleksi" },
  ];

  return emailLayout({
    title: "Pendaftaran Mentoring Berhasil",
    children: [
      emailHeader(),
      iconCircle({ icon: CHECK_ICON }),
      heading({ text: "Pendaftaran Berhasil!" }),
      text({
        content: `Halo ${data.name},`,
        padding: "0 40px 8px 40px",
      }),
      text({
        content: `Terima kasih telah mendaftar program <strong>${data.programName} (${data.batchName})</strong>. Pendaftaran kamu telah kami terima dan sedang dalam proses seleksi.`,
      }),
      infoCard({
        children: `
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom: 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 12px;">
                      <span style="display: block; width: 24px; height: 24px;">${CLOCK_ICON}</span>
                    </td>
                    <td style="vertical-align: middle;">
                      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.textPrimary}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                        Langkah Selanjutnya
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td>${stepList(steps)}</td>
            </tr>
          </table>`,
      }),
      noticeBox({
        iconSvg: BELL_ICON,
        children: `<strong>Penting:</strong> Pantau terus email kamu untuk pengumuman hasil seleksi. Pastikan email dari ${BRAND.name} tidak masuk ke folder spam.`,
      }),
      ctaButton({ href: BRAND.dashboardUrl, label: "Lihat Status Pendaftaran" }),
      text({
        content: `Semoga sukses!<br /><strong style="color: ${COLORS.textBody};">Tim ${BRAND.name}</strong>`,
        size: 14,
        color: COLORS.textMuted,
        padding: "0 40px 24px 40px",
      }),
      divider(),
      emailFooter(),
    ].join(""),
  });
}
