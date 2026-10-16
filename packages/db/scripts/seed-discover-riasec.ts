/**
 * Seeder bank item DISCOVER (Holland RIASEC) — 6 dimensi × 20 aitem = 120 soal.
 *
 * Format jawaban: skala Likert 1–5 ("Sangat tidak suka" … "Sangat suka").
 * Setiap soal punya satu dimensi; poin masuk ke dimensi tersebut (score 1–5).
 *
 * Pemakaian (dari folder packages/db):
 *   bun scripts/seed-discover-riasec.ts                 # isi versi DRAFT (aman, belum live)
 *   bun scripts/seed-discover-riasec.ts --publish       # sekalian rilis jadi versi live
 *   bun scripts/seed-discover-riasec.ts --force          # timpa soal yang sudah ada di versi itu
 *
 * Idempotent: kalau versi target sudah punya soal, script berhenti (kecuali --force).
 */
import { db, desc, eq, schema } from "@mulai-plus/db";
import { nanoidish } from "./lib-id";

const id = () => nanoidish();

const DIMS = [
  { code: "R", name: "Realistic", short: "R", desc: "Senang bekerja dengan alat, benda, dan kegiatan praktis." },
  { code: "I", name: "Investigative", short: "I", desc: "Senang menganalisis, meneliti, dan memecahkan masalah." },
  { code: "A", name: "Artistic", short: "A", desc: "Senang berkreasi, berimajinasi, dan mengekspresikan ide." },
  { code: "S", name: "Social", short: "S", desc: "Senang membantu, mengajar, dan berinteraksi dengan orang." },
  { code: "E", name: "Enterprising", short: "E", desc: "Senang memimpin, memengaruhi, dan mengorganisir." },
  { code: "C", name: "Conventional", short: "C", desc: "Senang keteraturan, ketelitian, dan prosedur jelas." },
] as const;

/** Skala jawaban: emoji sebagai wajah + caption sebagai teks pendamping. */
const LIKERT = [
  { emoji: "😡", caption: "Sangat tidak suka" },
  { emoji: "🙁", caption: "Tidak suka" },
  { emoji: "😐", caption: "Netral" },
  { emoji: "🙂", caption: "Suka" },
  { emoji: "😍", caption: "Sangat suka" },
];

