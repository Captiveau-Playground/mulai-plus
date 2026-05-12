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
  sectionTitle,
  text,
} from "../components";
import { BRAND, COLORS } from "../config";

const CHECK_WHITE = `
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>`;

interface ApplicationAcceptedData {
  firstName: string;
  programName: string;
  startDate: string;
}

/**
 * Email: Pendaftaran Diterima
 * Sent when a user's application is accepted.
 * Brand: navy (#1A1F6D) primary, green status indicators.
 */
export function getApplicationAcceptedHtml(data: ApplicationAcceptedData): string {
  const nextSteps = [
    { number: 1, text: "Lengkapi profil Anda di dashboard mentoring" },
    { number: 2, text: "Kenali mentor yang akan membimbing Anda" },
    { number: 3, text: "Jadwalkan sesi mentoring pertama Anda" },
  ];

  return emailLayout({
    title: "Pendaftaran Diterima — MULAI+",
    bgColor: "#f0fdf4",
    children: [
      emailHeader(),

      // Check icon in navy circle
      iconCircle({ icon: CHECK_WHITE, bgColor: COLORS.navy }),

      // Heading in navy
      heading({ text: `Selamat, ${data.firstName}!` }),

      // Subheading
      text({
        content: "Pendaftaran Mentoring Anda Telah Diterima",
        size: 17,
        color: COLORS.orange,
        weight: "600",
        padding: "0 40px 8px 40px",
      }),

      // Body
      text({
        content:
          "Kami dengan senang hati mengabarkan bahwa pendaftaran Anda untuk program mentoring telah berhasil disetujui. Anda kini resmi menjadi bagian dari komunitas mentoring kami.",
        padding: "0 40px 24px 40px",
      }),

      // Info card with details
      infoCard({
        children: `
          ${sectionTitle("Detail Pendaftaran")}
          ${infoRow({ label: "Status", value: "Diterima", valueColor: COLORS.orange })}
          ${infoRow({ label: "Tanggal Mulai", value: data.startDate })}
          ${infoRow({ label: "Program", value: data.programName })}`,
      }),

      // Next steps
      text({
        content: sectionTitle("Langkah Selanjutnya") + numberedList(nextSteps),
        align: "left",
        padding: "0 40px 24px 40px",
      }),

      // CTA
      ctaButton({
        href: BRAND.dashboardUrl,
        label: "Akses Dashboard Mentoring",
      }),

      divider(),
      emailFooter(),
    ].join(""),
  });
}
