import dotenv from "dotenv";
import { db } from "../src";
import { tmbCareerMappings, tmbMajorPatterns, tmbQuestionBank, tmbTestCatalog } from "../src/schema/tmb";

dotenv.config({ path: "../../apps/server/.env" });

const INTEREST_QUESTIONS = [
  // R-I
  {
    d: "R",
    p: "I",
    t: "Kamu lebih suka…",
    a: "Memperbaiki dan merakit mesin atau perangkat elektronik",
    b: "Menganalisis data dari eksperimen sains",
  },
  // I-A
  {
    d: "I",
    p: "A",
    t: "Kamu lebih suka…",
    a: "Meneliti sesuatu di laboratorium sampai menemukan jawabannya",
    b: "Membuat karya seni, desain, atau tulisan kreatif",
  },
  // A-S
  {
    d: "A",
    p: "S",
    t: "Kamu lebih suka…",
    a: "Mendesain poster, konten, atau karya visual",
    b: "Mengajar dan membantu orang lain belajar",
  },
  // S-E
  {
    d: "S",
    p: "E",
    t: "Kamu lebih suka…",
    a: "Menjadi relawan untuk kegiatan sosial",
    b: "Memimpin tim dan menyusun strategi penjualan",
  },
  // E-C
  {
    d: "E",
    p: "C",
    t: "Kamu lebih suka…",
    a: "Memulai bisnis atau proyek baru yang berisiko",
    b: "Mengelola data dan administrasi dengan rapi dan teratur",
  },
  // C-R
  {
    d: "C",
    p: "R",
    t: "Kamu lebih suka…",
    a: "Mengorganisir dokumen, jadwal, dan arsip",
    b: "Bekerja di lapangan atau proyek konstruksi",
  },
  // I-S
  {
    d: "I",
    p: "S",
    t: "Kamu lebih suka…",
    a: "Memecahkan masalah rumit secara mandiri",
    b: "Berdiskusi dan mendampingi teman yang kesulitan",
  },
  // R-E
  {
    d: "R",
    p: "E",
    t: "Kamu lebih suka…",
    a: "Bekerja dengan peralatan, tangan, atau mesin",
    b: "Menyusun rencana bisnis dan memimpin tim",
  },
  // A-C
  {
    d: "A",
    p: "C",
    t: "Kamu lebih suka…",
    a: "Menggambar, menulis, atau berkarya bebas tanpa aturan kaku",
    b: "Menyusun laporan yang terstruktur dan presisi",
  },
  // S-C
  {
    d: "S",
    p: "C",
    t: "Kamu lebih suka…",
    a: "Mendampingi orang yang sedang kesulitan",
    b: "Menjaga keakuratan data dan administrasi",
  },
];

const ABILITY_QUESTIONS = [
  { dim: "numerical", t: "Lanjutkan deret berikut: 2, 4, 8, 16, …", a: "20", b: "24", c: "32", d: "36", ans: "C" },
  {
    dim: "numerical",
    t: "Sebuah toko menjual 3 buku seharga Rp45.000. Berapa harga 7 buku dengan harga yang sama?",
    a: "Rp90.000",
    b: "Rp95.000",
    c: "Rp100.000",
    d: "Rp105.000",
    ans: "D",
  },
  {
    dim: "verbal",
    t: "Sinonim dari kata \u201ccermat\u201d adalah…",
    a: "Teliti",
    b: "Cepat",
    c: "Ragu",
    d: "Malas",
    ans: "A",
  },
  {
    dim: "verbal",
    t: "Lawan kata dari \u201crapi\u201d adalah…",
    a: "Bersih",
    b: "Teratur",
    c: "Ruang",
    d: "Berantakan",
    ans: "D",
  },
  {
    dim: "logical",
    t: "Semua mahasiswa rajin belajar. Budi adalah mahasiswa. Kesimpulan yang benar adalah…",
    a: "Budi rajin belajar",
    b: "Budi malas belajar",
    c: "Semua orang rajin belajar",
    d: "Budi bukan mahasiswa",
    ans: "A",
  },
  {
    dim: "logical",
    t: "Dina lebih tinggi dari Rini. Rini lebih tinggi dari Sari. Siapa yang paling pendek?",
    a: "Dina",
    b: "Rini",
    c: "Sari",
    d: "Tidak bisa ditentukan",
    ans: "C",
  },
  {
    dim: "spatial",
    t: "Bayangkan huruf \u201cb\u201d dicerminkan (dibalik dari kiri ke kanan). Huruf yang terlihat adalah…",
    a: "p",
    b: "d",
    c: "q",
    d: "b",
    ans: "B",
  },
  {
    dim: "spatial",
    t: "Pada jam 3:00 tepat, besar sudut antara jarum jam dan jarum menit adalah…",
    a: "45°",
    b: "60°",
    c: "90°",
    d: "120°",
    ans: "C",
  },
  {
    dim: "clerical",
    t: "Manakah yang TIDAK identik dengan \u201cAB12CD\u201d?",
    a: "AB12CD",
    b: "AB12CD",
    c: "AB12CD",
    d: "AB12DC",
    ans: "D",
  },
  {
    dim: "clerical",
    t: "Dari deret berikut, angka manakah yang berbeda? 3, 3, 3, 8, 3, 3",
    a: "3",
    b: "3",
    c: "8",
    d: "3",
    ans: "C",
  },
];

