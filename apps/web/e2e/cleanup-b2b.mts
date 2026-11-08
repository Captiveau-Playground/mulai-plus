// Teardown global e2e B2B — menyapu artefak uji yang lolos dari `afterAll` spec.
//
// Kenapa perlu: setiap spec sudah membersihkan datanya sendiri, tapi ada artefak
// yang tidak bisa dilacak dari dalam spec (mis. sekolah legacy yang dibuat
// otomatis saat approval, laporan yatim karena org sudah dihapus, sesi engine
// dengan studentId sintetis). Script ini jaring pengaman — aman dijalankan
// berulang (idempoten) dan HANYA menyentuh data bertanda uji.
//
// Pemakaian:
//   cd apps/web && bun run e2e:cleanup            # dry-run (hanya hitung)
//   cd apps/web && bun run e2e:cleanup --apply    # hapus
import { Client } from "pg";

const url = process.env.DATABASE_URL ?? "";
if (!/staging/i.test(url)) {
  console.error("DITOLAK: script ini hanya boleh jalan di database staging (nama DB harus mengandung 'staging').");
  process.exit(1);
}
const APPLY = process.argv.includes("--apply");
const SHARED_ADMIN = process.env.E2E_ADMIN_EMAIL || "e2e-admin@test.local";

const client = new Client({ connectionString: url });
await client.connect();
const q = (sql: string, params: unknown[] = []) => client.query(sql, params);

/** Penanda data uji — dibuat sekonservatif mungkin. */
const MARK = {
  email: "%@test.local",
  autoSchoolNotes: "Dibuat otomatis dari pendaftaran B2B%",
  syntheticStudent: "e2e-%",
  assessmentCode: "E2E%",
};

type Step = { label: string; countSql: string; deleteSql: string; params?: unknown[] };

const steps: Step[] = [
  {
    label: "laporan insight yatim (org sudah dihapus)",
    countSql: `select count(*)::int n from assessment_cohort_reports r
               where not exists (select 1 from assessment_orgs o where o.id = r.org_id)`,
    deleteSql: `delete from assessment_cohort_reports r
                where not exists (select 1 from assessment_orgs o where o.id = r.org_id)`,
  },
  {
    label: "organisasi uji (semua anggotanya akun *@test.local, atau tanpa anggota)",
    countSql: `select count(*)::int n from assessment_orgs o
               where (not exists (select 1 from assessment_org_members m where m.org_id = o.id))
                  or (not exists (
                        select 1 from assessment_org_members m
                        join "user" u on u.id = m.user_id
                        where m.org_id = o.id and u.email not like $1))`,
    deleteSql: `delete from assessment_orgs o
                where (not exists (select 1 from assessment_org_members m where m.org_id = o.id))
                   or (not exists (
                        select 1 from assessment_org_members m
                        join "user" u on u.id = m.user_id
                        where m.org_id = o.id and u.email not like $1))`,
    params: [MARK.email],
  },
  {
    label: "kelas uji di sekolah otomatis (tanpa org, roster kosong/akun uji)",
    countSql: `select count(*)::int n from tmb_batches b
               join tmb_schools s on s.id = b.school_id
               where s.notes like $1
                 and not exists (select 1 from assessment_orgs o where o.school_id = s.id)
                 and not exists (
                   select 1 from tmb_batch_students st
                   where st.batch_id = b.id and coalesce(st.email, '') not like $2)`,
    deleteSql: `delete from tmb_batches b
                using tmb_schools s
                where s.id = b.school_id
                  and s.notes like $1
                  and not exists (select 1 from assessment_orgs o where o.school_id = s.id)
                  and not exists (
                    select 1 from tmb_batch_students st
                    where st.batch_id = b.id and coalesce(st.email, '') not like $2)`,
    params: [MARK.autoSchoolNotes, MARK.email],
  },
  {
    label: "sekolah legacy buatan approval e2e (tanpa batch & tanpa org)",
    countSql: `select count(*)::int n from tmb_schools s
               where s.notes like $1
                 and not exists (select 1 from tmb_batches b where b.school_id = s.id)
                 and not exists (select 1 from assessment_orgs o where o.school_id = s.id)`,
    deleteSql: `delete from tmb_schools s
                where s.notes like $1
                  and not exists (select 1 from tmb_batches b where b.school_id = s.id)
                  and not exists (select 1 from assessment_orgs o where o.school_id = s.id)`,
    params: [MARK.autoSchoolNotes],
  },
  {
    label: "sesi engine dengan studentId sintetis (+jawaban, skor, hasil via cascade)",
    countSql: "select count(*)::int n from assessment_sessions where student_id like $1",
    deleteSql: "delete from assessment_sessions where student_id like $1",
    params: [MARK.syntheticStudent],
  },
  {
    label: "assessment uji (E2E*) + versi/soal/sesi via cascade",
    countSql: "select count(*)::int n from assessments where code like $1",
    deleteSql: "delete from assessments where code like $1",
    params: [MARK.assessmentCode],
  },
  {
    label: "akun uji *@test.local (kecuali akun admin bersama)",
    countSql: `select count(*)::int n from "user" u
               where u.email like $1 and u.email <> $2
                 and not exists (select 1 from assessment_org_members m where m.user_id = u.id)`,
    deleteSql: `delete from "user" u
                where u.email like $1 and u.email <> $2
                  and not exists (select 1 from assessment_org_members m where m.user_id = u.id)`,
    params: [MARK.email, SHARED_ADMIN],
  },
];

console.log(`Mode: ${APPLY ? "APPLY (hapus)" : "DRY-RUN (hitung saja)"}\n`);
let total = 0;
for (const step of steps) {
  const { rows } = await q(step.countSql, step.params);
  const n = rows[0]?.n ?? 0;
  total += n;
  if (APPLY && n > 0) await q(step.deleteSql, step.params);
  console.log(`  ${APPLY ? "hapus" : "akan hapus"} ${String(n).padStart(4)}  ${step.label}`);
}

const after = await q(
  `select
  (select count(*)::int from "user" where email like $1 and email <> $2) users,
  (select count(*)::int from tmb_schools where notes like $3) auto_schools,
  (select count(*)::int from assessment_cohort_reports) reports,
  (select count(*)::int from assessment_sessions where student_id like $4) sessions,
  (select count(*)::int from assessments where code like $5) assessments`,
  [MARK.email, SHARED_ADMIN, MARK.autoSchoolNotes, MARK.syntheticStudent, MARK.assessmentCode],
);

console.log(`\nTotal ${APPLY ? "dihapus" : "kandidat"}: ${total}`);
console.log(`Sisa setelah ${APPLY ? "cleanup" : "dry-run"}:`, after.rows[0]);
if (!APPLY) console.log("\nJalankan dengan --apply untuk benar-benar menghapus.");
await client.end();
