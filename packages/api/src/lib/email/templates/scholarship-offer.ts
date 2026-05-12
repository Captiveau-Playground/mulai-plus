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
  numberedList,
  sectionTitle,
  spacer,
  text,
} from "../components";
import { COLORS } from "../config";

const GIFT_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 12v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1"></path>
    <rect x="4" y="5" width="16" height="3" rx="1"></rect>
    <path d="M12 5v9"></path>
    <path d="M8 5a2 2 0 0 1 0-4c2 0 4 2.5 4 5"></path>
    <path d="M16 5a2 2 0 0 0 0-4c-2 0-4 2.5-4 5"></path>
  </svg>`;

interface ScholarshipOfferData {
  firstName: string;
  registrationLink: string;
}

/**
 * Email: Program Beasiswa Mentoring Gratis
 * Sent to research participants as a thank-you / scholarship offer.
 * Can be sent in batch to many recipients.
 */
export function getScholarshipOfferHtml(data: ScholarshipOfferData): string {
  const benefits = [
    { number: 1, text: "Lebih mengenal diri sendiri" },
    { number: 2, text: "Memahami minat dan potensi" },
    { number: 3, text: "Mendapat gambaran tentang dunia kuliah & karier" },
    { number: 4, text: "Berdiskusi langsung bersama mentor" },
    { number: 5, text: "Belajar mengambil keputusan dengan lebih percaya diri" },
  ];

  return emailLayout({
    title: "Program Beasiswa Mentoring Gratis — MULAI+",
    children: [
      emailHeader(),

      // Gift icon in navy circle
      iconCircle({ icon: GIFT_ICON, bgColor: COLORS.navy }),

      // Main heading
      heading({
        text: `Terima Kasih, ${data.firstName}!`,
        size: 24,
      }),

      // Subheading with emoji
      text({
        content: 'Terima Kasih Sudah Menjadi Bagian dari Riset MULAI+ <span style="font-size: 20px;">💐</span>',
        size: 16,
        color: COLORS.textMuted,
        weight: "500",
        padding: "0 40px 8px 40px",
      }),

      // Greeting
      text({
        content: "Halo teman-teman <span style='font-size: 16px;'>👋</span>",
        padding: "0 40px 8px 40px",
      }),

      // Thank you message
      text({
        content:
          "Sebelumnya, terima kasih banyak karena sudah bersedia meluangkan waktu untuk menjadi bagian dari riset <strong style='color: #1A1F6D;'>market validation MULAI+</strong>.",
        padding: "0 40px 16px 40px",
      }),

      text({
        content:
          "Lewat cerita, jawaban, dan insight yang kalian bagikan, kami jadi lebih memahami keresahan banyak siswa SMA yang masih bingung menentukan jurusan, kuliah, maupun arah masa depan setelah lulus sekolah.",
        padding: "0 40px 24px 40px",
      }),

      // Divider
      divider(),

      spacer(12),

      // Scholarship announcement heading
      heading({
        text: "Program Beasiswa Mentoring Gratis 🎓✨",
        size: 20,
        color: COLORS.orange,
      }),

      // Announcement body
      text({
        content:
          "Sebagai bentuk apresiasi, kami ingin memberitahukan bahwa <strong style='color: #1A1F6D;'>MULAI+ membuka Program Beasiswa Mentoring Gratis</strong> yang dirancang khusus untuk membantu teman-teman:",
        padding: "0 40px 20px 40px",
      }),

      // Benefits list (navy numbered circles)
      infoCard({
        children: `
          ${sectionTitle("Apa yang akan kamu dapatkan?")}
          ${numberedList(benefits)}`,
      }),

      // Quota notice
      noticeBox({
        bgColor: "#fef3c7",
        textColor: "#92400e",
        children:
          "<strong>Kuota terbatas!</strong> Program ini hanya tersedia untuk <strong>10 siswa</strong> melalui seleksi oleh tim MULAI+.",
      }),

      spacer(12),

      // CTA
      ctaButton({
        href: data.registrationLink,
        label: "Daftar Program Beasiswa",
      }),

      // Closing
      text({
        content: [
          "Sekali lagi, terima kasih sudah menjadi bagian awal perjalanan MULAI+.",
          "Semoga program ini bisa benar-benar membantu kamu menemukan arah yang lebih jelas untuk langkah berikutnya <span style='font-size: 14px;'>🌱</span>",
        ].join("<br />"),
        size: 14,
        color: COLORS.textMuted,
        padding: "0 40px 20px 40px",
      }),

      text({
        content: [
          "See you soon!",
          "<br />",
          "Warm regards,<br />",
          '<strong style="color: #1A1F6D;">Tim MULAI+</strong>',
        ].join(""),
        size: 14,
        color: COLORS.textMuted,
        padding: "0 40px 24px 40px",
      }),

      divider(),
      emailFooter(),
    ].join(""),
  });
}
