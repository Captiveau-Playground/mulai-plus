/** Seed engine realistis: DISCOVER (minat 30 soal pair RIASEC) & TALENT (bakat 30 soal MC, 5 dims). */
import { db, eq, schema } from "@mulai-plus/db";
const is = (n = 24) => "z" + Array.from({ length: n - 1 }, () => Math.floor(Math.random() * 36).toString(36)).join("");

async function wipeAssessment(code: string) {
  const a = await db.query.assessments.findFirst({ where: eq(schema.assessments.code, code) });
  if (!a) return a;
  const vs = await db.query.assessmentVersions.findMany({ where: eq(schema.assessmentVersions.assessmentId, a.id) });
  for (const v of vs) {
    const sess = await db.query.assessmentSessions.findMany({ where: eq(schema.assessmentSessions.versionId, v.id) });
    for (const s of sess) {
      await db.delete(schema.assessmentResults).where(eq(schema.assessmentResults.sessionId, s.id));
      await db.delete(schema.assessmentDimensionScores).where(eq(schema.assessmentDimensionScores.sessionId, s.id));
      await db.delete(schema.assessmentAnswers).where(eq(schema.assessmentAnswers.sessionId, s.id));
      await db.delete(schema.assessmentSessions).where(eq(schema.assessmentSessions.id, s.id));
    }
    const qs = await db.query.questions.findMany({ where: eq(schema.questions.versionId, v.id) });
    for (const q of qs) {
      await db.delete(schema.questionOptions).where(eq(schema.questionOptions.questionId, q.id));
      await db.delete(schema.textInputConfigs).where(eq(schema.textInputConfigs.questionId, q.id));
    }
    await db.delete(schema.questions).where(eq(schema.questions.versionId, v.id));
    await db.delete(schema.assessmentSections).where(eq(schema.assessmentSections.versionId, v.id));
    const dims = await db.query.assessmentDimensions.findMany({ where: eq(schema.assessmentDimensions.versionId, v.id) });
    for (const d of dims) await db.delete(schema.dimensionInstructions).where(eq(schema.dimensionInstructions.dimensionId, d.id));
    await db.delete(schema.assessmentDimensions).where(eq(schema.assessmentDimensions.versionId, v.id));
    await db.delete(schema.assessmentVersions).where(eq(schema.assessmentVersions.id, v.id));
  }
  return a;
}

const RIASEC = { R: "Realistic", I: "Investigative", A: "Artistic", S: "Social", E: "Enterprising", C: "Conventional" } as const;
const RIASEC_DESC: Record<string, string> = {
  R: "Praktis, kerja dengan alat & benda",
  I: "Analitis, riset, pemecahan masalah",
  A: "Kreatif, ekspresi & imajinasi",
  S: "Membantu, mengajar, berinteraksi",
  E: "Memimpin, memengaruhi, berorganisasi",
  C: "Teliti, teratur, prosedur jelas",
};

