/**
 * Bank item untuk template & seeder: DISCOVER (minat, 120 aitem) dan TALENT (bakat, 120 soal).
 *
 * Satu sumber kebenaran: dipakai oleh
 *  - apps/web/scripts/export-assessment-templates.mts  (CSV + XLSX)
 *  - packages/db/scripts/seed-talent-bank.ts            (isi versi draf TALENT)
 *  - packages/db/scripts/seed-discover-riasec.ts        (item DISCOVER diimpor dari sini)
 *
 * Format baris mengikuti kontrak kolom impor di editor admin (Import Soal).
 */
import { ITEMS as DISCOVER_RAW } from "./seed-discover-riasec";

export type TemplateType = "pilihan" | "isian" | "skala";

export interface TemplateRow {
  teks: string;
  dimensi: string;
  tipe: TemplateType;
  /** isi opsi (A..F). Untuk `skala`: label tingkat (dipakai sebagai caption). */
  opsi?: string[];
  /** huruf kunci utk pilihan ganda (A..F) */
  kunci?: string;
  bobot?: number;
  /** kunci jawaban utk tipe `isian` */
  kunciIsian?: string;
  /** persis | angka | kata | pola */
  caraNilai?: string;
  toleransi?: string;
  /** standar | emoji | gambar | banding */
  tampilan?: string;
}

/** Urutan kolom = urutan yang dibaca fitur "Import Soal" di editor. */
export const TEMPLATE_COLUMNS = [
  "Teks",
  "Dimensi",
  "Tipe",
  "Opsi A",
  "Opsi B",
  "Opsi C",
  "Opsi D",
  "Opsi E",
  "Opsi F",
  "Kunci",
  "Bobot",
  "Kunci Isian",
  "Cara nilai",
  "Toleransi",
  "Tampilan",
] as const;

export function rowToCells(r: TemplateRow): (string | number)[] {
  const o = r.opsi ?? [];
  return [
    r.teks,
    r.dimensi,
    r.tipe,
    o[0] ?? "",
    o[1] ?? "",
    o[2] ?? "",
    o[3] ?? "",
    o[4] ?? "",
    o[5] ?? "",
    r.kunci ?? "",
    r.bobot ?? 1,
    r.kunciIsian ?? "",
    r.caraNilai ?? "",
    r.toleransi ?? "",
    r.tampilan ?? "standar",
  ];
}

/* ══════════════════════════ KONFIGURASI ══════════════════════════ */

export interface ConfigRow {
  key: string;
  value: string | number | boolean;
  catatan: string;
}

export const DISCOVER_CONFIG: ConfigRow[] = [
  { key: "total_dim", value: 6, catatan: "R, I, A, S, E, C" },
  { key: "result_dim_count", value: 3, catatan: "tampilkan 3 kode minat teratas (mis. S-I-A)" },
  { key: "min_q_per_dim", value: 4, catatan: "syarat minimal soal per dimensi saat rilis" },
  { key: "scoring_method", value: "sum", catatan: "sum | average | weighted" },
  { key: "scoring_mode", value: "free_text", catatan: "free_text (skor manual/opsi) | likert (poin linier)" },
  { key: "randomize_q", value: false, catatan: "WAJIB false kalau pakai Pembagian bagian = Per dimensi" },
  { key: "randomize_a", value: false, catatan: "WAJIB false untuk soal skala (urutan opsinya bermakna)" },
  { key: "allow_pause", value: false, catatan: "minat: tanpa jeda (test mengalir)" },
  { key: "section_mode", value: "none", catatan: "minat: tanpa bagian/instruksi per dimensi" },
  { key: "timer_enabled", value: false, catatan: "true bila ingin membatasi waktu" },
  { key: "timer_scope", value: "none", catatan: "none | dimension (durasi per dimensi) | question (detik per soal)" },
  { key: "time_per_question", value: 60, catatan: "dipakai hanya bila timer_scope = question" },
  { key: "lang", value: "id", catatan: "id | en" },
];