/** Bank aitem: kode → teks (verbatim dari dokumen bank item). */
const ITEMS: Record<string, [string, string][]> = {
  R: [
    ["R1", "Memperbaiki peralatan atau perabotan yang rusak di rumah."],
    ["R2", "Merakit barang, perangkat elektronik, atau benda lainnya dari berbagai komponen."],
    ["R3", "Melakukan aktivitas fisik yang membutuhkan banyak tenaga di luar ruangan (alam terbuka)."],
    ["R4", "Mengoperasikan peralatan perkakas (seperti palu, bor, gergaji, atau obeng)."],
    [
      "R5",
      "Membuat kerajinan tangan dari bahan keras seperti kayu, logam, atau tanah liat untuk menghasilkan benda yang dapat digunakan.",
    ],
    ["R6", "Membongkar dan merakit kembali komponen-komponen mesin menggunakan alat-alat mekanik."],
    ["R7", "Berkebun, menanam pohon, atau merawat tanaman di lingkungan sekitar."],
    [
      "R8",
      "Melakukan pekerjaan fisik dalam mengurus hewan ternak atau satwa, seperti memberi pakan dan membersihkan kandang.",
    ],
    ["R9", "Mengikuti kegiatan praktik yang melibatkan penggunaan alat, bahan, dan keterampilan tangan."],
    ["R10", "Membongkar, merawat, atau memodifikasi bagian-bagian mesin kendaraan bermotor atau sepeda."],
    ["R11", "Tertarik mencoba memperbaiki sistem instalasi listrik atau saluran air sederhana di rumah."],
    ["R12", "Beraktivitas di bengkel, pabrik, atau lingkungan yang penuh dengan mesin."],
    ["R13", "Terlibat langsung dalam kegiatan pertukangan atau pembangunan di suatu proyek konstruksi."],
    ["R14", "Membuat, memotong, atau merangkai benda fisik menggunakan alat-alat pertukangan kayu atau besi."],
    ["R15", "Merakit komponen perangkat keras (hardware) komputer atau laptop."],
    ["R16", "Menggunakan alat pengukur presisi (seperti meteran panjang, jangka sorong, atau alat ukur tanah)."],
    ["R17", "Menjahit pakaian secara manual ataupun dengan alat jahit."],
    [
      "R18",
      "Melakukan pekerjaan yang bersentuhan langsung dengan alam, seperti bertani, beternak, atau mengelola lahan.",
    ],
    ["R19", "Memasang peralatan outdoor, seperti mendirikan tenda atau merakit alat pancing."],
    ["R20", "Menyambung dan merapikan instalasi kabel elektronik."],
  ],
  I: [
    ["I1", "Melakukan eksperimen atau percobaan ilmiah di laboratorium."],
    ["I2", "Membaca artikel atau menonton dokumenter tentang penemuan sains dan teknologi."],
    ["I3", "Memecahkan teka-teki logika atau puzzle yang menantang."],
    ["I4", "Menganalisis masalah untuk mencari tahu penyebab atau akar masalahnya."],
    ["I5", "Mengamati perilaku hewan, tumbuhan, atau fenomena alam secara mendetail."],
    ["I6", "Bertanya secara kritis tentang mengapa atau bagaimana sesuatu bisa bekerja."],
    ["I7", "Mencari data, fakta, dan sumber yang valid sebelum mempercayai sebuah informasi."],
    ["I8", "Melakukan kegiatan yang membutuhkan riset atau penelitian secara mendalam."],
    ["I9", "Mempelajari cara kerja suatu aplikasi atau sistem teknologi."],
    ["I10", "Mengumpulkan informasi dari berbagai sumber untuk menganalisis suatu masalah."],
    ["I11", "Menyelidiki sejarah atau asal-usul di balik suatu kejadian, budaya, atau tempat."],
    ["I12", "Mempelajari struktur molekul atau unsur kimia."],
    ["I13", "Mempelajari fenomena astronomi seperti tata surya."],
    ["I14", "Mengamati bakteri, sel, atau benda-benda sangat kecil menggunakan lensa/mikroskop."],
    ["I15", "Menganalisis alasan di balik perilaku manusia dari sudut pandang psikologi."],
    ["I16", "Menyelesaikan permainan yang membutuhkan strategi dan pemecahan masalah."],
    ["I17", "Menganalisis hasil survei atau statistik rumit untuk menemukan pola atau hubungan dalam data."],
    ["I18", "Mempelajari topik-topik sains atau pengetahuan baru secara mandiri melalui literatur atau video edukasi."],
    ["I19", "Mengeksplorasi literatur mengenai fenomena ilmiah kompleks yang belum terpecahkan."],
    ["I20", "Mengklasifikasikan jenis-jenis batuan, tanaman, atau jenis serangga."],
  ],
  A: [
    ["A1", "Menggambar, melukis, atau membuat sketsa."],
    ["A2", "Memainkan alat musik atau menciptakan nada/melodi lagu."],
    ["A3", "Menulis karya kreatif seperti cerita pendek, puisi, atau naskah drama."],
    ["A4", "Tampil membawakan pertunjukan seni di atas panggung (seperti menyanyi, menari, atau teater)."],
    ["A5", "Membuat desain grafis, poster, atau konten visual digital."],
    ["A6", "Mendekorasi atau menata ulang tata letak sebuah ruangan agar terlihat lebih indah."],
    ["A7", "Mengambil foto atau merekam video dengan memperhatikan komposisi dan estetika."],
    ["A8", "Menciptakan karya seni tertentu untuk mengekspresikan perasaan, suasana hati, atau ide pribadi."],
    ["A9", "Memilih padu padan pakaian (mix and match fashion) yang unik dan personal."],
    ["A10", "Menganalisis dan mengapresiasi nilai keindahan dari sebuah karya atau pertunjukan seni."],
    ["A11", "Mengedit video dengan memperhatikan kreativitas dan estetika visual."],
    ["A12", "Mendesain tampilan visual sebuah website atau aplikasi agar terlihat menarik dan artistik."],
    ["A13", "Menulis ulasan tentang film atau buku."],
    ["A14", "Membuat karya seni tiga dimensi, seperti patung atau keramik."],
    ["A15", "Menata rias wajah (makeup) atau menata rambut dengan gaya yang kreatif."],
    [
      "A16",
      "Menyusun karya seni pertunjukan yang orisinal, seperti mengaransemen lagu atau menciptakan koreografi tari.",
    ],
    ["A17", "Berimajinasi merancang dunia fiksi dan karakter-karakter di dalamnya."],
    ["A18", "Mendesain logo atau identitas visual untuk sebuah produk atau acara."],
    ["A19", "Mengubah barang bekas atau material tidak terpakai menjadi sebuah karya seni atau pajangan."],
    ["A20", "Mengerjakan suatu proyek atau karya yang memberikan kebebasan penuh untuk berekspresi tanpa aturan baku."],
  ],
  S: [
    ["S1", "Menjadi tempat curhat dan mendengarkan masalah teman tanpa menghakimi."],
    ["S2", "Mengajari teman atau adik kelas yang kesulitan dalam memahami pelajaran sekolah."],
    ["S3", "Mengikuti kegiatan sukarelawan (volunteer) atau bakti sosial."],
    ["S4", "Merawat, mendampingi, atau membantu orang lain yang sedang sakit/cedera."],
    ["S5", "Berusaha membuat semua orang di dalam kelompok merasa nyaman dan dilibatkan."],
    ["S6", "Memberikan arah atau informasi yang ramah kepada orang asing yang kebingungan."],
    ["S7", "Mengikuti pelatihan untuk meningkatkan kemampuan membantu atau membimbing orang lain."],
    ["S8", "Membantu kegiatan mengajar atau membimbing dalam suatu kelompok."],
    ["S9", "Menghibur dan menenangkan teman yang sedang sedih atau mengalami masa sulit."],
    ["S10", "Menjadi penengah untuk membantu menyelesaikan konflik/pertengkaran antar teman."],
    ["S11", "Memfasilitasi sesi bimbingan kelompok atau diskusi berbagai pengalaman."],
    ["S12", "Mengasuh anak kecil, bermain bersama mereka, atau membantu di tempat penitipan anak."],
    ["S13", "Membangun persahabatan dengan orang-orang dari latar belakang dan budaya yang berbeda."],
    ["S14", "Membantu secara fisik dan emosional orang yang memiliki kebutuhan khusus (disabilitas)."],
    ["S15", "Bekerja sama dalam tim untuk memberikan pelayanan kepada orang lain."],
    ["S16", "Memberikan motivasi atau kata-kata semangat kepada orang yang sedang merasa gagal."],
    ["S17", "Terlibat aktif dalam mengurus acara kebersamaan, yang mempererat hubungan antaranggota komunitas."],
    ["S18", "Menyambut anggota atau orang baru agar mereka merasa diterima."],
    ["S19", "Memberikan informasi atau menjawab pertanyaan untuk membantu orang lain."],
    ["S20", "Mendedikasikan waktu luang untuk mendengarkan keluh kesah orang yang kesepian."],
  ],
  E: [
    ["E1", "Memimpin suatu kelompok atau organisasi untuk mencapai tujuan bersama."],
    ["E2", "Berjualan barang, makanan, atau jasa untuk mendapatkan keuntungan finansial."],
    ["E3", "Mempengaruhi atau meyakinkan orang lain agar setuju dan mendukung ide yang saya ajukan."],
    ["E4", "Berbicara di depan umum (public speaking) untuk mempromosikan atau mengkampanyekan sesuatu."],
    ["E5", "Mengambil inisiatif pertama untuk memulai sebuah proyek atau acara baru di lingkungan saya."],
    ["E6", "Bernegosiasi atau tawar-menawar dengan orang lain untuk mendapatkan kesepakatan terbaik."],
    ["E7", "Bersaing untuk mencapai target atau memperoleh hasil terbaik."],
    ["E8", "Membangun relasi dengan orang-orang baru yang dapat membuka peluang."],
    ["E9", "Mengarahkan, mendelegasikan, dan membagi tugas kepada anggota tim lainnya."],
    ["E10", "Memikirkan dan merancang ide bisnis baru yang berpotensi menghasilkan uang."],
    ["E11", "Mewakili kelompok atau organisasi dalam suatu kegiatan."],
    ["E12", "Menyusun strategi pemasaran atau promosi agar suatu produk/acara dikenal banyak orang."],
    ["E13", "Mengambil keputusan secara cepat dan berani mengambil risiko saat berada dalam tekanan."],
    ["E14", "Meyakinkan pihak eksternal, donatur, atau sponsor untuk mendanai kegiatan suatu organisasi."],
    ["E15", "Menjadi pembawa acara (MC) yang memandu jalannya suatu kegiatan."],
    ["E16", "Mengkampanyekan diri sendiri untuk mendapatkan posisi penting di sebuah organisasi atau kepanitiaan."],
    ["E17", "Memotivasi anggota tim agar bekerja lebih keras demi mencapai target kelompok."],
    ["E18", "Menyusun rencana untuk mengembangkan suatu kegiatan atau organisasi menjadi lebih besar."],
    ["E19", "Memimpin jalannya rapat agar menghasilkan keputusan yang baik bagi kelompok."],
    ["E20", "Menangani keluhan dari orang lain secara taktis, diplomatis, dan persuasif."],
  ],
  C: [
    ["C1", "Menyusun jadwal kegiatan atau rencana agar aktivitas berjalan lebih teratur."],
    ["C2", "Mencatat dan mengatur informasi keuangan agar tersusun dengan rapi."],
    ["C3", "Mengatur file, dokumen, atau catatan agar tersusun rapi dan mudah ditemukan."],
    ["C4", "Memasukkan dan mengatur data atau informasi secara teratur."],
    [
      "C5",
      "Mengikuti aturan, instruksi, atau pedoman langkah demi langkah (SOP) secara pasti saat mengerjakan sesuatu.",
    ],
    ["C6", "Mengolah dan menyusun data atau angka secara teratur dan rapi."],
    [
      "C7",
      "Memeriksa kembali (double-check) tugas yang sudah selesai untuk memastikan tidak ada kesalahan kecil (typo).",
    ],
    ["C8", "Mengatur administrasi, jadwal, atau dokumen agar suatu kegiatan berjalan dengan tertib."],
    ["C9", "Menyimpan, mengarsipkan, dan merawat surat-surat atau dokumen penting agar tidak hilang/rusak dan rapi."],
    ["C10", "Mengerjakan tugas-tugas administratif yang terstruktur, dapat diprediksi, dan rutin berulang."],
    ["C11", "Melakukan inventarisasi barang, dengan menghitung dan mencatat jumlahnya secara teratur."],
    ["C12", "Mengelola daftar peserta atau informasi kehadiran dalam suatu kegiatan."],
    ["C13", "Menyusun laporan atau tulisan dengan mengikuti format yang sudah ditentukan."],
    ["C14", "Mengelompokkan dan menyusun dokumen berdasarkan urutan tertentu."],
    ["C15", "Bekerja dalam situasi yang memiliki aturan dan sistem kerja yang jelas."],
    ["C16", "Mengelompokkan informasi atau benda berdasarkan kategori tertentu."],
    ["C17", "Menyusun daftar informasi agar tersimpan rapi dan mudah digunakan."],
    ["C18", "Mengecek kesesuaian antara daftar barang pesanan dengan kenyataan fisik barang yang diterima."],
    ["C19", "Mencatat hasil diskusi atau kegiatan agar dapat dipahami kembali."],
    ["C20", "Membuat daftar atau pengelompokkan informasi agar mudah dicari."],
  ],
};

