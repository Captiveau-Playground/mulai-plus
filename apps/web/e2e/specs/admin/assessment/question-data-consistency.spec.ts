// E2E — konsistensi DATA SOAL: admin ↔ siswa.
//
// Audit menemukan dua masalah nyata:
//  1. TALENT (tes bakat) memuat soal `likert` (item MINAT milik DISCOVER) →
//     dimensi tercampur (mis. dimensi spasial berisi soal minat).
//  2. Opsi bermode `emoji_option` tanpa `icon` → siswa hanya melihat label teks,
//     tanpa skala emoji animasi.
// Test ini mengunci kondisi data + perilaku render.
import { expect, test } from "@playwright/test";
import { rpc } from "../../../helpers/api";
import { q } from "../../../helpers/db";

type Row = { code: string; tipe: string; n: number };

async function liveVersions() {
  return q<{ code: string; version_id: string }>(
    `select a.code, v.id as version_id
       from assessments a
       join assessment_versions v on v.assessment_id = a.id
      where a.code in ('TALENT','DISCOVER') and v.status::text = 'live'`,
  );
}

test.describe("Soal · konsistensi admin ↔ siswa", () => {
  test("D1: TALENT (bakat) tidak memuat soal minat/likert, DISCOVER tetap likert", async () => {
    const vers = await liveVersions();
    const talent = vers.find((v) => v.code === "TALENT");
    const discover = vers.find((v) => v.code === "DISCOVER");
    expect(talent, "versi TALENT live harus ada").toBeTruthy();
    expect(discover, "versi DISCOVER live harus ada").toBeTruthy();

    const rows = await q<Row>(
      `select a.code, q.question_type::text as tipe, count(*)::int as n
         from questions q
         join assessment_versions v on v.id = q.version_id
         join assessments a on a.id = v.assessment_id
        where a.code in ('TALENT','DISCOVER') and v.status::text = 'live' and q.is_active
        group by 1,2`,
    );
    const talentLikert = rows.find((r) => r.code === "TALENT" && r.tipe === "likert");
    expect(talentLikert?.n ?? 0, "TALENT tidak boleh punya soal likert (item minat)").toBe(0);

    const discoverLikert = rows.find((r) => r.code === "DISCOVER" && r.tipe === "likert");
    expect(discoverLikert?.n ?? 0, "DISCOVER tetap memakai likert").toBeGreaterThan(0);

    // TALENT harus tetap punya soal kemampuan
    const talentAbility = rows
      .filter((r) => r.code === "TALENT" && (r.tipe === "multiple_choice" || r.tipe === "text_input"))
      .reduce((a, r) => a + r.n, 0);
    expect(talentAbility, "TALENT harus punya soal pilihan ganda/isian").toBeGreaterThan(0);
  });

  test("D2: setiap opsi bermode emoji punya ikon (likert angka/teks tidak diwajibkan)", async () => {
    const bad = await q<{ code: string; dim: string; n: number }>(
      `select a.code, d.code as dim, count(*)::int as n
         from question_options o
         join questions q on q.id = o.question_id
         join assessment_dimensions d on d.id = q.dimension_id
         join assessment_versions v on v.id = q.version_id
         join assessments a on a.id = v.assessment_id
        where a.code in ('TALENT','DISCOVER') and v.status::text = 'live' and q.is_active
          and q.presentation_mode = 'emoji_option'
          and (o.icon is null or btrim(o.icon) = '')
        group by 1,2`,
    );
    expect(bad, `opsi emoji tanpa ikon: ${JSON.stringify(bad)}`).toHaveLength(0);
  });

  test("D3: payload siswa memuat ikon untuk soal skala (bukan hanya label)", async () => {
    // TALENT & DISCOVER tidak butuh login untuk `config` (public)
    for (const code of ["DISCOVER", "TALENT"]) {
      const cfg = await rpc<any>("discover/config", { code });
      expect(cfg?.questions?.length, `config ${code} harus berisi soal`).toBeGreaterThan(0);

      const skala = (cfg.questions as any[]).filter(
        (x) => x.questionType === "likert" || x.presentationMode === "emoji_option",
      );
      if (!skala.length) continue; // TALENT boleh tanpa skala (setelah dibersihkan)
      for (const s of skala.slice(0, 5)) {
        const icons = (s.opts ?? []).map((o: any) => o.icon).filter(Boolean);
        expect(icons.length, `soal ${code} ${s.id} harus punya ikon opsi`).toBeGreaterThan(0);
      }
    }
  });

  test("D5: semua ikon opsi adalah emoji tunggal (bisa dianimasikan)", async () => {
    const rows = await q<{ code: string; icon: string }>(
      `select distinct a.code, o.icon
         from question_options o
         join questions q on q.id = o.question_id
         join assessment_versions v on v.id = q.version_id
         join assessments a on a.id = v.assessment_id
        where a.code in ('TALENT','DISCOVER') and v.status::text = 'live' and q.is_active
          and o.icon is not null and btrim(o.icon) <> ''`,
    );
    const bad = rows.filter((r) => {
      const chars = [...String(r.icon).trim()];
      return chars.length === 0 || chars.length > 2 || !/\p{Extended_Pictographic}/u.test(String(r.icon));
    });
    expect(bad, `ikon bukan emoji tunggal: ${JSON.stringify(bad.slice(0, 5))}`).toHaveLength(0);
  });

  test("D4: soal tiap dimensi konsisten dengan tipenya (tidak tercampur antar tes)", async () => {
    const rows = await q<{ code: string; dim: string; tipe: string; n: number }>(
      `select a.code, d.code as dim, q.question_type::text as tipe, count(*)::int as n
         from questions q
         join assessment_dimensions d on d.id = q.dimension_id
         join assessment_versions v on v.id = q.version_id
         join assessments a on a.id = v.assessment_id
        where a.code in ('TALENT','DISCOVER') and v.status::text = 'live' and q.is_active
        group by 1,2,3`,
    );
    // DISCOVER: semua dimensi RIASEC hanya likert (minat)
    for (const r of rows.filter((x) => x.code === "DISCOVER")) {
      expect(r.tipe, `DISCOVER/${r.dim} harus likert`).toBe("likert");
    }
    // TALENT: dimensi kemampuan tidak boleh likert
    for (const r of rows.filter((x) => x.code === "TALENT")) {
      expect(r.tipe, `TALENT/${r.dim} tidak boleh likert`).not.toBe("likert");
    }
  });
});