export const TALENT_CONFIG: ConfigRow[] = [
  {
    key: "total_dim",
    value: 5,
    catatan: "verbal, numerical, logical, spatial, clerical (kode HARUS sama — dipakai Pola Jurusan)",
  },
  { key: "result_dim_count", value: 3, catatan: "3 kemampuan terkuat" },
  { key: "min_q_per_dim", value: 4, catatan: "syarat minimal soal per dimensi saat rilis" },
  { key: "scoring_method", value: "sum", catatan: "sum | average | weighted" },
  { key: "scoring_mode", value: "free_text", catatan: "free_text | likert" },
  { key: "randomize_q", value: false, catatan: "WAJIB false kalau pakai Pembagian bagian = Per dimensi" },
  { key: "randomize_a", value: false, catatan: "false dianjurkan (ada soal skala & opsi berurutan)" },
  { key: "allow_pause", value: true, catatan: "siswa boleh berhenti & melanjutkan" },
  { key: "section_mode", value: "by_dimension", catatan: "none | by_dimension | chunk:10 | chunk:20" },
  { key: "timer_enabled", value: true, catatan: "bakat: timer AKTIF (10 menit per bagian)" },
  { key: "timer_scope", value: "dimension", catatan: "scope default; tiap dimensi bisa override" },
  { key: "time_per_question", value: 25, catatan: "fallback bila dimensi memakai scope per soal" },
  { key: "lang", value: "id", catatan: "id | en" },
];

/** Dimensi yang diharapkan ada di versi (impor akan membuat otomatis kalau belum ada). */
export const DISCOVER_DIMS = ["Realistic", "Investigative", "Artistic", "Social", "Enterprising", "Conventional"];
export const TALENT_DIMS = ["verbal", "numerical", "logical", "spatial", "clerical"];

/* ══════════════════════════ DISCOVER (120) ══════════════════════════ */
// 6 dimensi × 20 aitem, skala emoji 😡🙁😐🙂😍 (caption dikirim sebagai opsi A–E).

const CAPTIONS = ["Sangat tidak suka", "Tidak suka", "Netral", "Suka", "Sangat suka"];

export const DISCOVER_ITEMS: TemplateRow[] = Object.entries(DISCOVER_RAW).flatMap(([dimCode, items]) =>
  items.map(([, text]) => ({
    teks: text,
    dimensi: dimCode,
    tipe: "skala" as const,
    opsi: CAPTIONS,
    tampilan: "emoji",
  })),
);

/* ══════════════════════════ TALENT (120) ══════════════════════════ */
// 5 dimensi × 24 soal. Tiap dimensi: 12 pilihan ganda + 4 skala + 8 isian
// (eksak, angka+toleransi, kata kunci, pola) — memakai semua mode jawaban & tampilan.

