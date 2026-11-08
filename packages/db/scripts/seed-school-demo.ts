// Seed AKUN DEMO sekolah (B2B) untuk uji manual: admin sekolah + guru BK,
// lengkap dengan sekolah, 2 kelas (2 angkatan), roster, dan sebagian hasil tes
// supaya halaman hasil/insight/export bisa langsung dicoba.
//
// Idempoten: aman dijalankan berulang (user yang sudah ada tidak dibuat ulang,
// baris data hanya ditambah bila belum ada).
//
// Prasyarat: server API jalan di http://localhost:3000 (untuk sign-up password).
//
// Pemakaian:
//   cd packages/db
//   bun scripts/seed-school-demo.ts

import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { and, db, eq } from "../src";
import { assessmentOrgMembers, assessmentOrgs } from "../src/schema/assessment";
import { user } from "../src/schema/auth";
import { tmbAssessmentResults, tmbBatches, tmbBatchStudents, tmbRecommendations, tmbSchools } from "../src/schema/tmb";

dotenv.config({ path: "../../apps/server/.env" });

const API = process.env.APP_API_URL || "http://localhost:3000";
const ORG_NAME = process.env.DEMO_SCHOOL_NAME || "SMA Demo MULAI+";
const PASSWORD = process.env.DEMO_SCHOOL_PASSWORD || "DemoSekolah!2026";
// Satu role sekolah: cukup satu akun demo.
const ACCOUNTS = [
  {
    email: process.env.DEMO_SCHOOL_ADMIN_EMAIL || "sekolah@demo.mulaiplus.id",
    name: "Akun Sekolah Demo",
    role: "school_admin" as const,
  },
];
/** Akun demo lama (saat masih ada role guru BK terpisah) yang perlu dibersihkan. */
const LEGACY_ACCOUNTS = [process.env.DEMO_SCHOOL_BK_EMAIL || "bk@demo.mulaiplus.id"];

const HOLLAND = ["R", "I", "A", "S", "E", "C"] as const;
const MAJORS = ["Teknik Informatika", "Psikologi", "Akuntansi", "Kedokteran", "Hukum", "Manajemen"];
const CAREERS = ["Data Analyst", "Guru BK", "Akuntan", "Dokter", "Konsultan Hukum", "HR Officer"];
const NAMES = [
  "Ayu Lestari",
  "Bagas Pratama",
  "Citra Dewi",
  "Dimas Saputra",
  "Eka Wulandari",
  "Fajar Nugroho",
  "Gita Maharani",
  "Hendra Wijaya",
];