// 30 pasangan RIASEC realistis: tiap dimensi tampil sebagai sisi pilihan 5x
const MINAT: [string, string][] = [
  ["Memperbaiki sepeda motor sendiri sampai hidup lagi", "Menganalisa penyebab kerusakan mesin dari data teknis"], // R vs I
  ["Membuat sketsa karakter untuk komik", "Menjadi panitia yang memastikan acara berjalan rapi"], // A vs C
  ["Membantu teman menyiapkan ujian", "Memimpin tim kecil mengerjakan proyek kelompok"], // S vs E
  ["Meneliti rumus dan pola angka", "Mengatur jadwal & dokumen agar tertib"], // I vs C
  ["Merancang poster acara sekolah", "Bercerita/edukasi adik atau teman"], // A vs S
  ["Menjadi bendahara yang teliti", "Menjadi ketua yang meyakinkan anggota"], // C vs E
  ["Mengerjakan eksperimen laboratorium", "Mengorganisir kerja sama tim"], // I vs E
  ["Membangun miniatur atau merakit elektronik", "Menggambar ilustrasi & mendesain"], // R vs A
  ["Mengajar adik atau teman yang kesulitan", "Gemer menelaah buku referensi"], // S vs I
  ["Menata data & laporan rapi", "Bertanggung jawab memimpin rapat"], // C vs E
  ["Menyelesaikan teka-teki logika", "Menolong orang lain yang kesusahan"], // I vs S
  ["Rawat peralatan teknis di rumah", "Membuat rencana bisnis mikro"], // R vs E
  ["Menulis puisi atau cerita", "Menghitung & merapikan keuangan"], // A vs C
  ["Menjadi coordinator kegiatan sukarela", "Meneliti fenomena sosial"], // E vs I
  ["Mengikuti lomba cerdas cermat sains", "Menjadi MC atau pembawa acara"], // I vs E
  ["Membuat karya seni dari barang bekas", "Memperbaiki barang elektronik"], // A vs R
  ["Mengatur inventaris dengan teliti", "Membantu sesama secara langsung"], // C vs S
  ["Meyakinkan orang membeli ide produk", "Menyusun data riset dengan teliti"], // E vs I
  ["Berlatih keterampilan tangan", "Menulis laporan penelitian"], // R vs I
  ["Menghias/mendesain ruang", "Jadi panitia dengan jadwal rapi"], // A vs C
  ["Mendengarkan cerita & memberi solusi", "Memimpin diskusi kelompok"], // S vs E
  ["Merancang uji coba sederhana", "Menata jadwal kerja tim"], // I vs C
  ["Bekerja di bengkel/garasi", "Bekerja di depan publik mencairkan suasana"], // R vs E
  ["Menggambar denah atau desain", "Membantu teman menenangkan diri"], // A vs S
  ["Menghitung anggaran kegiatan", "Menemukan solusi baru dari masalah"], // C vs I
  ["Memotivasi tim mengejar target", "Merawat & merapikan peralatan"], // E vs R
  ["Menganalisa teks/artikel ilmiah", "Berinteraksi dengan banyak orang"], // I vs S
  ["Menyusun SOP atau prosedur", "Berkreasi bebas tanpa aturan kaku"], // C vs A
  ["Membimbing teman berlatih skill", "Mengelola proyek dari nol"], // S vs E
  ["Mengamati alam & mencatat data", "Merapikan koleksi/arsip"], // I vs C
];

