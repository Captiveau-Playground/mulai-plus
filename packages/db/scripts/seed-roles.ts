// Seed katalog ROLE & PERMISSION (idempoten).
//
// Kenapa ada: `package.json` sudah lama menunjuk `bun run scripts/seed-roles.ts`
// tetapi filenya tidak pernah ada, sehingga environment baru (staging/produksi)
// tidak punya daftar role sama sekali — termasuk role B2B `school_admin` dan
// `school_viewer`. Tanpa baris di tabel `role`, better-auth tidak mengenal role
// tersebut dan UI admin tidak bisa menampilkannya.
//
// Sifat: TIDAK menimpa role yang sudah ada (aman dijalankan berulang di DB yang
// sudah dipakai). Untuk menyinkronkan permission gunakan `--force-permissions`.
//
// Pemakaian:
//   cd packages/db
//   bun scripts/seed-roles.ts                      # isi yang belum ada
//   bun scripts/seed-roles.ts --force-permissions  # timpa permission role bawaan

import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { db, eq } from "../src";
import { permission, role } from "../src/schema/auth";

dotenv.config({ path: "../../apps/server/.env" });

const FORCE = process.argv.includes("--force-permissions");

interface RoleSeed {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

/**
 * Konvensi permission di repo ini ada dua dan keduanya sah:
 *  • `action:resource`  → `access:admin_dashboard`
 *  • `resource.action`  → `participant.read`
 * Nilai di bawah mengikuti yang sudah dipakai masing-masing role di DB.
 */
export const ROLE_SEED: RoleSeed[] = [
  {
    id: "admin",
    name: "Admin",
    description: "Administrator platform MULAI+ (akses penuh panel admin)",
    permissions: ["access:admin_dashboard", "role.create"],
  },
  {
    id: "program_manager",
    name: "Program Manager",
    description: "Mengelola program, batch, mentor, dan laporan",
    permissions: [
      "access:program_manager_dashboard",
      "analytics.read",
      "application.approve",
      "application.read",
      "application.reject",
      "attachment.create",
      "attachment.delete",
      "attachment.read",
      "attachment.update",
      "attendance.read",
      "attendance.update",
      "batch.create",
      "batch.delete",
      "batch.read",
      "batch.update",
      "participant.read",
      "participant.update",
      "program.create",
      "program.delete",
      "program.read",
      "program.update",
      "session.create",
      "session.delete",
      "session.read",
      "session.update",
      "testimonial.create",
      "testimonial.delete",
      "testimonial.read",
      "testimonial.update",
      "user.read",
    ],
  },
  {
    id: "mentor",
    name: "Mentor",
    description: "Mentor program (absensi & sesi)",
    permissions: ["access:mentor_dashboard", "user.create"],
  },
  {
    id: "student",
    name: "Student",
    description: "Siswa/peserta program dan tes minat bakat",
    permissions: ["access:student_dashboard", "user.create", "user.read", "user.update"],
  },
  {
    id: "school_admin",
    name: "Admin Sekolah",
    description: "PIC sekolah mitra B2B — kelola kelas, peserta, jadwal, lalu lihat hasil/laporan",
    permissions: [
      "access:school_dashboard",
      "participant.read",
      "participant.update",
      "schedule.create",
      "schedule.read",
      "schedule.update",
      "schedule.delete",
      "report.read",
      "user.read",
    ],
  },
  {
    id: "school_viewer",
    name: "Guru BK",
    description: "Guru BK / wakil kepala — hanya melihat hasil & laporan sekolah",
    permissions: ["access:school_dashboard", "report.read", "user.read"],
  },
];

/** Katalog permission (untuk halaman pengaturan role di admin). */
export const PERMISSION_SEED: Array<{ id: string; description: string }> = [
  { id: "access:admin_dashboard", description: "Masuk area admin MULAI+" },
  { id: "access:program_manager_dashboard", description: "Masuk area program manager" },
  { id: "access:mentor_dashboard", description: "Masuk area mentor" },
  { id: "access:student_dashboard", description: "Masuk area siswa" },
  { id: "access:school_dashboard", description: "Masuk area sekolah (B2B)" },
  { id: "role.create", description: "Membuat role baru" },
  { id: "user.create", description: "Membuat pengguna" },
  { id: "user.read", description: "Melihat pengguna" },
  { id: "user.update", description: "Mengubah pengguna" },
  { id: "participant.read", description: "Melihat peserta" },
  { id: "participant.update", description: "Mengubah peserta" },
  { id: "schedule.create", description: "Membuat jadwal" },
  { id: "schedule.read", description: "Melihat jadwal" },
  { id: "schedule.update", description: "Mengubah jadwal" },
  { id: "schedule.delete", description: "Menghapus jadwal" },
  { id: "report.read", description: "Melihat laporan/hasil" },
  { id: "analytics.read", description: "Melihat analitik" },
];

async function main() {
  let created = 0;
  let updated = 0;

  for (const p of PERMISSION_SEED) {
    await db.insert(permission).values({ id: p.id, description: p.description }).onConflictDoNothing();
  }
  console.log(`permission: ${PERMISSION_SEED.length} entri dipastikan ada`);

  for (const r of ROLE_SEED) {
    const [existing] = await db.select().from(role).where(eq(role.id, r.id));
    if (!existing) {
      await db.insert(role).values({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: r.permissions,
      });
      created++;
      console.log(`  + role dibuat: ${r.id} (${r.name})`);
      continue;
    }
    if (FORCE) {
      await db
        .update(role)
        .set({ name: r.name, description: r.description, permissions: r.permissions })
        .where(eq(role.id, r.id));
      updated++;
      console.log(`  ~ role disinkronkan: ${r.id}`);
    } else if (existing.name !== r.name) {
      console.log(`  = role ada (dibiarkan): ${r.id} — nama DB "${existing.name}"`);
    }
  }

  const all = await db.select().from(role);
  console.log(
    `\nTotal role di DB: ${all.length} → ${all
      .map((x) => x.id)
      .sort()
      .join(", ")}`,
  );
  const missing = ROLE_SEED.filter((r) => !all.some((x) => x.id === r.id)).map((r) => r.id);
  if (missing.length) {
    console.error(`\n❌ Role wajib belum ada: ${missing.join(", ")}`);
    process.exit(1);
  }
  console.log(`\n✓ selesai (dibuat: ${created}, disinkronkan: ${updated}${FORCE ? "" : ", mode aman"})`);
  void randomUUID;
  process.exit(0);
}

main().catch((e) => {
  console.error("seed-roles gagal:", e);
  process.exit(1);
});