/** Buat user via API (password di-hash oleh better-auth). */
async function ensureUser(email: string, name: string): Promise<string> {
  const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (existing.length) return existing[0].id;

  const res = await fetch(`${API}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3001" },
    body: JSON.stringify({ name, email, password: PASSWORD }),
  });
  const raw = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(raw);
  } catch {
    /* bukan JSON */
  }
  const id = json?.user?.id;
  if (!id) throw new Error(`gagal membuat user ${email}: ${raw.slice(0, 200)}`);
  console.log(`  + akun dibuat: ${email}`);
  return id;
}

async function main() {
  console.log(`Seeding demo sekolah "${ORG_NAME}" (${API})`);

  // 1) sekolah legacy (tmb_schools) — dipakai portal & roster
  let [school] = await db.select().from(tmbSchools).where(eq(tmbSchools.name, ORG_NAME));
  if (!school) {
    const id = randomUUID();
    await db.insert(tmbSchools).values({
      id,
      name: ORG_NAME,
      city: "Lamongan",
      address: "Jl. Pendidikan No. 1",
      status: "aktif",
      notes: "Data demo B2B (seed-school-demo)",
    });
    [school] = await db.select().from(tmbSchools).where(eq(tmbSchools.id, id));
    console.log("  + sekolah dibuat");
  }

  // 2) organisasi + anggota
  let [org] = await db.select().from(assessmentOrgs).where(eq(assessmentOrgs.name, ORG_NAME));
  if (!org) {
    const id = randomUUID();
    await db.insert(assessmentOrgs).values({
      id,
      name: ORG_NAME,
      type: "sekolah",
      city: "Lamongan",
      status: "aktif",
      schoolId: school.id,
      picName: "Admin Sekolah Demo",
      picPhone: "081200000001",
      picEmail: ACCOUNTS[0].email,
    });
    [org] = await db.select().from(assessmentOrgs).where(eq(assessmentOrgs.id, id));
    console.log("  + organisasi dibuat");
  } else if (!org.schoolId) {
    await db.update(assessmentOrgs).set({ schoolId: school.id }).where(eq(assessmentOrgs.id, org.id));
  }

  for (const acc of ACCOUNTS) {
    const userId = await ensureUser(acc.email, acc.name);
    await db.update(user).set({ role: acc.role }).where(eq(user.id, userId));
    const [member] = await db
      .select()
      .from(assessmentOrgMembers)
      .where(and(eq(assessmentOrgMembers.orgId, org.id), eq(assessmentOrgMembers.userId, userId)));
    if (!member) {
      await db.insert(assessmentOrgMembers).values({
        id: randomUUID(),
        orgId: org.id,
        userId,
        role: acc.role,
        status: "aktif",
      });
      console.log(`  + anggota: ${acc.email} (${acc.role})`);
    } else if (member.role !== acc.role || member.status !== "aktif") {
      await db
        .update(assessmentOrgMembers)
        .set({ role: acc.role, status: "aktif" })
        .where(eq(assessmentOrgMembers.id, member.id));
    }
  }

  // 3) kelas per angkatan + roster + sebagian hasil
  const plan = [
    { year: 2026, className: "XII IPA 1", major: "IPA", done: 6, schedule: true },
    { year: 2025, className: "XII IPS 1", major: "IPS", done: 4, schedule: false },
  ];

  for (const p of plan) {
    const batchName = `${p.className} (${p.year})`;
    let [batch] = await db
      .select()
      .from(tmbBatches)
      .where(and(eq(tmbBatches.schoolId, school.id), eq(tmbBatches.name, batchName)));
    if (!batch) {
      const id = randomUUID();
      const start = p.schedule ? new Date(Date.now() - 3 * 86400_000) : null;
      const end = p.schedule ? new Date(Date.now() + 14 * 86400_000) : null;
      await db.insert(tmbBatches).values({
        id,
        schoolId: school.id,
        name: batchName,
        className: p.className,
        major: p.major,
        graduationYear: p.year,
        inviteCode: `DEMO${String(p.year).slice(-2)}${p.major === "IPA" ? "A" : "S"}`,
        scheduleMode: p.schedule ? "scheduled" : "anytime",
        windowStart: start,
        windowEnd: end,
      });
      [batch] = await db.select().from(tmbBatches).where(eq(tmbBatches.id, id));
      console.log(`  + kelas: ${batchName}`);
    }

    for (let i = 0; i < NAMES.length; i++) {
      const name = NAMES[i];
      const email = `siswa${i + 1}.${p.year}@demo.mulaiplus.id`;
      const [roster] = await db
        .select()
        .from(tmbBatchStudents)
        .where(and(eq(tmbBatchStudents.batchId, batch.id), eq(tmbBatchStudents.email, email)));
      if (roster) continue;

      const done = i < p.done;
      const rosterId = randomUUID();
      let resultId: string | null = null;

      if (done) {
        // hasil minat (Holland) + kemampuan + rekomendasi
        const scores = Object.fromEntries(HOLLAND.map((h, idx) => [h, Math.max(0, 5 - ((idx + i) % 5))]));
        const top = [...HOLLAND].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
        const code = `${top[0]}${top[1]}${top[2]}`;
        resultId = randomUUID();
        await db.insert(tmbAssessmentResults).values({
          id: resultId,
          userId: `demo-${p.year}-${i + 1}`,
          hollandCode: code,
          hollandScores: scores,
          abilityScores: {
            scores: {
              verbal: { correct: 3 + (i % 2), total: 5 },
              numerical: { correct: 2 + (i % 3), total: 5 },
              logical: { correct: 3 + ((i + 1) % 2), total: 5 },
              spatial: { correct: 2 + (i % 2), total: 5 },
              clerical: { correct: 4 - (i % 2), total: 5 },
            },
          },
          confidenceScore: String(60 + ((i * 7) % 35)),
          differentiation: i % 4 === 0 ? "flat" : "clear",
        });
        const major = MAJORS[(i + p.year) % MAJORS.length];
        const career = CAREERS[(i + p.year) % CAREERS.length];
        await db.insert(tmbRecommendations).values([
          { id: randomUUID(), resultId, type: "major", rank: 1, itemName: major },
          { id: randomUUID(), resultId, type: "major", rank: 2, itemName: MAJORS[(i + 2) % MAJORS.length] },
          { id: randomUUID(), resultId, type: "career", rank: 3, itemName: career },
        ]);
      }

      await db.insert(tmbBatchStudents).values({
        id: rosterId,
        batchId: batch.id,
        name,
        email,
        nis: `${p.year}${String(i + 1).padStart(3, "0")}`,
        status: done ? "completed" : i % 3 === 0 ? "in_progress" : "invited",
        resultId,
      });
    }
    console.log(`  + roster ${batchName}: ${NAMES.length} siswa (${p.done} selesai)`);
  }

  // bersihkan akun demo lama (saat masih ada role guru BK terpisah)
  for (const legacy of LEGACY_ACCOUNTS) {
    const [old] = await db.select({ id: user.id }).from(user).where(eq(user.email, legacy));
    if (old) {
      await db.delete(assessmentOrgMembers).where(eq(assessmentOrgMembers.userId, old.id));
      await db.delete(user).where(eq(user.id, old.id));
      console.log(`  - akun demo lama dihapus: ${legacy}`);
    }
  }

  console.log(`
✓ Selesai. Login di http://localhost:3001/login (tab "Sekolah"):

  Akun sekolah : ${ACCOUNTS[0].email}  /  ${PASSWORD}

  Portal: /sekolah  ·  Kelas: /sekolah/kelas  ·  Tim: /sekolah/tim
  Sekolah: ${ORG_NAME} (aktif, 2 kelas, 2 angkatan)
`);
  process.exit(0);
}

main().catch((e) => {
  console.error("seed-school-demo gagal:", e);
  process.exit(1);
});
