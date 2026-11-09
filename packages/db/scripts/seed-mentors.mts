/**
 * Seed data mentor "as is" dari landing page lama (nama, foto, kampus) + detail DUMMY.
 *
 *   cd packages/db
 *   bun --env-file=../../apps/server/.env scripts/seed-mentors.mts --dry
 *   bun --env-file=../../apps/server/.env scripts/seed-mentors.mts --yes
 *
 * Sifat:
 * - IDEMPOTENT: user dicocokkan lewat email `mentor.<slug>@mulaiplus.test`, detail di-upsert.
 * - Kampus & (bila ketemu) ID PDDikti diisi otomatis dari nama kampus.
 * - `is_public = true` + `approved_at` diisi supaya langsung tampil di /mentors (data demo).
 * - Opsional menautkan ke batch program agar "Program yang diampu" terisi.
 * - `--reset` menghapus 10 user demo ini (cascade ke detail & penugasan batch).
 */
import dotenv from "dotenv";

dotenv.config({ path: "../../apps/server/.env" });
const { db } = await import("../src");
const { eq, ilike, inArray } = await import("drizzle-orm");
const schema = await import("../src/schema");

const args = new Set(process.argv.slice(2));
const has = (f: string) => args.has(f);
const DRY = has("--dry");
const YES = has("--yes");
const RESET = has("--reset");
const LINK_BATCH = !has("--no-batch");
const id = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`.slice(0, 24);

/** Data as-is dari landing page (nama, foto, kampus) + detail dummy yang masuk akal. */
const MENTORS = [
  {
    name: "Nimitta",
    campus: "Universitas Brawijaya",
    image: "/mentors/nimitta.webp",
    jurusan: "Pendidikan Dokter",
    tahunMasuk: 2021,
    pekerjaan: "Asisten Penelitian di FK Universitas Brawijaya",
    pencapaian: "Juara 2 Olimpiade Sains Nasional bidang Biologi 2020\nAsisten praktikum Anatomi 2023",
    social: { instagram: "nimitta.study", linkedin: "nimitta" },
  },
  {
    name: "Andhani",
    campus: "Universitas Brawijaya",
    image: "/mentors/andani.webp",
    jurusan: "Psikologi",
    tahunMasuk: 2020,
    pekerjaan: "HR Intern di perusahaan FMCG",
    pencapaian: "Fasilitator 20+ sesi konseling sebaya\nDelegasi konferensi psikologi nasional 2023",
    social: { instagram: "andhani.psy" },
  },
  {
    name: "Billy",
    campus: "Universitas Airlangga",
    image: "/mentors/billy.webp",
    jurusan: "Kedokteran Gigi",
    tahunMasuk: 2021,
    pekerjaan: "Koas di RS Pendidikan Universitas Airlangga",
    pencapaian: "Juara 1 lomba poster ilmiah kedokteran gigi 2023\nPenerima beasiswa prestasi akademik",
    social: { instagram: "billy.dental", tiktok: "billy.dental" },
  },
  {
    name: "Salma",
    campus: "Universitas Gadjah Mada",
    image: "/mentors/salma.webp",
    jurusan: "Ilmu Komunikasi",
    tahunMasuk: 2021,
    pekerjaan: "Social Media Specialist (freelance)",
    pencapaian: "Ketua divisi media acara nasional 2023\nMengelola akun kampus dengan 50k+ pengikut",
    social: { instagram: "salma.comm", linkedin: "salma-comm" },
  },
  {
    name: "Nailir",
    campus: "Universitas Negeri Semarang",
    image: "/mentors/nelly.webp",
    jurusan: "Pendidikan Bahasa Inggris",
    tahunMasuk: 2020,
    pekerjaan: "Guru Bahasa Inggris SMP (magang)",
    pencapaian: "Peserta pertukaran pelajar SEA-Teacher 2023\nJuara 3 lomba debat bahasa Inggris provinsi",
    social: { instagram: "nailir.teach" },
  },
  {
    name: "Hariz",
    campus: "Politeknik Elektronika Negeri Surabaya",
    campusQuery: "Politeknik Elektronika Negeri Surabaya",
    image: "/mentors/haris.webp",
    jurusan: "Teknik Informatika",
    tahunMasuk: 2020,
    pekerjaan: "Software Engineer Intern",
    pencapaian: "Finalis hackathon nasional 2023\nKontributor proyek open source IoT kampus",
    social: { instagram: "hariz.dev", linkedin: "hariz-dev", website: "github.com/hariz" },
  },
  {
    name: "Febby",
    campus: "UPN Veteran Jawa Timur",
    campusQuery: "Pembangunan Nasional Veteran Jawa Timur",
    image: "/mentors/febby.webp",
    jurusan: "Akuntansi",
    tahunMasuk: 2021,
    pekerjaan: "Audit Intern di KAP",
    pencapaian: "Juara 1 lomba akuntansi nasional 2023\nTutor akuntansi untuk 100+ mahasiswa",
    social: { instagram: "febby.acc", linkedin: "febby" },
  },
  {
    name: "Addina",
    campus: "Universitas Airlangga",
    image: "/mentors/addina.webp",
    jurusan: "Farmasi",
    tahunMasuk: 2020,
    pekerjaan: "Apoteker pendamping (magang)",
    pencapaian: "Asisten laboratorium Farmasi 2022\nPenerima hibah riset mahasiswa 2023",
    social: { instagram: "addina.pharm" },
  },
  {
    name: "Dita",
    campus: "UPN Veteran Jawa Timur",
    campusQuery: "Pembangunan Nasional Veteran Jawa Timur",
    image: "/mentors/dita.webp",
    jurusan: "Teknik Industri",
    tahunMasuk: 2021,
    pekerjaan: "Supply Chain Intern",
    pencapaian: "Juara 2 lomba perancangan sistem kerja 2023\nKoordinator asisten dosen 2023",
    social: { instagram: "dita.eng", linkedin: "dita-eng" },
  },
  {
    name: "Naily",
    campus: "Universitas Gadjah Mada",
    image: "/mentors/naily.webp",
    jurusan: "Hukum",
    tahunMasuk: 2020,
    pekerjaan: "Legal Intern di firma hukum",
    pencapaian: "Delegasi moot court nasional 2023\nAsisten peneliti hukum tata negara 2022",
    social: { instagram: "naily.law", linkedin: "naily-law" },
  },
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
const emailOf = (name: string) => `mentor.${slug(name)}@mulaiplus.test`;

async function main() {
  const emails = MENTORS.map((m) => emailOf(m.name));

  if (RESET) {
    if (DRY) {
      console.log(`(dry) akan menghapus ${emails.length} akun mentor demo`);
      return;
    }
    await db.delete(schema.user).where(inArray(schema.user.email, emails));
    console.log(`dihapus: ${emails.length} akun mentor demo`);
    return;
  }

  // batch tujuan (opsional): pakai 2 batch program yang ada
  let batchIds: string[] = [];
  if (LINK_BATCH) {
    const batches = await db.select({ id: schema.programBatch.id }).from(schema.programBatch).limit(2);
    batchIds = batches.map((b) => b.id);
  }

  let created = 0;
  let updated = 0;
  for (const [i, m] of MENTORS.entries()) {
    const email = emailOf(m.name);
    const existing = await db.query.user.findFirst({ where: eq(schema.user.email, email) });

    // ID PDDikti best-effort untuk kampus
    const uniQuery = (m as any).campusQuery ?? m.campus;
    const uni =
      (await db.query.universities.findFirst({
        where: ilike(schema.universities.name, `%${uniQuery}%`),
        columns: { idSp: true, name: true },
      })) ??
      (await db.query.universities.findFirst({
        where: ilike(schema.universities.shortName, `%${m.campus}%`),
        columns: { idSp: true, name: true },
      }));
    // ID prodi best-effort (nama prodi persis)
    const prodi = await db.query.studyPrograms.findFirst({
      where: ilike(schema.studyPrograms.name, m.jurusan),
      columns: { idSms: true, name: true },
    });

    const userId = existing?.id ?? id("mt");
    if (DRY) {
      console.log(
        `${i + 1}. ${m.name} · ${m.campus}${uni ? " (kampusId ✔)" : ""} · ${m.jurusan}${prodi ? " (jurusanId ✔)" : ""}`,
      );
      continue;
    }

    if (existing) {
      await db
        .update(schema.user)
        .set({ name: m.name, image: m.image, role: "mentor" })
        .where(eq(schema.user.id, userId));
      updated++;
    } else {
      await db.insert(schema.user).values({
        id: userId,
        name: m.name,
        email,
        emailVerified: true,
        image: m.image,
        role: "mentor",
      });
      created++;
    }

    const detail = await db.query.mentorDetail.findFirst({ where: eq(schema.mentorDetail.userId, userId) });
    const payload = {
      displayName: m.name,
      slug: slug(m.name),
      jurusan: prodi?.name ?? m.jurusan,
      jurusanId: prodi?.idSms ?? null,
      kampus: uni?.name ?? m.campus,
      kampusId: uni?.idSp ?? null,
      tahunMasuk: m.tahunMasuk,
      bidangPekerjaan: m.pekerjaan,
      bergabungPada: new Date(Date.UTC(2024, (i % 12) + 1, 10 + i)),
      socialMedia: m.social,
      pencapaian: m.pencapaian,
      photoUrl: m.image,
      isPublic: true,
      approvedAt: new Date(),
      approvedBy: userId,
    };
    if (detail) {
      await db.update(schema.mentorDetail).set(payload).where(eq(schema.mentorDetail.userId, userId));
    } else {
      await db.insert(schema.mentorDetail).values({ id: id("md"), userId, ...payload });
    }

    if (batchIds.length) {
      const batchId = batchIds[i % batchIds.length];
      if (batchId) {
        const link = await db.query.programBatchMentor.findFirst({
          where: (t: any, { and, eq: eqFn }: any) => and(eqFn(t.batchId, batchId), eqFn(t.userId, userId)),
        });
        if (!link) await db.insert(schema.programBatchMentor).values({ batchId, userId });
      }
    }
  }

  if (DRY) {
    console.log(`\n(dry) ${MENTORS.length} mentor akan di-seed. Jalankan dengan --yes.`);
    return;
  }
  console.log(
    `selesai · user baru ${created} · user diperbarui ${updated} · batch ditautkan: ${batchIds.length ? "ya" : "tidak"}`,
  );
}

if (process.env.DATABASE_URL && !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) && !YES && !DRY) {
  console.error("✗ DATABASE_URL bukan lokal — tambahkan --yes (atau --dry untuk melihat rencana).");
  process.exit(1);
}

await main();
process.exit(0);