// 30 soal bakat realistis (5 dims x 6): verbal, numerik, logika, spasial, klerikal
const ABILITY = {
  verbal: [
    ["Sinonim dari 'presisi' adalah…", [["Ketepatan", 1], ["Kelambatan", 0], ["Kelonggaran", 0], ["Kebiasaan", 0]]],
    ["Kata yang paling dekat maknanya dgn 'efisien'…", [["Hemat", 1], ["Mewah", 0], ["Cepat-cepatan", 0], ["Kaku", 0]]],
    ["Lawan kata 'berpola' adalah…", [["Acak", 1], ["Terstruktur", 0], ["Runtut", 0], ["Sistematis", 0]]],
    ["A, C, E, G, … huruf berikutnya adalah…", [["I", 1], ["H", 0], ["J", 0], ["K", 0]]],
    ["Kelompok kata yang paling berbeda:…", [["Belut", 1], ["Salmon", 0], ["Tuna", 0], ["Bawal", 0]]],
    ["'Dedikasi' paling dekat artinya dgn…", [["Pengabdian", 1], ["Keterasingan", 0], ["Perhitungan", 0], ["Perjalanan", 0]]],
  ],
  numerik: [
    ["3 × 8 − 5 = …", [["19", 1], ["18", 0], ["21", 0], ["17", 0]]],
    ["Lanjutkan: 2, 4, 8, 16, …", [["32", 1], ["24", 0], ["28", 0], ["20", 0]]],
    ["0,25 + 0,75 = …", [["1", 1], ["0,5", 0], ["0,75", 0], ["1,5", 0]]],
    ["Sebuah barang 100.000 diskon 20% → harga…", [["80.000", 1], ["20.000", 0], ["90.000", 0], ["95.000", 0]]],
    ["⅔ dari 90 = …", [["60", 1], ["45", 0], ["70", 0], ["30", 0]]],
    ["Rata-rata 40 dan 50 adalah…", [["45", 1], ["40", 0], ["50", 0], ["90", 0]]],
  ],
  logical: [
    ["Semua siswa pramuka pakai baju coklat. Budi baju coklat. Kesimpulan paling benar? Budi…", [["bisa siswa pramuka (tidak pasti)", 1], ["pasti siswa pramuka", 0], ["bukan siswa pramuka", 0], ["semuanya salah", 0]]],
    ["Jika hujan maka jalan basah. Jalan tidak basah. Berarti…", [["tidak hujan", 1], ["hujan", 0], ["gerimis", 0], ["tidak tentu", 0]]],
    ["Lanjutkan pola: 1, 1, 2, 3, 5, 8, …", [["13", 1], ["11", 0], ["12", 0], ["10", 0]]],
    ["Ana lebih tua dari Budi, Cici lebih muda dari Budi. Siapa paling tua?…", [["Ana", 1], ["Budi", 0], ["Cici", 0], ["tidak tahu", 0]]],
    ["Urutan benar: mandi → … → berangkat", [["berpakaian", 1], ["tidur", 0], ["makan malam", 0], ["belajar", 0]]],
    ["Semua apel itu buah. Semua buah bisa dimakan. Maka…", [["apel bisa dimakan", 1], ["buah pasti apel", 0], ["apel bukan buah", 0], ["tidak bisa disimpulkan", 0]]],
  ],
  spatial: [
    ["Bangun dengan 4 sisi sama panjang disebut…", [["persegi", 1], ["lingkaran", 0], ["segitiga", 0], ["tabung", 0]]],
    ["Jika jam menunjukkan 03:00, jarum membentuk sudut…", [["90°", 1], ["45°", 0], ["180°", 0], ["60°", 0]]],
    ["Bayangkan kubus dilihat dari atas tampak seperti…", [["persegi", 1], ["lingkaran", 0], ["segitiga", 0], ["garis", 0]]],
    ["Balok memiliki jumlah sisi…", [["6", 1], ["4", 0], ["8", 0], ["12", 0]]],
    ["Cetakan: L → cermin menjadi…", [["L terbalik (cermin)", 1], ["huruf L biasa", 0], ["huruf O", 0], ["huruf I", 0]]],
    ["Sepotong kertas dilipat 2 → lubang saat terbuka berbentuk…", [["4 lubang", 1], ["1 lubang", 0], ["2 lubang", 0], ["8 lubang", 0]]],
  ],
  clerical: [
    ["Manakah yang berbeda? 1234, 1243, 1234, 1234", [["1243", 1], ["1234", 0], ["keduanya sama", 0], ["tidak ada", 0]]],
    ["Urutkan benar: K3-91, K3-19, K1-99 → pertama adalah…", [["K1-99", 1], ["K3-19", 0], ["K3-91", 0], ["K9-31", 0]]],
    ["Jumlah huruf 'e' pada teks 'mereka mengecek sesuai' adalah…", [["5", 1], ["4", 0], ["6", 0], ["3", 0]]],
    ["Pola: AA BB CC → berikutnya…", [["DD", 1], ["AA", 0], ["AB", 0], ["C1", 0]]],
    ["Nomor 052-334 dan 052-434: samakah?…", [["tidak", 1], ["ya", 0], ["hampir", 0], ["tidak tahu", 0]]],
    ["Kata 'BROMO' bila urutkan abjad menjadi…", [["BM OOR", 1], ["BROMO", 0], ["ORBMO", 0], ["MROOB", 0]]],
  ],
} as const;