export const TALENT_ITEMS: TemplateRow[] = [
  /* ─────────── VERBAL (Penalaran Verbal) ─────────── */
  {
    teks: "Sinonim dari ABSURD adalah …",
    dimensi: "verbal",
    tipe: "pilihan",
    opsi: ["Masuk akal", "Tidak masuk akal", "Menarik", "Sederhana"],
    kunci: "B",
  },
  {
    teks: "Antonim dari GERSANG adalah …",
    dimensi: "verbal",
    tipe: "pilihan",
    opsi: ["Tandus", "Subur", "Kering", "Panas"],
    kunci: "B",
  },
  {
    teks: "DOKTER : PASIEN = GURU : …",
    dimensi: "verbal",
    tipe: "pilihan",
    opsi: ["Murid", "Sekolah", "Buku", "Papan tulis"],
    kunci: "A",
  },
  {
    teks: "PENSIL : MENULIS = PISAU : …",
    dimensi: "verbal",
    tipe: "pilihan",
    opsi: ["Memotong", "Tajam", "Dapur", "Besi"],
    kunci: "A",
  },
  {
    teks: "Manakah kata yang TIDAK sekelompok dengan lainnya?",
    dimensi: "verbal",
    tipe: "pilihan",
    opsi: ["Mawar", "Melati", "Anggrek", "Bambu"],
    kunci: "D",
  },
  {
    teks: "Ungkapan 'kambing hitam' berarti …",
    dimensi: "verbal",
    tipe: "pilihan",
    opsi: ["Orang yang disalahkan", "Orang pemberani", "Orang kaya", "Orang malas"],
    kunci: "A",
  },
  {
    teks: "Sinonim dari DERIVASI adalah …",
    dimensi: "verbal",
    tipe: "pilihan",
    opsi: ["Penurunan", "Peningkatan", "Pemisahan", "Penggabungan"],
    kunci: "A",
  },
  {
    teks: "Antonim dari kata PROLETAR adalah …",
    dimensi: "verbal",
    tipe: "pilihan",
    opsi: ["Buruh", "Borjuis", "Petani", "Rakyat"],
    kunci: "B",
  },
  {
    teks: "AIR : HAUS = MAKANAN : …",
    dimensi: "verbal",
    tipe: "pilihan",
    opsi: ["Lapar", "Kenyang", "Nasi", "Perut"],
    kunci: "A",
  },
  {
    teks: "Penulisan kata baku yang benar adalah …",
    dimensi: "verbal",
    tipe: "pilihan",
    opsi: ["Aktivitas", "Aktifitas", "Aktipitas", "Aktiviti"],
    kunci: "A",
  },
  {
    teks: "Kalimat yang paling efektif adalah …",
    dimensi: "verbal",
    tipe: "pilihan",
    opsi: [
      "Para siswa-siswa berkumpul di lapangan.",
      "Para siswa berkumpul di lapangan.",
      "Para pada siswa berkumpul di lapangan.",
      "Siswa-siswa para berkumpul di lapangan.",
    ],
    kunci: "B",
  },
  {
    teks: "Kata yang bermakna 'sangat penting sehingga harus ada' adalah …",
    dimensi: "verbal",
    tipe: "pilihan",
    opsi: ["Esensial", "Opsional", "Insidental", "Marjinal"],
    kunci: "A",
    tampilan: "banding",
  },
  {
    teks: "Tulis antonim dari kata OPTIMIS.",
    dimensi: "verbal",
    tipe: "isian",
    kunciIsian: "pesimis",
    caraNilai: "persis",
  },
  {
    teks: "Tulis sinonim dari kata KONTEMPORER.",
    dimensi: "verbal",
    tipe: "isian",
    kunciIsian: "modern",
    caraNilai: "persis",
  },
  {
    teks: "Berapa jumlah kata pada kalimat: 'Anak itu membaca buku cerita di perpustakaan sekolah'?",
    dimensi: "verbal",
    tipe: "isian",
    kunciIsian: "8",
    caraNilai: "persis",
  },
  {
    teks: "Berapa banyak huruf vokal pada kata PENDIDIKAN?",
    dimensi: "verbal",
    tipe: "isian",
    kunciIsian: "4",
    caraNilai: "persis",
  },
  {
    teks: "Sebutkan satu kata yang bermakna 'tidak peduli'.",
    dimensi: "verbal",
    tipe: "isian",
    kunciIsian: "acuh|cuek|masa bodoh",
    caraNilai: "kata",
  },
  {
    teks: "Tulis satu kata hubung yang menyatakan perlawanan (mis. meskipun).",
    dimensi: "verbal",
    tipe: "isian",
    kunciIsian: "walaupun|meskipun|namun|tetapi",
    caraNilai: "kata",
  },
  {
    teks: "Tulis satu kata berawalan 'me-' yang minimal 5 huruf.",
    dimensi: "verbal",
    tipe: "isian",
    kunciIsian: "^me[a-z]{3,}$",
    caraNilai: "pola",
  },
  {
    teks: "Tulis satu kata yang diakhiri dengan 'kan'.",
    dimensi: "verbal",
    tipe: "isian",
    kunciIsian: "^[a-z]+kan$",
    caraNilai: "pola",
  },
  {
    teks: "Saya senang membaca artikel atau buku yang panjang.",
    dimensi: "verbal",
    tipe: "skala",
    opsi: CAPTIONS,
    tampilan: "emoji",
  },
  {
    teks: "Saya cepat memahami makna kata yang belum pernah saya dengar.",
    dimensi: "verbal",
    tipe: "skala",
    opsi: CAPTIONS,
    tampilan: "emoji",
  },
  {
    teks: "Saya nyaman menjelaskan gagasan saya dengan kata-kata.",
    dimensi: "verbal",
    tipe: "skala",
    opsi: CAPTIONS,
    tampilan: "emoji",
  },
  {
    teks: "Saya suka bermain teka-teki kata atau silang kata.",
    dimensi: "verbal",
    tipe: "skala",
    opsi: CAPTIONS,
    tampilan: "emoji",
  },

  /* ─────────── NUMERICAL (Kemampuan Numerik) ─────────── */
  { teks: "24 × 5 ÷ 8 = …", dimensi: "numerical", tipe: "pilihan", opsi: ["12", "15", "18", "20"], kunci: "B" },
  {
    teks: "Lanjutkan deret: 2, 6, 12, 20, 30, …",
    dimensi: "numerical",
    tipe: "pilihan",
    opsi: ["36", "40", "42", "44"],
    kunci: "C",
  },
  { teks: "Jika 3x = 21, maka x = …", dimensi: "numerical", tipe: "pilihan", opsi: ["6", "7", "8", "9"], kunci: "B" },
  { teks: "15% dari 240 adalah …", dimensi: "numerical", tipe: "pilihan", opsi: ["30", "36", "40", "48"], kunci: "B" },
  { teks: "1/4 + 1/3 = …", dimensi: "numerical", tipe: "pilihan", opsi: ["2/7", "5/12", "7/12", "1/2"], kunci: "C" },
  {
    teks: "Perbandingan dua bilangan 3 : 5 dan jumlahnya 64. Bilangan terkecil adalah …",
    dimensi: "numerical",
    tipe: "pilihan",
    opsi: ["20", "24", "28", "32"],
    kunci: "B",
  },
  {
    teks: "Harga barang Rp50.000 naik 20%. Harga barunya …",
    dimensi: "numerical",
    tipe: "pilihan",
    opsi: ["Rp55.000", "Rp58.000", "Rp60.000", "Rp62.000"],
    kunci: "C",
  },
  {
    teks: "Rata-rata 5 bilangan adalah 12. Jumlah kelima bilangan itu …",
    dimensi: "numerical",
    tipe: "pilihan",
    opsi: ["55", "58", "60", "65"],
    kunci: "C",
  },
  {
    teks: "Lanjutkan deret: 1, 1, 2, 3, 5, 8, …",
    dimensi: "numerical",
    tipe: "pilihan",
    opsi: ["11", "12", "13", "14"],
    kunci: "C",
  },
  {
    teks: "5 pekerja menyelesaikan pekerjaan dalam 10 hari. Jika 10 pekerja, waktu yang diperlukan …",
    dimensi: "numerical",
    tipe: "pilihan",
    opsi: ["4 hari", "5 hari", "6 hari", "8 hari"],
    kunci: "B",
  },
  { teks: "0,25 × 80 = …", dimensi: "numerical", tipe: "pilihan", opsi: ["16", "18", "20", "24"], kunci: "C" },
  {
    teks: "Akar kuadrat dari 169 adalah …",
    dimensi: "numerical",
    tipe: "pilihan",
    opsi: ["11", "12", "13", "14"],
    kunci: "C",
    tampilan: "banding",
  },
  { teks: "Hitung 7 × 8 − 6 = …", dimensi: "numerical", tipe: "isian", kunciIsian: "50", caraNilai: "persis" },
  {
    teks: "Jika 2/5 dari sebuah angka adalah 18, berapa angka itu?",
    dimensi: "numerical",
    tipe: "isian",
    kunciIsian: "45",
    caraNilai: "persis",
  },
  { teks: "Berapa persen 45 dari 180?", dimensi: "numerical", tipe: "isian", kunciIsian: "25", caraNilai: "persis" },
  {
    teks: "Deret 3, 9, 27, … Berapa suku ke-5?",
    dimensi: "numerical",
    tipe: "isian",
    kunciIsian: "243",
    caraNilai: "persis",
  },
  {
    teks: "Hitung 3/4 + 0,5 (tulis dalam desimal).",
    dimensi: "numerical",
    tipe: "isian",
    kunciIsian: "1.25",
    caraNilai: "angka",
    toleransi: "0.01",
  },
  {
    teks: "Sebuah barang Rp80.000 didiskon 12,5%. Berapa harga setelah diskon (dalam rupiah)?",
    dimensi: "numerical",
    tipe: "isian",
    kunciIsian: "70000",
    caraNilai: "angka",
    toleransi: "1",
  },
  {
    teks: "Tulis hasil 12 × 12 (3 digit).",
    dimensi: "numerical",
    tipe: "isian",
    kunciIsian: "^144$",
    caraNilai: "pola",
  },
  {
    teks: "Tulis satu bilangan kelipatan 7 antara 20 dan 30.",
    dimensi: "numerical",
    tipe: "isian",
    kunciIsian: "^21$|^28$",
    caraNilai: "pola",
  },
  {
    teks: "Saya senang bekerja dengan angka dan hitungan.",
    dimensi: "numerical",
    tipe: "skala",
    opsi: CAPTIONS,
    tampilan: "emoji",
  },
  {
    teks: "Saya cepat dalam operasi hitung dasar (kali, bagi, persen).",
    dimensi: "numerical",
    tipe: "skala",
    opsi: CAPTIONS,
    tampilan: "emoji",
  },
  {
    teks: "Saya suka menyelesaikan soal cerita matematika.",
    dimensi: "numerical",
    tipe: "skala",
    opsi: CAPTIONS,
    tampilan: "emoji",
  },
  {
    teks: "Saya nyaman membaca tabel atau grafik berisi angka.",
    dimensi: "numerical",
    tipe: "skala",
    opsi: CAPTIONS,
    tampilan: "emoji",
  },

  /* ─────────── LOGICAL (Penalaran Logis) ─────────── */
  {
    teks: "Semua A adalah B. Sebagian B adalah C. Kesimpulan yang tepat …",
    dimensi: "logical",
    tipe: "pilihan",
    opsi: ["Semua A adalah C", "Sebagian A mungkin C", "Semua C adalah A", "Tidak ada A yang C"],
    kunci: "B",
  },
  {
    teks: "Lanjutkan deret huruf: A, C, E, G, …",
    dimensi: "logical",
    tipe: "pilihan",
    opsi: ["H", "I", "J", "K"],
    kunci: "B",
  },
  {
    teks: "Jika hujan maka jalan basah. Ternyata jalan tidak basah. Maka …",
    dimensi: "logical",
    tipe: "pilihan",
    opsi: ["Hujan turun", "Tidak hujan", "Jalan kering karena angin", "Tidak dapat disimpulkan"],
    kunci: "B",
  },
  {
    teks: "Andi lebih tinggi dari Budi. Budi lebih tinggi dari Cici. Yang paling tinggi …",
    dimensi: "logical",
    tipe: "pilihan",
    opsi: ["Andi", "Budi", "Cici", "Sama tinggi"],
    kunci: "A",
  },
  {
    teks: "Lanjutkan deret: 1, 4, 9, 16, …",
    dimensi: "logical",
    tipe: "pilihan",
    opsi: ["20", "24", "25", "30"],
    kunci: "C",
  },
  {
    teks: "Semua siswa wajib mengikuti ujian. Dita adalah siswa. Maka …",
    dimensi: "logical",
    tipe: "pilihan",
    opsi: ["Dita wajib mengikuti ujian", "Dita boleh tidak ikut", "Dita belum tentu ikut", "Dita pengawas ujian"],
    kunci: "A",
  },
  {
    teks: "Lanjutkan deret: 100, 50, 25, …",
    dimensi: "logical",
    tipe: "pilihan",
    opsi: ["10", "12,5", "15", "20"],
    kunci: "B",
  },
  {
    teks: "Jika P maka Q. Ternyata Q salah. Maka …",
    dimensi: "logical",
    tipe: "pilihan",
    opsi: ["P benar", "P salah", "P dan Q benar", "Tidak dapat disimpulkan"],
    kunci: "B",
  },
  {
    teks: "Lanjutkan deret bilangan prima: 2, 3, 5, 7, 11, …",
    dimensi: "logical",
    tipe: "pilihan",
    opsi: ["12", "13", "14", "15"],
    kunci: "B",
  },
  {
    teks: "KIRI : KANAN = ATAS : …",
    dimensi: "logical",
    tipe: "pilihan",
    opsi: ["Bawah", "Depan", "Samping", "Tengah"],
    kunci: "A",
  },
  {
    teks: "A lebih tua dari B, B lebih tua dari C. Siapa yang paling muda?",
    dimensi: "logical",
    tipe: "pilihan",
    opsi: ["A", "B", "C", "Tidak dapat ditentukan"],
    kunci: "C",
  },
  {
    teks: "Jika hari ini Senin, maka 3 hari setelah lusa adalah …",
    dimensi: "logical",
    tipe: "pilihan",
    opsi: ["Kamis", "Jumat", "Sabtu", "Minggu"],
    kunci: "A",
    tampilan: "banding",
  },
  {
    teks: "Deret 2, 6, 18, 54, … Berapa suku berikutnya?",
    dimensi: "logical",
    tipe: "isian",
    kunciIsian: "162",
    caraNilai: "persis",
  },
  {
    teks: "Jika 1+4=5, 2+5=12, 3+6=21, maka 4+7=… (pola a+b = a×b+a)",
    dimensi: "logical",
    tipe: "isian",
    kunciIsian: "32",
    caraNilai: "persis",
  },
  {
    teks: "Berapa banyak susunan 3 huruf berbeda dari {A, B, C}?",
    dimensi: "logical",
    tipe: "isian",
    kunciIsian: "6",
    caraNilai: "persis",
  },
  {
    teks: "Jika hari ini Rabu, 10 hari lagi hari apa? (1=Senin … 7=Minggu)",
    dimensi: "logical",
    tipe: "isian",
    kunciIsian: "6",
    caraNilai: "persis",
  },
  {
    teks: "Lanjutkan deret huruf: B, D, F, H, … (tulis satu huruf)",
    dimensi: "logical",
    tipe: "isian",
    kunciIsian: "J",
    caraNilai: "persis",
  },
  {
    teks: "A lebih tua dari B, B lebih tua dari C. Siapa paling tua? (tulis hurufnya)",
    dimensi: "logical",
    tipe: "isian",
    kunciIsian: "A",
    caraNilai: "persis",
  },
  {
    teks: "Tulis 'benar' bila valid: Semua kucing adalah hewan. Tom adalah kucing. Maka Tom adalah hewan.",
    dimensi: "logical",
    tipe: "isian",
    kunciIsian: "benar",
    caraNilai: "persis",
  },
  {
    teks: "Tulis satu kata penghubung sebab-akibat (mis. karena).",
    dimensi: "logical",
    tipe: "isian",
    kunciIsian: "karena|sebab|akibat",
    caraNilai: "kata",
  },
  {
    teks: "Saya suka memecahkan teka-teki logika.",
    dimensi: "logical",
    tipe: "skala",
    opsi: CAPTIONS,
    tampilan: "emoji",
  },
  {
    teks: "Saya cepat menemukan pola pada deret atau data.",
    dimensi: "logical",
    tipe: "skala",
    opsi: CAPTIONS,
    tampilan: "emoji",
  },
  {
    teks: "Saya senang menyusun argumen yang runtut.",
    dimensi: "logical",
    tipe: "skala",
    opsi: CAPTIONS,
    tampilan: "emoji",
  },
  {
    teks: "Saya suka menganalisis sebab dan akibat suatu kejadian.",
    dimensi: "logical",
    tipe: "skala",
    opsi: CAPTIONS,
    tampilan: "emoji",
  },

  /* ─────────── SPATIAL (Penalaran Spasial) ─────────── */
  {
    teks: "Jika kubus dibuka menjadi jaring-jaring, berapa banyak persegi yang terbentuk?",
    dimensi: "spatial",
    tipe: "pilihan",
    opsi: ["4", "5", "6", "8"],
    kunci: "C",
  },
  {
    teks: "Huruf 'b' diputar 180° akan tampak seperti huruf …",
    dimensi: "spatial",
    tipe: "pilihan",
    opsi: ["d", "p", "q", "b"],
    kunci: "C",
  },
  {
    teks: "Kamu menghadap utara lalu berbalik 90° ke kanan. Sekarang menghadap …",
    dimensi: "spatial",
    tipe: "pilihan",
    opsi: ["Timur", "Barat", "Selatan", "Utara"],
    kunci: "A",
  },
  {
    teks: "Berapa banyak sisi pada limas segi empat?",
    dimensi: "spatial",
    tipe: "pilihan",
    opsi: ["4", "5", "6", "8"],
    kunci: "B",
  },
  {
    teks: "Kertas dilipat dua kali lalu dilubangi sekali di tengah. Saat dibuka, ada berapa lubang?",
    dimensi: "spatial",
    tipe: "pilihan",
    opsi: ["1", "2", "4", "8"],
    kunci: "C",
  },
  {
    teks: "Huruf yang tampak sama saat dicerminkan pada cermin datar adalah …",
    dimensi: "spatial",
    tipe: "pilihan",
    opsi: ["A", "B", "C", "F"],
    kunci: "A",
  },
  {
    teks: "Kubus 2×2×2 terdiri dari berapa kubus kecil?",
    dimensi: "spatial",
    tipe: "pilihan",
    opsi: ["4", "6", "8", "12"],
    kunci: "C",
  },
  {
    teks: "Dari titik A berjalan 3 langkah ke utara lalu 4 langkah ke timur. Jarak lurus dari A …",
    dimensi: "spatial",
    tipe: "pilihan",
    opsi: ["4", "5", "6", "7"],
    kunci: "B",
  },
  {
    teks: "Berapa jumlah rusuk pada balok?",
    dimensi: "spatial",
    tipe: "pilihan",
    opsi: ["6", "8", "12", "16"],
    kunci: "C",
  },
  {
    teks: "Sudut terkecil antara jarum jam dan menit pada pukul 15.00 adalah …",
    dimensi: "spatial",
    tipe: "pilihan",
    opsi: ["30°", "60°", "90°", "120°"],
    kunci: "C",
  },
  {
    teks: "Kamu menghadap barat lalu berbalik 180°. Sekarang menghadap …",
    dimensi: "spatial",
    tipe: "pilihan",
    opsi: ["Timur", "Utara", "Selatan", "Barat"],
    kunci: "A",
  },
  {
    teks: "Berapa jumlah titik sudut pada kubus?",
    dimensi: "spatial",
    tipe: "pilihan",
    opsi: ["6", "8", "10", "12"],
    kunci: "B",
    tampilan: "banding",
  },
  {
    teks: "Berapa banyak rusuk pada prisma segitiga?",
    dimensi: "spatial",
    tipe: "isian",
    kunciIsian: "9",
    caraNilai: "persis",
  },
  {
    teks: "Berapa derajat sudut terkecil jarum jam pada pukul 03.00?",
    dimensi: "spatial",
    tipe: "isian",
    kunciIsian: "90",
    caraNilai: "persis",
  },
  {
    teks: "Kubus dengan panjang sisi 3 cm memiliki volume berapa cm³?",
    dimensi: "spatial",
    tipe: "isian",
    kunciIsian: "27",
    caraNilai: "persis",
  },
  {
    teks: "Berapa banyak diagonal sisi pada persegi panjang?",
    dimensi: "spatial",
    tipe: "isian",
    kunciIsian: "2",
    caraNilai: "persis",
  },
  {
    teks: "Huruf apa yang terbentuk bila 'p' diputar 180 derajat?",
    dimensi: "spatial",
    tipe: "isian",
    kunciIsian: "d",
    caraNilai: "persis",
  },
  {
    teks: "Menghadap utara lalu berputar 90° searah jarum jam, kini menghadap?",
    dimensi: "spatial",
    tipe: "isian",
    kunciIsian: "timur",
    caraNilai: "persis",
  },
  {
    teks: "Tulis jumlah sisi pada limas segi enam.",
    dimensi: "spatial",
    tipe: "isian",
    kunciIsian: "^7$",
    caraNilai: "pola",
  },
  {
    teks: "Tulis satu bangun ruang yang memiliki 6 sisi berbentuk persegi.",
    dimensi: "spatial",
    tipe: "isian",
    kunciIsian: "kubus|kubik",
    caraNilai: "kata",
  },
  {
    teks: "Saya mudah membayangkan bentuk benda dalam tiga dimensi.",
    dimensi: "spatial",
    tipe: "skala",
    opsi: CAPTIONS,
    tampilan: "emoji",
  },
  {
    teks: "Saya suka menggambar denah atau sketsa ruang.",
    dimensi: "spatial",
    tipe: "skala",
    opsi: CAPTIONS,
    tampilan: "emoji",
  },
  {
    teks: "Saya cepat memahami peta dan arah mata angin.",
    dimensi: "spatial",
    tipe: "skala",
    opsi: CAPTIONS,
    tampilan: "emoji",
  },
  {
    teks: "Saya senang merakit atau menyusun benda.",
    dimensi: "spatial",
    tipe: "skala",
    opsi: CAPTIONS,
    tampilan: "emoji",
  },

  /* ─────────── CLERICAL (Kecepatan Perseptual) ─────────── */
  {
    teks: "Manakah pasangan angka yang SAMA?",
    dimensi: "clerical",
    tipe: "pilihan",
    opsi: ["8291 – 8291", "4712 – 4721", "9063 – 9036", "5580 – 5508"],
    kunci: "A",
  },
  {
    teks: "Manakah pasangan kode yang SAMA?",
    dimensi: "clerical",
    tipe: "pilihan",
    opsi: ["KLM-092", "KLM-029", "KLM-902", "KLM-290"],
    kunci: "A",
  },
  {
    teks: "Dari deret 3412, 3421, 3412, 3412 — manakah yang berbeda?",
    dimensi: "clerical",
    tipe: "pilihan",
    opsi: ["Yang pertama", "Yang kedua", "Yang ketiga", "Yang keempat"],
    kunci: "B",
  },
  {
    teks: "Manakah yang BUKAN bilangan genap?",
    dimensi: "clerical",
    tipe: "pilihan",
    opsi: ["14", "27", "32", "48"],
    kunci: "B",
  },
  {
    teks: "Jika A=1, B=2, C=3, maka E = …",
    dimensi: "clerical",
    tipe: "pilihan",
    opsi: ["4", "5", "6", "7"],
    kunci: "B",
  },
  {
    teks: "Berapa banyak angka 7 pada deret: 7, 17, 27, 37, 47?",
    dimensi: "clerical",
    tipe: "pilihan",
    opsi: ["3", "4", "5", "6"],
    kunci: "C",
  },
  {
    teks: "Manakah bilangan yang paling kecil?",
    dimensi: "clerical",
    tipe: "pilihan",
    opsi: ["1.021", "1.012", "1.201", "1.120"],
    kunci: "B",
  },
  {
    teks: "Manakah tanggal yang SAMA?",
    dimensi: "clerical",
    tipe: "pilihan",
    opsi: ["12/08/2026 – 12/08/2026", "12/08/2026 – 21/08/2026", "12/08/2026 – 12/08/2062", "12/08/2026 – 12/18/2026"],
    kunci: "A",
  },
  {
    teks: "Pada kata 'KATA', berapa jumlah huruf 'a'?",
    dimensi: "clerical",
    tipe: "pilihan",
    opsi: ["1", "2", "3", "4"],
    kunci: "B",
  },
  {
    teks: "Pada kata 'MaKaN', berapa jumlah huruf kapital?",
    dimensi: "clerical",
    tipe: "pilihan",
    opsi: ["1", "2", "3", "4"],
    kunci: "C",
  },
  {
    teks: "Manakah yang berbeda tanda?",
    dimensi: "clerical",
    tipe: "pilihan",
    opsi: ["808", "880", "808", "808"],
    kunci: "B",
  },
  {
    teks: "Manakah urutan abjad yang benar?",
    dimensi: "clerical",
    tipe: "pilihan",
    opsi: ["B, D, A, C", "D, C, B, A", "A, B, C, D", "C, A, D, B"],
    kunci: "C",
    tampilan: "banding",
  },
  {
    teks: "Tulis ulang kode ini tanpa spasi: 'MX 4471'",
    dimensi: "clerical",
    tipe: "isian",
    kunciIsian: "MX4471",
    caraNilai: "persis",
  },
  {
    teks: "Berapa jumlah huruf 'i' pada kata INISIATIF?",
    dimensi: "clerical",
    tipe: "isian",
    kunciIsian: "4",
    caraNilai: "persis",
  },
  {
    teks: "Berapa jumlah angka pada bilangan 1.234.567 (tanpa titik)?",
    dimensi: "clerical",
    tipe: "isian",
    kunciIsian: "7",
    caraNilai: "persis",
  },
  {
    teks: "Berapa banyak angka ganjil dari: 3, 8, 11, 14, 17, 20?",
    dimensi: "clerical",
    tipe: "isian",
    kunciIsian: "3",
    caraNilai: "persis",
  },
  {
    teks: "Berapa karakter pada 'A1-B2-C3' (termasuk tanda hubung)?",
    dimensi: "clerical",
    tipe: "isian",
    kunciIsian: "8",
    caraNilai: "persis",
  },
  {
    teks: "Tulis 4 digit kode pos berawalan 60.",
    dimensi: "clerical",
    tipe: "isian",
    kunciIsian: "^60\\d{2}$",
    caraNilai: "pola",
  },
  {
    teks: "Tulis bilangan 3 digit yang sama dibaca dari kiri dan kanan (mis. 121).",
    dimensi: "clerical",
    tipe: "isian",
    kunciIsian: "^([0-9])\\1\\1$",
    caraNilai: "pola",
  },
  {
    teks: "Sebutkan satu warna yang diawali huruf 'm'.",
    dimensi: "clerical",
    tipe: "isian",
    kunciIsian: "merah|maroon|magenta",
    caraNilai: "kata",
  },
  {
    teks: "Saya teliti dalam memeriksa detail pekerjaan.",
    dimensi: "clerical",
    tipe: "skala",
    opsi: CAPTIONS,
    tampilan: "emoji",
  },
  {
    teks: "Saya cepat menemukan salah ketik atau angka yang berbeda.",
    dimensi: "clerical",
    tipe: "skala",
    opsi: CAPTIONS,
    tampilan: "emoji",
  },
  {
    teks: "Saya suka pekerjaan yang rapi, teratur, dan berulang.",
    dimensi: "clerical",
    tipe: "skala",
    opsi: CAPTIONS,
    tampilan: "emoji",
  },
  {
    teks: "Saya cepat membandingkan dua daftar data.",
    dimensi: "clerical",
    tipe: "skala",
    opsi: CAPTIONS,
    tampilan: "emoji",
  },
];