const MAJOR_PATTERNS = [
  [
    "kedokteran",
    "Kedokteran",
    "kedokteran|pendidikan dokter|dokter gigi",
    "I",
    "S",
    { numerical: 1, logical: 1, verbal: 0.5, spatial: 0, clerical: 0 },
  ],
  [
    "keperawatan",
    "Keperawatan",
    "keperawatan|nursing",
    "S",
    "I",
    { verbal: 1, logical: 0.5, numerical: 0.5, spatial: 0, clerical: 0 },
  ],
  ["kebidanan", "Kebidanan", "kebidanan|midwifery", "S", "R", { verbal: 1, numerical: 0.5, spatial: 0, clerical: 0 }],
  ["farmasi", "Farmasi", "farmasi|pharmacy", "I", "C", { numerical: 1, logical: 0.5, clerical: 0.5, verbal: 0 }],
  ["psikologi", "Psikologi", "psikologi|psychology", "S", "I", { verbal: 1, logical: 1, numerical: 0, spatial: 0 }],
  ["hukum", "Hukum", "hukum|law", "E", "I", { verbal: 1, logical: 1, numerical: 0, spatial: 0 }],
  [
    "teknik-informatika",
    "Teknik Informatika",
    "informatika|ilmu komputer|computer science|sistem informasi|software|perangkat lunak|data science|keamanan siber|cyber",
    "I",
    "R",
    { numerical: 1, logical: 1, verbal: 0, spatial: 0.5 },
  ],
  [
    "teknik-elektro",
    "Teknik Elektro",
    "elektro|electrical",
    "R",
    "I",
    { numerical: 1, logical: 1, spatial: 0.5, verbal: 0 },
  ],
  [
    "teknik-mesin",
    "Teknik Mesin",
    "mesin|mechanical",
    "R",
    "I",
    { numerical: 1, logical: 0.5, spatial: 0.5, verbal: 0 },
  ],
  [
    "teknik-sipil",
    "Teknik Sipil",
    "sipil|civil engineering",
    "R",
    "C",
    { numerical: 1, spatial: 0.5, logical: 0.5, verbal: 0 },
  ],
  [
    "teknik-industri",
    "Teknik Industri",
    "teknik industri|industrial",
    "E",
    "R",
    { numerical: 1, logical: 1, verbal: 0.5, spatial: 0 },
  ],
  [
    "arsitektur",
    "Arsitektur",
    "arsitektur|architecture",
    "A",
    "R",
    { spatial: 1, numerical: 0.5, logical: 0.5, verbal: 0 },
  ],
  ["akuntansi", "Akuntansi", "akuntansi|accounting", "C", "E", { numerical: 1, clerical: 1, logical: 0.5, verbal: 0 }],
  [
    "perbankan",
    "Perbankan & Keuangan",
    "perbankan|keuangan|finance",
    "C",
    "E",
    { numerical: 1, clerical: 0.5, logical: 0.5, verbal: 0 },
  ],
  ["perpajakan", "Perpajakan", "perpajakan|tax", "C", "E", { numerical: 1, clerical: 1, verbal: 0, logical: 0 }],
  [
    "manajemen",
    "Manajemen",
    "manajemen|management",
    "E",
    "S",
    { verbal: 0.5, numerical: 0.5, logical: 0.5, clerical: 0 },
  ],
  ["ekonomi", "Ekonomi", "ekonomi|economics", "E", "C", { numerical: 1, verbal: 0.5, logical: 0.5, clerical: 0 }],
  [
    "marketing",
    "Pemasaran",
    "pemasaran|marketing|bisnis digital",
    "E",
    "A",
    { verbal: 0.5, numerical: 0.5, logical: 0.5, spatial: 0 },
  ],
  [
    "komunikasi",
    "Ilmu Komunikasi",
    "komunikasi|broadcasting|jurnalistik|public relations",
    "E",
    "A",
    { verbal: 1, logical: 0.5, numerical: 0, spatial: 0 },
  ],
  [
    "desain",
    "Desain & Seni",
    "desain|visual|animasi|multimedia|seni|art|dkv",
    "A",
    "I",
    { spatial: 1, verbal: 0.5, numerical: 0, logical: 0 },
  ],
  [
    "sastra",
    "Sastra & Bahasa",
    "sastra|bahasa indonesia|bahasa inggris|linguistik",
    "A",
    "S",
    { verbal: 1, logical: 0.5, numerical: 0, spatial: 0 },
  ],
  [
    "keguruan",
    "Keguruan & Pendidikan",
    "pendidikan|keguruan|pgri|pgsd|pgpaud|bimbingan",
    "S",
    "A",
    { verbal: 1, logical: 0.5, numerical: 0.5, spatial: 0 },
  ],
  [
    "matematika",
    "Matematika",
    "matematika|mathematics|aktuaria",
    "I",
    "C",
    { numerical: 1, logical: 1, clerical: 0.5, verbal: 0 },
  ],
  [
    "statistik",
    "Statistika",
    "statistik|statistics|data",
    "I",
    "C",
    { numerical: 1, logical: 1, clerical: 0.5, verbal: 0 },
  ],
  ["fisika", "Fisika", "fisika|physics", "I", "R", { numerical: 1, logical: 1, spatial: 0.5, verbal: 0 }],
  ["kimia", "Kimia", "kimia|chemistry", "I", "R", { numerical: 0.5, logical: 1, spatial: 0.5, verbal: 0 }],
  ["biologi", "Biologi", "biologi|biology", "I", "R", { logical: 0.5, numerical: 0.5, verbal: 0.5, spatial: 0 }],
  [
    "bioteknologi",
    "Bioteknologi",
    "bioteknologi|biotechnology",
    "I",
    "R",
    { logical: 1, numerical: 0.5, spatial: 0, verbal: 0 },
  ],
  [
    "hubungan-internasional",
    "Hubungan Internasional",
    "hubungan internasional|international relations",
    "E",
    "A",
    { verbal: 1, logical: 0.5, numerical: 0, spatial: 0 },
  ],
  ["politik", "Ilmu Politik", "politik|pemerintahan", "E", "S", { verbal: 1, logical: 0.5, numerical: 0, spatial: 0 }],
  ["sosiologi", "Sosiologi", "sosiologi|sociology", "S", "I", { verbal: 0.5, logical: 0.5, numerical: 0, spatial: 0 }],
  [
    "antropologi",
    "Antropologi",
    "antropologi|anthropology",
    "S",
    "I",
    { verbal: 0.5, logical: 0.5, numerical: 0, spatial: 0 },
  ],
  [
    "administrasi",
    "Administrasi",
    "administrasi|sekretaris|manajemen perkantoran",
    "C",
    "S",
    { clerical: 1, verbal: 0.5, numerical: 0.5, logical: 0 },
  ],
  [
    "pariwisata",
    "Pariwisata & Perhotelan",
    "pariwisata|perhotelan|hospitality|tour",
    "E",
    "S",
    { verbal: 0.5, spatial: 0.5, numerical: 0, clerical: 0 },
  ],
  [
    "kuliner",
    "Kuliner & Tata Boga",
    "kuliner|tata boga|pastry|culinary",
    "R",
    "A",
    { spatial: 0.5, clerical: 0.5, numerical: 0, verbal: 0 },
  ],
  [
    "pertanian",
    "Pertanian & Agribisnis",
    "pertanian|agribisnis|peternakan|perkebunan|agroteknologi",
    "R",
    "I",
    { numerical: 0.5, spatial: 0.5, logical: 0.5, verbal: 0 },
  ],
  [
    "kehutanan",
    "Kehutanan & Lingkungan",
    "kehutanan|lingkungan|environmental",
    "R",
    "I",
    { spatial: 0.5, logical: 0.5, numerical: 0.5, verbal: 0 },
  ],
  [
    "perikanan",
    "Perikanan & Kelautan",
    "perikanan|kelautan|marine",
    "R",
    "I",
    { spatial: 0.5, logical: 0.5, numerical: 0.5, verbal: 0 },
  ],
  [
    "logistik",
    "Logistik",
    "logistik|rantai pasok|supply chain",
    "C",
    "R",
    { numerical: 0.5, clerical: 0.5, logical: 0.5, verbal: 0 },
  ],
  [
    "geologi",
    "Geologi & Tambang",
    "geologi|tambang|pertambangan|mining",
    "I",
    "R",
    { spatial: 0.5, numerical: 0.5, logical: 0.5, verbal: 0 },
  ],
  [
    "dirgantara",
    "Penerbangan & Dirgantara",
    "penerbangan|dirgantara|aerospace",
    "R",
    "I",
    { spatial: 0.5, numerical: 0.5, logical: 0.5, verbal: 0 },
  ],
  [
    "otomotif",
    "Otomotif",
    "otomotif|kendaraan|automotive",
    "R",
    "I",
    { spatial: 0.5, numerical: 0.5, logical: 0.5, verbal: 0 },
  ],
  ["gizi", "Gizi & Kesehatan", "gizi|nutrition", "S", "I", { numerical: 0.5, logical: 0.5, verbal: 0.5, spatial: 0 }],
  [
    "fisioterapi",
    "Fisioterapi",
    "fisioterapi|physiotherapy",
    "S",
    "R",
    { spatial: 0.5, verbal: 0.5, logical: 0.5, numerical: 0 },
  ],
  [
    "kedokteran-hewan",
    "Kedokteran Hewan",
    "hewan|veteriner|veterinary",
    "I",
    "R",
    { numerical: 0.5, logical: 0.5, verbal: 0.5, spatial: 0 },
  ],
  [
    "olahraga",
    "Olahraga",
    "olahraga|sport|penjaskes",
    "R",
    "S",
    { spatial: 0.5, verbal: 0.5, numerical: 0, logical: 0 },
  ],
];

