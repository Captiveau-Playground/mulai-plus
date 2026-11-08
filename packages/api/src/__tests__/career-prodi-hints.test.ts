import { describe, expect, it } from "vitest";
import { campusFlavor, pickCareerProdi, scoreProdiForCareer } from "../lib/career-prodi-hints";

const pool = [
  { name: "Teknik Lingkungan", university: "Universitas Diponegoro", level: "S1" },
  { name: "Ilmu Lingkungan", university: "Universitas Negeri Semarang", level: "S1" },
  { name: "Rekayasa Kehutanan", university: "Institut Teknologi Bandung", level: "S1" },
  { name: "Kehutanan", university: "Universitas Gadjah Mada", level: "S1" },
  { name: "Konservasi Sumberdaya Hutan", university: "Institut Pertanian Bogor", level: "S1" },
  { name: "Ilmu Konservasi Gigi", university: "Universitas Indonesia", level: "S1" },
  { name: "Magister Ilmu Lingkungan", university: "Universitas Indonesia", level: "S2" },
  { name: "Teknik Lingkungan", university: "Universitas Islam Negeri Ar-Raniry", level: "S1" },
];

describe("scoreProdiForCareer", () => {
  it("menaikkan prodi yang cocok dengan kata kunci karier", () => {
    expect(scoreProdiForCareer("Ilmu Lingkungan", "Environmental Analyst")).toBeGreaterThan(
      scoreProdiForCareer("Kehutanan", "Environmental Analyst"),
    );
  });

  it("menghukum prodi nyasar (Konservasi Gigi) untuk karier lingkungan", () => {
    expect(scoreProdiForCareer("Ilmu Konservasi Gigi", "Conservation Officer")).toBeLessThan(0);
  });
});

describe("pickCareerProdi", () => {
  it("memberi daftar BERBEDA untuk dua karier sekategori (variasi)", () => {
    const a = pickCareerProdi(pool, "Environmental Analyst", { limit: 3 });
    const b = pickCareerProdi(pool, "ESG Analyst", { limit: 3 });
    const namesA = a.map((p) => p.name);
    const namesB = b.map((p) => p.name);
    expect(namesA.length).toBeGreaterThan(0);
    expect(namesB.length).toBeGreaterThan(0);
    expect(namesA.join("|")).not.toBe(namesB.join("|"));
  });

  it("tidak memakai jenjang S2 selama ada S1", () => {
    const picked = pickCareerProdi(pool, "ESG Analyst", { limit: 3 });
    expect(picked.every((p) => !String(p.level).includes("S2"))).toBe(true);
  });

  it("memvariasikan kampus (tidak semua dari satu universitas)", () => {
    const picked = pickCareerProdi(pool, "Environmental Analyst", { limit: 3 });
    const unis = new Set(picked.map((p) => p.university));
    expect(unis.size).toBe(picked.length);
  });
});

describe("campusFlavor", () => {
  it("mengenali kampus keagamaan & negeri", () => {
    expect(campusFlavor("Universitas Islam Negeri Ar-Raniry")).toBe("keagamaan");
    expect(campusFlavor("Universitas Gadjah Mada")).toBe("negeri");
    expect(campusFlavor("Universitas Telkom")).toBe("swasta");
  });
});
