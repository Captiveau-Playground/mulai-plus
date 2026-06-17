import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — MULAI+",
  description: "Kebijakan privasi MULAI+ — bagaimana kami mengumpulkan, menggunakan, dan melindungi data Anda.",
  robots: { index: true, follow: true },
};

const sections = [
  {
    id: "data-kami-kumpulkan",
    title: "Data yang Kami Kumpulkan",
    content: [
      "Kami mengumpulkan data yang Anda berikan secara sukarela saat mendaftar atau menggunakan layanan MULAI+, termasuk nama lengkap, alamat email, nomor WhatsApp, asal sekolah, kelas, jurusan, provinsi, dan kota.",
      "Kami juga mengumpulkan data penggunaan platform secara anonim melalui Google Analytics, termasuk halaman yang dikunjungi, durasi kunjungan, dan interaksi dengan fitur — hanya jika Anda menyetujui cookie.",
    ],
  },
  {
    id: "bagaimana-kami-menggunakan-data",
    title: "Bagaimana Kami Menggunakan Data",
    content: [
      "Data pribadi Anda digunakan untuk: (1) memproses pendaftaran program, (2) mengomunikasikan informasi terkait program dan batch, (3) menghubungkan Anda dengan mentor, (4) meningkatkan kualitas layanan dan pengalaman pengguna.",
      "Data agregat dan anonim digunakan untuk analisis internal guna memahami tren penggunaan dan mengembangkan fitur baru.",
    ],
  },
  {
    id: "google-analytics",
    title: "Google Analytics",
    content: [
      "Platform ini menggunakan Google Analytics untuk mengumpulkan data penggunaan seperti halaman yang dikunjungi, durasi sesi, dan interaksi dengan elemen. Data ini bersifat anonim dan tidak dapat diidentifikasi secara pribadi.",
      "Google Analytics menggunakan cookie. Anda dapat memilih untuk menolak cookie analytics melalui banner consent yang muncul saat pertama kali mengunjungi platform ini. Keputusan Anda akan disimpan di browser Anda.",
    ],
    extra: (
      <p className="font-manrope text-base text-text-main/80 leading-relaxed">
        Informasi lebih lanjut tentang cara Google menggunakan data dapat ditemukan di{" "}
        <a
          href="https://policies.google.com/technologies/partner-sites"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-orange underline decoration-brand-orange/30 hover:decoration-brand-orange"
        >
          Kebijakan Privasi Google
        </a>
        .
      </p>
    ),
  },
  {
    id: "microsoft-clarity",
    title: "Microsoft Clarity",
    content: [
      "Platform ini menggunakan Microsoft Clarity untuk merekam sesi pengguna secara anonim, termasuk heatmap dan rekaman interaksi. Data ini membantu kami memahami bagaimana pengguna berinteraksi dengan platform dan mengidentifikasi area yang perlu ditingkatkan.",
      "Microsoft Clarity tidak mengumpulkan informasi yang dapat diidentifikasi secara pribadi. Semua data disamarkan secara otomatis. Anda dapat memilih untuk menolak pelacakan Clarity melalui banner consent yang muncul saat pertama kali mengunjungi platform.",
    ],
    extra: (
      <p className="font-manrope text-base text-text-main/80 leading-relaxed">
        Informasi lebih lanjut tentang Microsoft Clarity dapat ditemukan di{" "}
        <a
          href="https://clarity.microsoft.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-orange underline decoration-brand-orange/30 hover:decoration-brand-orange"
        >
          Situs Resmi Microsoft Clarity
        </a>
        .
      </p>
    ),
  },
  {
    id: "penyimpanan-keamanan-data",
    title: "Penyimpanan & Keamanan Data",
    content: [
      "Data Anda disimpan di server yang aman dengan akses terbatas. Kami menggunakan enkripsi untuk melindungi data sensitif selama transmisi.",
      "Kami menyimpan data Anda selama akun Anda aktif atau selama diperlukan untuk menyediakan layanan. Anda dapat meminta penghapusan data kapan saja dengan menghubungi tim support.",
    ],
  },
  {
    id: "hak-anda",
    title: "Hak Anda",
    content: [
      "Anda memiliki hak untuk: (1) mengakses data pribadi yang kami simpan, (2) memperbaiki data yang tidak akurat, (3) menghapus data Anda, (4) menarik persetujuan cookie analytics kapan saja dengan menghapus cookie browser.",
      "Untuk menggunakan hak-hak ini, hubungi kami melalui email atau WhatsApp yang tercantum di platform.",
    ],
  },
  {
    id: "perubahan-kebijakan",
    title: "Perubahan Kebijakan",
    content: [
      "Kebijakan privasi ini dapat diperbarui dari waktu ke waktu. Perubahan akan diinformasikan melalui platform. Dengan terus menggunakan layanan setelah perubahan, Anda menyetujui kebijakan yang diperbarui.",
    ],
  },
  {
    id: "kontak",
    title: "Kontak",
    content: [
      "Jika Anda memiliki pertanyaan tentang kebijakan privasi ini, hubungi kami di hello@mulaiplus.id atau melalui WhatsApp yang tersedia di platform.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPageShell
      sections={sections}
      icon={
        <svg
          className="h-3.5 w-3.5 text-brand-navy/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
      }
      label="Privacy"
      title="Kebijakan Privasi"
      description="Bagaimana MULAI+ mengumpulkan, menggunakan, dan melindungi data pribadi Anda."
      updatedDate="11 Mei 2026"
      intro="Di MULAI+, kami menghargai privasi Anda. Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda saat menggunakan platform kami. Dengan menggunakan layanan MULAI+, Anda menyetujui praktik yang dijelaskan dalam kebijakan ini."
    />
  );
}