const CAREER_MAPPINGS: [string, string][] = [
  ["kedokteran", "Dokter"],
  ["kedokteran", "Dokter Spesialis"],
  ["keperawatan", "Perawat"],
  ["kebidanan", "Bidan"],
  ["farmasi", "Apoteker"],
  ["psikologi", "Psikolog"],
  ["psikologi", "HR Specialist"],
  ["hukum", "Pengacara"],
  ["hukum", "Legal Officer"],
  ["teknik-informatika", "Software Engineer"],
  ["teknik-informatika", "Data Scientist"],
  ["teknik-informatika", "DevOps Engineer"],
  ["teknik-elektro", "Electrical Engineer"],
  ["teknik-mesin", "Mechanical Engineer"],
  ["teknik-sipil", "Civil Engineer"],
  ["arsitektur", "Arsitek"],
  ["akuntansi", "Akuntan"],
  ["akuntansi", "Auditor"],
  ["perbankan", "Banker"],
  ["perpajakan", "Konsultan Pajak"],
  ["manajemen", "Business Analyst"],
  ["manajemen", "Manajer"],
  ["ekonomi", "Ekonom"],
  ["marketing", "Marketing Specialist"],
  ["komunikasi", "Public Relations"],
  ["komunikasi", "Jurnalis"],
  ["desain", "Graphic Designer"],
  ["desain", "UI/UX Designer"],
  ["sastra", "Penulis"],
  ["sastra", "Penerjemah"],
  ["keguruan", "Guru"],
  ["keguruan", "Dosen"],
  ["matematika", "Aktuaris"],
  ["matematika", "Analis Kuantitatif"],
  ["statistik", "Data Analyst"],
  ["statistik", "Statistikawan"],
  ["fisika", "Peneliti"],
  ["kimia", "R&D Scientist"],
  ["biologi", "Biologist"],
  ["bioteknologi", "Bioinformatician"],
  ["hubungan-internasional", "Diplomat"],
  ["politik", "Kebijakan Publik"],
  ["sosiologi", "Peneliti Sosial"],
  ["administrasi", "Administrasi Perkantoran"],
  ["pariwisata", "Hotel Manager"],
  ["kuliner", "Chef"],
  ["pertanian", "Agronom"],
  ["kehutanan", "Forestry Officer"],
  ["perikanan", "Marine Biologist"],
  ["logistik", "Supply Chain Analyst"],
  ["geologi", "Geologist"],
  ["dirgantara", "Aerospace Engineer"],
  ["otomotif", "Automotive Engineer"],
  ["gizi", "Ahli Gizi"],
  ["fisioterapi", "Fisioterapis"],
  ["kedokteran-hewan", "Dokter Hewan"],
  ["olahraga", "Sports Coach"],
];

