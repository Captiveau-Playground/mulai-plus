import { describe, expect, it } from "vitest";
import { CAREER_PROFILES, MAJOR_PATTERNS } from "../lib/assessment-catalog";
import { CAMPUS_PRIORITY, campusTier, levelTier, pickProdiRefs } from "../lib/campus-priority";

const HOLLAND = ["R", "I", "A", "S", "E", "C"];

describe("prioritas kampus", () => {
  it("kampus favorit dapat peringkat lebih tinggi", () => {
    expect(campusTier("Universitas Indonesia")).toBeLessThan(campusTier("Institut Teknologi Bandung"));
    expect(campusTier("Universitas Gadjah Mada")).toBeLessThan(campusTier("Universitas Diponegoro"));
    expect(campusTier("Politeknik Negeri Balikpapan")).toBe(999);
  });

  it("pickProdiRefs: favorit dulu, satu kampus satu prodi, lalu dilengkapi", () => {
    const prodis = [
      { name: "Manajemen", university: "Universitas Diponegoro" },
      { name: "Manajemen", university: "Universitas Indonesia" },
      { name: "Akuntansi", university: "Universitas Indonesia" },
      { name: "Manajemen", university: "Universitas Gadjah Mada" },
      { name: "Bisnis Digital", university: "Politeknik Negeri Balikpapan" },
      { name: "Ilmu Ekonomi", university: "Universitas Padjadjaran" },
    ];
    const picked = pickProdiRefs(prodis, 4);
    expect(picked).toHaveLength(4);
    // dua kampus teratas (UI, UGM) masuk lebih dulu daripada Undip/Padjadjaran
    expect(picked[0]?.university).toBe("Universitas Indonesia");
    expect(picked.map((p) => p.university)).toContain("Universitas Gadjah Mada");
    // tidak ada kampus sama yang dobel selama masih ada pilihan lain
    expect(new Set(picked.map((p) => p.university)).size).toBe(4);
  });

  it("jenjang: S1 didahulukan, S2/S3 paling akhir", () => {
    expect(levelTier("S1")).toBeLessThan(levelTier("D4"));
    expect(levelTier("D4")).toBeLessThan(levelTier("D3"));
    expect(levelTier("D3")).toBeLessThan(levelTier("S2"));
    expect(levelTier("S2")).toBeLessThan(levelTier("S3"));
    const picked = pickProdiRefs(
      [
        { name: "Doktor Matematika", university: "Universitas Indonesia", level: "S3" },
        { name: "Matematika", university: "Universitas Diponegoro", level: "S1" },
        { name: "Magister Manajemen", university: "Universitas Gadjah Mada", level: "S2" },
      ],
      2,
    );
    expect(picked[0]?.level).toBe("S1");
    expect(picked.map((p) => p.level)).not.toContain("S3");
  });

  it("pickProdiRefs: fallback mengisi sampai limit walau kampus terbatas", () => {
    const prodis = [
      { name: "A", university: "Universitas Indonesia" },
      { name: "B", university: "Universitas Indonesia" },
      { name: "C", university: "Universitas Indonesia" },
    ];
    expect(pickProdiRefs(prodis, 3)).toHaveLength(3);
  });
});

describe("katalog jurusan & karier", () => {
  it("setiap pola: regex valid, key unik, Holland valid", () => {
    const keys = new Set<string>();
    for (const p of MAJOR_PATTERNS) {
      expect(() => new RegExp(p.pattern, "i"), `regex ${p.key}`).not.toThrow();
      expect(keys.has(p.key), `key duplikat ${p.key}`).toBe(false);
      keys.add(p.key);
      expect(HOLLAND, `holland primer ${p.key}`).toContain(p.hollandPrimary);
      expect(HOLLAND, `holland sekunder ${p.key}`).toContain(p.hollandSecondary);
      expect(Object.keys(p.abilityWeights).length, `bobot ${p.key}`).toBeGreaterThan(0);
      for (const [k, v] of Object.entries(p.abilityWeights)) {
        expect(["numerical", "verbal", "logical", "spatial", "clerical"]).toContain(k);
        expect(v).toBeGreaterThan(0);
      }
    }
  });

  it("setiap tipe Holland punya ≥6 jurusan primer", () => {
    const per = new Map<string, number>();
    for (const p of MAJOR_PATTERNS) per.set(p.hollandPrimary, (per.get(p.hollandPrimary) ?? 0) + 1);
    for (const code of HOLLAND) expect(per.get(code) ?? 0, `Holland ${code}`).toBeGreaterThanOrEqual(6);
  });

  it("setiap kategori punya ≥4 karier unik dan mencakup karier 2026", () => {
    const all: string[] = [];
    for (const p of MAJOR_PATTERNS) {
      const careers = CAREER_PROFILES[p.key] ?? [];
      expect(careers.length, `karier ${p.key}`).toBeGreaterThanOrEqual(4);
      expect(new Set(careers).size, `karier duplikat ${p.key}`).toBe(careers.length);
      all.push(...careers);
    }
    // peran yang relevan 2026 harus ada di katalog
    for (const role of [
      "AI Application Developer",
      "MLOps Engineer",
      "ESG Analyst",
      "Data Steward",
      "Halal Assurance Officer",
    ]) {
      expect(all, `karier ${role}`).toContain(role);
    }
    expect(all.length).toBeGreaterThan(250);
  });

  it("tidak ada kategori yatim (pola tanpa profil karier, atau sebaliknya)", () => {
    const keys = new Set(MAJOR_PATTERNS.map((p) => p.key));
    for (const key of Object.keys(CAREER_PROFILES)) expect(keys.has(key), `karier tanpa pola: ${key}`).toBe(true);
    for (const key of keys) expect(Object.keys(CAREER_PROFILES), `pola tanpa karier: ${key}`).toContain(key);
  });

  it("prioritas kampus berisi kampus favorit utama", () => {
    const joined = CAMPUS_PRIORITY.join("|");
    for (const c of [
      "universitas indonesia",
      "institut teknologi bandung",
      "universitas gadjah mada",
      "institut pertanian bogor",
    ]) {
      expect(joined).toContain(c);
    }
  });
});
