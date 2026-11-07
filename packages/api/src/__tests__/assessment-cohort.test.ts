import { describe, expect, it } from "vitest";
import { computeCohortStats } from "../lib/assessment-analytics";

const student = (id: string, status: string, resultId: string | null, batchId = "b1") => ({
  id,
  name: `Siswa ${id}`,
  status,
  resultId,
  batchId,
});

describe("computeCohortStats (B2B)", () => {
  it("hitung kelengkapan, holland, kemampuan, rekomendasi, perhatian", () => {
    const stats = computeCohortStats({
      students: [
        student("s1", "completed", "r1"),
        student("s2", "completed", "r2"),
        student("s3", "in_progress", null),
        student("s4", "invited", null),
      ],
      results: [
        {
          id: "r1",
          hollandCode: "I-A-S",
          hollandScores: { I: 18, A: 12, R: 2 },
          abilityScores: { scores: { verbal: { correct: 8, total: 10 }, numerical: { correct: 2, total: 10 } } },
          confidenceScore: "82",
          differentiation: "strong",
        },
        {
          id: "r2",
          hollandCode: "S-E-C",
          hollandScores: { S: 15, E: 9 },
          abilityScores: { scores: { verbal: { correct: 3, total: 10 } } },
          confidenceScore: "38",
          differentiation: "flat",
        },
      ],
      recos: [
        { resultId: "r1", type: "major", rank: 1, itemName: "Kedokteran" },
        { resultId: "r1", type: "major", rank: 2, itemName: "Psikologi" },
        { resultId: "r2", type: "major", rank: 1, itemName: "Kedokteran" },
        { resultId: "r2", type: "career", rank: 4, itemName: "HR" },
      ],
    });

    expect(stats.counts).toMatchObject({ total: 4, completed: 2, inProgress: 1, invited: 1, completionRatePct: 50 });
    expect(stats.confidenceAvg).toBe(60);
    // I dan S masing-masing 1 → urutan bisa tie, cek agregatnya
    const byCode = new Map(stats.holland.map((h) => [h.code, h]));
    expect(byCode.get("I")?.count).toBe(1);
    expect(byCode.get("S")?.count).toBe(1);
    expect(byCode.get("I")?.pct).toBe(50);
    // kemampuan: verbal 11/20 = 55%, numerical 2/10 = 20%
    const ab = new Map(stats.ability.map((a) => [a.key, a]));
    expect(ab.get("verbal")).toMatchObject({ correct: 11, total: 20, pct: 55 });
    expect(ab.get("numerical")).toMatchObject({ correct: 2, total: 10, pct: 20 });
    expect(stats.strongest?.key).toBe("verbal");
    expect(stats.weakest?.key).toBe("numerical");
    // top jurusan: Kedokteran 2x dari 2 siswa selesai
    expect(stats.topMajors[0]).toMatchObject({ name: "Kedokteran", count: 2, pct: 100 });
    // karier rank 4 tidak masuk top-3
    expect(stats.topCareers).toHaveLength(0);
    // perhatian: s3 (belum selesai), s2 (keyakinan rendah + minat menyebar + kemampuan)
    const names = stats.attention.map((a) => a.studentId);
    expect(names).toContain("s3");
    const s2 = stats.attention.find((a) => a.studentId === "s2");
    expect(s2?.reasons).toContain("keyakinan rendah");
    expect(s2?.reasons).toContain("minat menyebar");
    expect(s2?.reasons.join(" ")).toContain("kemampuan verbal terendah");
    expect(stats.activeBatchIds).toEqual(["b1"]);
  });

  it("kohort kosong tidak pecah", () => {
    const stats = computeCohortStats({ students: [], results: [], recos: [] });
    expect(stats.counts).toMatchObject({ total: 0, completed: 0, completionRatePct: 0 });
    expect(stats.confidenceAvg).toBeNull();
    expect(stats.holland).toHaveLength(6);
    expect(stats.topMajors).toHaveLength(0);
  });
});