async function main() {
  const scaleId = "defscale0a0b0c0d0e0f0010"; // default A-F, 1 poin (sudah ada)

  // ── DISCOVER (minat) ──
  let a = await wipeAssessment("DISCOVER");
  if (!a) { a = { id: is() }; await db.insert(schema.assessments).values({ id: a.id, code: "DISCOVER", family: "minat", name: "MULAI Discover™", description: "Tes Minat — Holland RIASEC" }); }
  else await db.update(schema.assessments).set({ name: "MULAI Discover™", description: "Tes Minat — Holland RIASEC" }).where(eq(schema.assessments.id, a.id));
  const vid = is();
  const cfgD = { total_dim: 6, result_dim_count: 3, min_q_per_dim: 4, randomize_q: true, randomize_a: true, timer_enabled: false, timer_scope: "none", allow_pause: true, scoring_method: "sum", section_mode: "chunk:15", lang: "id" };
  await db.insert(schema.assessmentVersions).values({ id: vid, assessmentId: a.id, versionNumber: 1, status: "live", configJson: cfgD, publishedAt: new Date() });
  const dimsD: Record<string, string> = {};
  const cols = ["R", "I", "A", "S", "E", "C"] as const;
  for (let i = 0; i < cols.length; i++) { const c = cols[i]!; dimsD[c] = is(); await db.insert(schema.assessmentDimensions).values({ id: dimsD[c], versionId: vid, code: c, name: RIASEC[c], shortName: c, description: RIASEC_DESC[c]!, displayOrder: i, isActive: true }); }
  // 30 soal dikelompokkan per dimensi (R×5, I×5, …) → section per dimensi terasa nyata
  const opDPair: Record<string, string> = { R: "I", I: "A", A: "S", S: "E", E: "C", C: "R" };
  for (let g = 0; g < cols.length; g++) {
    const dA = cols[g]!;
    const dB = opDPair[dA]!;
    for (let j = 0; j < 5; j++) {
      const [A, B] = MINAT[g * 5 + j]!;
      const qid = is();
      await db.insert(schema.questions).values({ id: qid, versionId: vid, dimensionId: dimsD[dA]!, scaleId, questionText: `Saat dihadapkan dua pilihan ini, mana yang lebih menggambarkanmu?`, questionType: "multiple_choice", presentationMode: "standard_option_card", displayOrder: g * 5 + j, isActive: true });
      await db.insert(schema.questionOptions).values({ id: is(), questionId: qid, optionValue: "A", targetDimension: dimsD[dA]!, label: A, score: 1, displayOrder: 0 });
      await db.insert(schema.questionOptions).values({ id: is(), questionId: qid, optionValue: "B", targetDimension: dimsD[dB]!, label: B, score: 1, displayOrder: 1 });
    }
  }
  console.log("DISCOVER: 30 soal seeded");

  // ── TALENT (bakat) ──
  a = await wipeAssessment("TALENT");
  if (!a) { a = { id: is() }; await db.insert(schema.assessments).values({ id: a.id, code: "TALENT", family: "bakat", name: "MULAI Talent™", description: "Tes Bakat — kemampuan dasar" }); }
  else await db.update(schema.assessments).set({ name: "MULAI Talent™", description: "Tes Bakat — kemampuan dasar" }).where(eq(schema.assessments.id, a.id));
  const vidT = is();
  const cfgT = { total_dim: 5, result_dim_count: 2, min_q_per_dim: 5, randomize_q: true, randomize_a: true, timer_enabled: true, timer_scope: "dimension", allow_pause: true, scoring_method: "sum", section_mode: "by_dimension", lang: "id" };
  await db.insert(schema.assessmentVersions).values({ id: vidT, assessmentId: a.id, versionNumber: 1, status: "live", configJson: cfgT, publishedAt: new Date() });
  const dimsT: Record<string, string> = {};
  const kKeys = Object.keys(ABILITY);
  for (let i = 0; i < kKeys.length; i++) {
    const k = kKeys[i]!;
    dimsT[k] = is();
    await db.insert(schema.assessmentDimensions).values({ id: dimsT[k], versionId: vidT, code: k, name: k === "verbal" ? "Penalaran Verbal" : k === "numerik" ? "Kemampuan Numerik" : k === "logical" ? "Penalaran Logis" : k === "spatial" ? "Penalaran Spasial" : "Kecepatan Perseptual", shortName: k, displayOrder: i, isActive: true, durationSeconds: 120 });
  }
  let order = 0;
  for (const [k, list] of Object.entries(ABILITY)) {
    const rows = list as unknown as [string, [string, number][]][];
    for (let r = 0; r < rows.length; r++) {
      const [q, opts] = rows[r]!;
      const qid = is();
      await db.insert(schema.questions).values({ id: qid, versionId: vidT, dimensionId: dimsT[k]!, scaleId, questionText: q, questionType: "multiple_choice", presentationMode: "standard_option_card", displayOrder: order++, isActive: true });
      for (let oi = 0; oi < opts.length; oi++) {
        const [label, sc] = opts[oi]!;
        await db.insert(schema.questionOptions).values({ id: is(), questionId: qid, optionValue: String.fromCharCode(65 + oi), targetDimension: dimsT[k]!, label, score: sc, displayOrder: oi });
      }
    }
  }
  console.log("TALENT: 30 soal seeded (verbal/numerik/logika/spasial/klerikal)");
  process.exit(0);
}
main().catch((e) => { console.error("gagal:", e); process.exit(1); });