async function main() {
  console.log("Seeding TMB (Test by MULAI+)...");

  // Wipe dulu supaya re-seed bersih (idempotent)
  await db.delete(tmbQuestionBank);
  await db.delete(tmbMajorPatterns);
  await db.delete(tmbCareerMappings);
  await db.delete(tmbTestCatalog);

  // Catalog
  await db
    .insert(tmbTestCatalog)
    .values([
      {
        id: "cat-interest",
        code: "interest",
        name: "Tes Minat",
        description: "Kenali minatmu dengan model Holland RIASEC",
        totalQuestions: INTEREST_QUESTIONS.length,
        xpReward: 50,
      },
      {
        id: "cat-ability",
        code: "ability",
        name: "Tes Bakat",
        description: "Ukur kemampuan dasar: numerik, verbal, logika, spasial, klerikal",
        totalQuestions: ABILITY_QUESTIONS.length,
        xpReward: 100,
      },
    ])
    .onConflictDoNothing();

  // Interest questions
  for (let i = 0; i < INTEREST_QUESTIONS.length; i++) {
    const q = INTEREST_QUESTIONS[i];
    await db
      .insert(tmbQuestionBank)
      .values({
        id: `qi-${i + 1}`,
        testCode: "interest",
        dimension: q.d,
        pairDimension: q.p,
        text: q.t,
        optionA: q.a,
        optionB: q.b,
        order: i + 1,
      })
      .onConflictDoNothing();
  }

  // Ability questions
  for (let i = 0; i < ABILITY_QUESTIONS.length; i++) {
    const q = ABILITY_QUESTIONS[i];
    await db
      .insert(tmbQuestionBank)
      .values({
        id: `qa-${i + 1}`,
        testCode: "ability",
        dimension: q.dim,
        text: q.t,
        optionA: q.a,
        optionB: q.b,
        optionC: q.c,
        optionD: q.d,
        answer: q.ans,
        order: i + 1,
      })
      .onConflictDoNothing();
  }

  // Major patterns
  for (const [key, name, pattern, hp, hs, weights] of MAJOR_PATTERNS) {
    await db
      .insert(tmbMajorPatterns)
      .values({
        id: `pat-${key}`,
        categoryKey: key,
        categoryName: name,
        pattern,
        hollandPrimary: hp,
        hollandSecondary: hs,
        abilityWeights: weights as any,
      })
      .onConflictDoNothing();
  }

  // Career mappings
  for (let i = 0; i < CAREER_MAPPINGS.length; i++) {
    const [cat, career] = CAREER_MAPPINGS[i];
    await db
      .insert(tmbCareerMappings)
      .values({
        id: `career-${i + 1}`,
        majorCategory: cat,
        careerName: career,
      })
      .onConflictDoNothing();
  }

  console.log(
    `✅ Seeded: ${INTEREST_QUESTIONS.length} interest + ${ABILITY_QUESTIONS.length} ability questions, ${MAJOR_PATTERNS.length} major patterns, ${CAREER_MAPPINGS.length} careers`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
