import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan — MULAI+",
  description:
    "Syarat dan ketentuan penggunaan platform MULAI+ — hak, kewajiban, dan aturan yang mengatur layanan kami.",
  robots: { index: true, follow: true },
};

const sections = [
  {
    id: "penerimaan-ketentuan",
    title: "Penerimaan Ketentuan",
    content: [
      'Dengan mengakses atau menggunakan platform MULAI+ ("Layanan"), Anda menyetujui untuk terikat oleh Syarat & Ketentuan ini. Jika Anda tidak setuju dengan sebagian atau seluruh ketentuan, jangan gunakan Layanan kami.',
      "Syarat & Ketentuan ini berlaku untuk semua pengguna platform, termasuk pengunjung, calon siswa, siswa terdaftar, mentor, dan mitra.",
    ],
  },
  {
    id: "perubahan-ketentuan",
    title: "Perubahan Ketentuan",
    content: [
      "Kami dapat memperbarui Syarat & Ketentuan ini dari waktu ke waktu. Perubahan akan diinformasikan melalui platform atau email. Dengan terus menggunakan Layanan setelah perubahan, Anda dianggap menyetujui ketentuan yang diperbarui.",
      "Tanggal revisi terbaru akan selalu tercantum di bagian atas halaman ini. Kami menyarankan Anda untuk meninjau halaman ini secara berkala.",
    ],
  },
  {
    id: "pendaftaran-akun",
    title: "Pendaftaran & Akun",
    content: [
      "Untuk mengakses fitur tertentu, Anda perlu mendaftar dan membuat akun. Anda bertanggung jawab penuh atas kerahasiaan informasi akun, termasuk kata sandi, dan semua aktivitas yang terjadi di bawah akun Anda.",
      "Anda wajib memberikan informasi yang akurat, terkini, dan lengkap saat mendaftar. Kami berhak menangguhkan atau menghapus akun jika informasi yang diberikan tidak benar atau jika Anda melanggar ketentuan ini.",
      "Setiap pengguna hanya diperbolehkan memiliki satu akun. Akun bersifat pribadi dan tidak dapat dialihkan kepada pihak lain.",
    ],
  },
  {
    id: "layanan-program",
    title: "Layanan & Program",
    content: [
      "MULAI+ menyediakan layanan bimbingan mentoring, konsultasi pendidikan, program belajar, akses data pendidikan tinggi (termasuk passing grade dan informasi perguruan tinggi), serta konten edukatif lainnya.",
      "Ketersediaan program dan layanan dapat berubah sewaktu-waktu. Kami berhak mengubah, menangguhkan, atau menghentikan program tanpa pemberitahuan sebelumnya, dengan pemberitahuan yang wajar kepada peserta yang terdaftar.",
      "Materi dan konten yang disediakan dalam program bersifat informatif dan edukatif. Keputusan akhir terkait pilihan pendidikan tetap berada di tangan pengguna.",
    ],
  },
  {
    id: "kekayaan-intelektual",
    title: "Kekayaan Intelektual",
    content: [
      "Seluruh konten dalam platform MULAI+, termasuk namun tidak terbatas pada teks, grafik, logo, ikon, gambar, audio, video, modul belajar, dan perangkat lunak, adalah milik MULAI+ atau pemberi lisensinya dan dilindungi oleh undang-undang hak cipta dan kekayaan intelektual yang berlaku.",
      "Anda tidak diperkenankan untuk menyalin, mendistribusikan, memodifikasi, membuat karya turunan, atau mengeksploitasi konten kami untuk tujuan komersial tanpa izin tertulis dari MULAI+.",
      "Materi program yang disediakan selama sesi mentoring hanya untuk penggunaan pribadi peserta dan tidak boleh dibagikan kepada pihak ketiga tanpa izin.",
    ],
  },
  {
    id: "perilaku-pengguna",
    title: "Perilaku Pengguna",
    content: [
      "Anda setuju untuk menggunakan Layanan hanya untuk tujuan yang sah dan sesuai dengan ketentuan ini. Anda dilarang untuk: (a) menggunakan Layanan untuk aktivitas ilegal, (b) mengganggu atau menghentikan integritas platform, (c) mencoba mengakses akun pengguna lain tanpa izin, (d) menyebarkan konten yang melanggar hukum, bersifat diskriminatif, atau mengandung ujaran kebencian.",
    ],
  },
  {
    id: "batasan-tanggung-jawab",
    title: "Batasan Tanggung Jawab",
    content: [
      'MULAI+ menyediakan Layanan "sebagaimana adanya" (as is) tanpa jaminan tersurat maupun tersirat. Kami tidak menjamin bahwa Layanan akan berjalan tanpa gangguan atau bebas dari kesalahan.',
      "MULAI+ tidak bertanggung jawab atas kerugian tidak langsung, insidental, khusus, atau konsekuensial yang timbul dari penggunaan atau ketidakmampuan menggunakan Layanan, termasuk namun tidak terbatas pada keputusan pendidikan yang diambil berdasarkan informasi dari platform.",
      "Hasil mentoring dan bimbingan bersifat individual dan tidak dijamin. Kesuksesan penerimaan di perguruan tinggi atau pencapaian akademik lainnya tergantung pada berbagai faktor di luar kendali MULAI+.",
    ],
  },
  {
    id: "penghapusan-akun",
    title: "Penghapusan & Penghentian Akun",
    content: [
      "Anda dapat menghapus akun kapan saja melalui pengaturan akun atau dengan menghubungi tim support. Kami akan memproses penghapusan dalam waktu 7x24 jam kerja.",
      "Kami berhak menangguhkan atau menghentikan akun Anda jika kami mendeteksi pelanggaran terhadap ketentuan ini, aktivitas mencurigakan, atau jika diminta oleh hukum yang berlaku.",
      "Setelah penghentian akun, akses Anda ke Layanan akan dihentikan. Ketentuan mengenai kekayaan intelektual dan batasan tanggung jawab tetap berlaku setelah penghentian.",
    ],
  },
  {
    id: "hukum-yang-berlaku",
    title: "Hukum yang Berlaku",
    content: [
      "Syarat & Ketentuan ini diatur oleh dan ditafsirkan sesuai dengan hukum Republik Indonesia. Setiap sengketa yang timbul dari ketentuan ini akan diselesaikan melalui musyawarah terlebih dahulu, dan jika tidak tercapai kesepakatan, melalui pengadilan yang berwenang di Indonesia.",
    ],
  },
  {
    id: "kontak",
    title: "Kontak",
    content: [
      "Jika Anda memiliki pertanyaan tentang Syarat & Ketentuan ini, silakan hubungi kami di hello@mulaiplus.id atau melalui WhatsApp yang tersedia di platform.",
    ],
  },
];

export default function TermsPage() {
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
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
      }
      label="Terms"
      title="Syarat & Ketentuan"
      description="Hak, kewajiban, dan aturan yang mengatur penggunaan platform MULAI+."
      updatedDate="9 Juni 2026"
      intro="Selamat datang di MULAI+. Dengan mengakses dan menggunakan platform MULAI+, Anda menyetujui Syarat & Ketentuan ini. Harap baca dengan saksama sebelum menggunakan layanan kami. Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi tim kami."
    />
  );
}
