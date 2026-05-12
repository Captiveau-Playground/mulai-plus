import {
  ctaButton,
  divider,
  emailFooter,
  emailHeader,
  emailLayout,
  heading,
  iconCircle,
  infoCard,
  infoRow,
  numberedList,
  text,
} from "../components";
import { BRAND, COLORS } from "../config";

const CHECK_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${COLORS.greenDark}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>`;

const USER_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${COLORS.greenDark}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="8" r="5"></circle>
    <path d="M20 21a8 8 0 1 0-16 0"></path>
  </svg>`;

const CALENDAR_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${COLORS.textSubtle}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>`;

const BOOK_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${COLORS.textSubtle}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
  </svg>`;

interface ApplicationAcceptedData {
  firstName: string;
  programName: string;
  startDate: string;
}

/**
 * Email sent when a user's application is accepted into a mentoring program.
 */
export function getApplicationAcceptedHtml(data: ApplicationAcceptedData): string {
  const nextSteps = [
    { number: 1, text: "Lengkapi profil Anda di dashboard mentoring" },
    { number: 2, text: "Kenali mentor yang akan membimbing Anda" },
    { number: 3, text: "Jadwalkan sesi mentoring pertama Anda" },
  ];

  return emailLayout({
    title: "Pendaftaran Mentoring Diterima",
    bgColor: "#f0fdf4",
    children: [
      emailHeader(),
      iconCircle({ icon: CHECK_ICON }),
      heading({ text: `Selamat, ${data.firstName}!`, color: COLORS.greenDark }),
      text({
        content: "Pendaftaran Mentoring Anda Telah Diterima",
        size: 18,
        color: COLORS.textPrimary,
        padding: "0 40px 8px 40px",
      }),
      text({
        content:
          "Kami dengan senang hati mengabarkan bahwa pendaftaran Anda untuk program mentoring telah berhasil disetujui. Anda kini resmi menjadi bagian dari komunitas mentoring kami.",
        padding: "0 40px 24px 40px",
      }),
      infoCard({
        children: [
          infoRow({
            iconSvg: USER_ICON,
            label: "Status Pendaftaran",
            value: "Diterima",
            valueColor: COLORS.greenDark,
          }),
          infoRow({
            iconSvg: CALENDAR_ICON,
            label: "Tanggal Mulai",
            value: data.startDate,
          }),
          infoRow({
            iconSvg: BOOK_ICON,
            label: "Program",
            value: data.programName,
          }),
        ].join(""),
      }),
      text({
        content:
          '<p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: ' +
          COLORS.textPrimary +
          ';">Langkah Selanjutnya:</p>' +
          numberedList(nextSteps),
        align: "left",
        padding: "0 40px 24px 40px",
      }),
      ctaButton({
        href: BRAND.dashboardUrl,
        label: "Akses Dashboard Mentoring",
        bgColor: COLORS.greenDark,
      }),
      divider(),
      emailFooter(),
    ].join(""),
  });
}