async function main() {
  const force = process.argv.includes("--force");
  const publish = process.argv.includes("--publish");

  const assess = await db.query.assessments.findFirst({ where: eq(schema.assessments.code, "DISCOVER") });
  if (!assess) throw new Error("Assessment DISCOVER tidak ditemukan. Jalankan seeder DISCOVER dulu.");

  const versions = await db.query.assessmentVersions.findMany({
    where: eq(schema.assessmentVersions.assessmentId, assess.id),
    orderBy: (t) => [desc(t.versionNumber)],
  });
  const target = versions.find((v) => v.status === "draft") ?? versions[0];
  if (!target) throw new Error("DISCOVER belum punya versi.");
  console.log(`Target: DISCOVER v${target.versionNumber} (${target.status})`);

  const existing = await db.query.questions.findMany({
    where: eq(schema.questions.versionId, target.id),
    columns: { id: true },
  });
  let skipSeed = false;
  if (existing.length > 0 && !force) {
    console.log(`⏭ Versi ini sudah punya ${existing.length} soal — seed dilewati (pakai --force untuk menimpa).`);
    skipSeed = true;
  }
  if (existing.length > 0 && force) {
    const ids = existing.map((q) => q.id);
    for (const qid of ids) await db.delete(schema.questionOptions).where(eq(schema.questionOptions.questionId, qid));
    await db.delete(schema.questions).where(eq(schema.questions.versionId, target.id));
    console.log(`🗑  ${ids.length} soal lama dihapus.`);
  }

  // Dimensi RIASEC (pakai yang ada, buat yang belum ada)
  const existingDims = await db.query.assessmentDimensions.findMany({
    where: eq(schema.assessmentDimensions.versionId, target.id),
  });
  const dimId: Record<string, string> = {};
  for (const [i, d] of DIMS.entries()) {
    const found = existingDims.find((x) => x.code === d.code);
    if (found) {
      dimId[d.code] = found.id;
      await db
        .update(schema.assessmentDimensions)
        .set({ name: d.name, shortName: d.short, description: d.desc, displayOrder: i, isActive: true })
        .where(eq(schema.assessmentDimensions.id, found.id));
    } else {
      const did = id();
      dimId[d.code] = did;
      await db.insert(schema.assessmentDimensions).values({
        id: did,
        versionId: target.id,
        code: d.code,
        name: d.name,
        shortName: d.short,
        description: d.desc,
        displayOrder: i,
        isActive: true,
      });
    }
  }

  // Soal + opsi skala emoji.
  // displayOrder unik GLOBAL dan dikelompokkan per dimensi (R 0–19, I 20–39, …) supaya
  // daftar di admin berurutan dan "Pembagian bagian soal = Per dimensi" di engine benar.
  let inserted = 0;
  let order = 0;
  for (const d of skipSeed ? [] : DIMS) {
    const items = ITEMS[d.code] ?? [];
    for (const [code, text] of items) {
      const qid = id();
      await db.insert(schema.questions).values({
        id: qid,
        versionId: target.id,
        dimensionId: dimId[d.code]!,
        scaleId: null,
        questionCode: code,
        questionText: text,
        questionType: "likert",
        presentationMode: "emoji_option",
        displayOrder: order,
        weight: 1,
        isActive: true,
      });
      for (const [i, lv] of LIKERT.entries()) {
        await db.insert(schema.questionOptions).values({
          id: id(),
          questionId: qid,
          optionValue: "ABCDE"[i]!,
          targetDimension: dimId[d.code]!,
          label: lv.caption,
          icon: lv.emoji,
          imageCaption: lv.caption,
          score: i + 1,
          displayOrder: i,
        });
      }
      inserted++;
      order++;
    }
  }
  if (!skipSeed)
    console.log(`✅ ${inserted} soal (skala emoji 😡🙁😐🙂😍) ditambahkan ke DISCOVER v${target.versionNumber}.`);

  // Konfigurasi versi yang cocok untuk bank item ini.
  // - section_mode "by_dimension": 6 bagian = 6 dimensi, tiap bagian punya layar instruksi sendiri
  //   (butuh urutan soal mengelompok per dimensi → displayOrder di atas sudah begitu).
  // - randomize_q OFF: kalau soal diacak, batas bagian jadi tidak valid.
  // - randomize_a OFF: opsinya adalah tangga emoji 😡→😍 yang urutannya bermakna; kalau diacak
  //   skala jadi kacau.
  const RECOMMENDED = {
    lang: "id",
    total_dim: DIMS.length,
    result_dim_count: 3,
    min_q_per_dim: 4,
    scoring_method: "sum",
    randomize_q: false,
    randomize_a: false,
    allow_pause: true,
    section_mode: "by_dimension",
  };
  const current = (target.configJson ?? {}) as Record<string, unknown>;
  const changed = Object.entries(RECOMMENDED).filter(([k, v]) => current[k] !== v);
  if (changed.length) {
    await db
      .update(schema.assessmentVersions)
      .set({ configJson: { ...current, ...RECOMMENDED } })
      .where(eq(schema.assessmentVersions.id, target.id));
    console.log(`⚙️  config disesuaikan: ${changed.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ")}`);
  }

  // Pengantar + instruksi per dimensi (kalau belum ada)
  const sections = await db.query.assessmentSections.findMany({
    where: eq(schema.assessmentSections.versionId, target.id),
  });
  if (sections.length === 0) {
    await db.insert(schema.assessmentSections).values([
      {
        id: id(),
        versionId: target.id,
        title: "Apa itu Tes Minat?",
        contentType: "description",
        contentJson: {
          text: "MULAI Discover™ mengukur minatmu berbasis teori Holland (RIASEC). Hasilnya — 3 kode minat dominan — jadi dasar rekomendasi jurusan & karier.",
        },
        displayOrder: 0,
        visibility: true,
      },
      {
        id: id(),
        versionId: target.id,
        title: "Cara kerja",
        contentType: "bullet_list",
        contentJson: {
          items: [
            "Jawab 120 pernyataan aktivitas",
            "Pilih emoji sesuai seberapa suka kamu melakukannya",
            "Langsung dapat kode minat (S-I-A) + rekomendasi jurusan",
          ],
        },
        displayOrder: 1,
        visibility: true,
      },
    ] as never);
    console.log("✅ 2 pengantar ditambahkan.");
  }

  const instr = await db.query.dimensionInstructions.findMany({
    where: eq(schema.dimensionInstructions.dimensionId, dimId.R!),
  });
  if (instr.length === 0) {
    for (const d of DIMS) {
      await db.insert(schema.dimensionInstructions).values({
        id: id(),
        dimensionId: dimId[d.code]!,
        header: `Bagian ${d.name}`,
        contentType: "bullet_list",
        contentJson: {
          items: [
            "Baca setiap pernyataan",
            "Nilai seberapa suka kamu melakukannya",
            "Tidak ada jawaban benar atau salah",
          ],
        },
      } as never);
    }
    console.log("✅ 6 instruksi dimensi ditambahkan.");
  }

  // Verifikasi kelayakan rilis
  const qs = await db.query.questions.findMany({
    where: eq(schema.questions.versionId, target.id),
    columns: { id: true, dimensionId: true, displayOrder: true, questionType: true, scaleId: true },
  });
  const perDim = new Map<string, number>();
  for (const q of qs) perDim.set(q.dimensionId, (perDim.get(q.dimensionId) ?? 0) + 1);
  const cfg = (target.configJson ?? {}) as Record<string, unknown>;
  const minQ = Number(cfg.min_q_per_dim ?? 0);
  const kurang = DIMS.filter((d) => (perDim.get(dimId[d.code]!) ?? 0) < minQ);
  console.log(
    `\nRingkasan: ${qs.length} soal · ${DIMS.map((d) => `${d.code}=${perDim.get(dimId[d.code]!) ?? 0}`).join(" ")}`,
  );
  if (kurang.length) console.log(`⚠️ min_q_per_dim=${minQ} belum terpenuhi: ${kurang.map((d) => d.code).join(", ")}`);
  else console.log(`✓ min_q_per_dim=${minQ} terpenuhi di semua dimensi.`);

  if (publish) {
    if (kurang.length) throw new Error("Tidak bisa publish: min soal belum terpenuhi.");
    await db
      .update(schema.assessmentVersions)
      .set({ status: "archived" })
      .where(eq(schema.assessmentVersions.assessmentId, assess.id));
    await db
      .update(schema.assessmentVersions)
      .set({ status: "live", publishedAt: new Date() })
      .where(eq(schema.assessmentVersions.id, target.id));
    console.log(`🚀 DISCOVER v${target.versionNumber} sekarang LIVE.`);
  } else {
    console.log(
      "\nBelum dirilis. Rilis lewat admin (Editor Soal & Versi → Verifikasi & Rilis) atau ulangi dengan --publish.",
    );
  }
}

if (import.meta.main) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("gagal:", e?.message ?? e);
      process.exit(1);
    });
}
