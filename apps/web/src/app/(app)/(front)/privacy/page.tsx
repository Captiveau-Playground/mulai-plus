import type { Metadata } from "next";

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
      <p className="font-manrope text-base text-text-main/85 leading-relaxed">
        Informasi lebih lanjut tentang cara Google menggunakan data dapat ditemukan di{" "}
        <a
          href="https://policies.google.com/technologies/partner-sites"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-orange underline hover:text-brand-navy"
        >
          Kebijakan Privasi Google
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
      "Jika Anda memiliki pertanyaan tentang kebijakan privasi ini, hubungi kami di support@mulaiplus.id atau melalui WhatsApp yang tersedia di platform.",
    ],
  },
];

function PrivacySection({
  title,
  content,
  extra,
  index,
}: {
  title: string;
  content: string[];
  extra?: React.ReactNode;
  index: number;
}) {
  return (
    <section className="scroll-mt-20">
      <div className="flex items-start gap-4">
        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-orange/10 font-bold font-bricolage text-brand-orange text-sm">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bricolage font-semibold text-brand-navy text-xl">{title}</h2>
          <div className="mt-3 space-y-3">
            {content.map((paragraph, i) => (
              <p key={i} className="font-manrope text-base text-text-main/85 leading-relaxed">
                {paragraph}
              </p>
            ))}
            {extra}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  const updatedDate = "11 Mei 2026";

  return (
    <div className="flex w-full flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-orange/5 via-amber-50/40 to-bg-light px-6 py-20 sm:px-10 lg:px-20 lg:py-24">
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-brand-navy/5 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-brand-orange/10 blur-[80px]" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-navy/10">
              <svg
                className="h-4 w-4 text-brand-navy"
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
            </div>
            <span className="font-manrope font-medium text-brand-navy/40 text-xs uppercase tracking-widest">Legal</span>
          </div>
          <h1 className="font-bold font-bricolage text-4xl text-brand-navy sm:text-5xl lg:text-6xl">
            Kebijakan Privasi
          </h1>
          <p className="mx-auto mt-4 max-w-2xl font-manrope text-base text-text-muted-custom sm:text-lg">
            Terakhir diperbarui: <span className="font-semibold text-brand-navy">{updatedDate}</span>
          </p>
          <p className="mt-2 font-manrope text-sm text-text-muted-custom/60">
            {sections.length} bagian — estimasi baca 3 menit
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="bg-bg-light px-6 py-16 sm:px-10 lg:px-20">
        <div className="mx-auto max-w-3xl">
          {/* Intro */}
          <div className="mb-12 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
            <p className="font-manrope text-base text-text-main/85 leading-relaxed">
              Di MULAI+, kami menghargai privasi Anda. Kebijakan ini menjelaskan bagaimana kami mengumpulkan,
              menggunakan, dan melindungi informasi pribadi Anda saat menggunakan platform kami. Dengan menggunakan
              layanan MULAI+, Anda menyetujui praktik yang dijelaskan dalam kebijakan ini.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-12">
            {sections.map((section, index) => (
              <PrivacySection
                key={section.id}
                title={section.title}
                content={section.content}
                extra={section.extra}
                index={index}
              />
            ))}
          </div>

          {/* Outro */}
          <div className="mt-16 rounded-2xl border border-brand-navy/10 bg-brand-navy/5 p-6 text-center sm:p-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy/10">
              <svg
                className="h-6 w-6 text-brand-navy"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <h3 className="font-bricolage font-semibold text-brand-navy text-lg">Ada pertanyaan?</h3>
            <p className="mt-2 font-manrope text-sm text-text-muted-custom">
              Hubungi tim kami kapan saja — kami siap membantu.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
