import { describe, expect, it } from "vitest";
import {
  avgOf,
  computeFunnel,
  computeItemStats,
  computeTimeseries,
  computeVersionStats,
  type ItemAnswer,
  type ItemOption,
  type ItemQuestion,
  type ItemSession,
  median,
  pointBiserial,
} from "../lib/assessment-analytics";

const q = (id: string, order: number, extra: Partial<ItemQuestion> = {}): ItemQuestion => ({
  id,
  versionId: "v1",
  order,
  text: `Soal ${id}`,
  type: "multiple_choice",
  dimensionId: "d-r",
  ...extra,
});

const opt = (questionId: string, value: string, score = 0): ItemOption => ({
  id: `${questionId}-${value}`,
  questionId,
  value,
  label: `Opsi ${value}`,
  score,
});

describe("median & avgOf", () => {
  it("median ganjil/genap/kosong", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
  it("avgOf mengabaikan null", () => {
    expect(avgOf([80, null, 60, undefined])).toBe(70);
    expect(avgOf([null])).toBeNull();
  });
});

describe("pointBiserial", () => {
  it("positif kuat bila yang benar punya skor total tinggi", () => {
    const pairs = [
      { score: 1, total: 9 },
      { score: 1, total: 8 },
      { score: 1, total: 9 },
      { score: 0, total: 2 },
      { score: 0, total: 3 },
      { score: 0, total: 1 },
    ];
    const r = pointBiserial(pairs);
    expect(r).not.toBeNull();
    expect(r as number).toBeGreaterThan(0.8);
  });
  it("null bila semua benar / data < 5", () => {
    expect(pointBiserial([{ score: 1, total: 5 }])).toBeNull();
    expect(
      pointBiserial([
        { score: 1, total: 5 },
        { score: 1, total: 6 },
        { score: 1, total: 7 },
        { score: 1, total: 8 },
        { score: 1, total: 9 },
      ]),
    ).toBeNull();
  });
});

describe("computeItemStats", () => {
  const questions = [q("q1", 0), q("q2", 1), q("q3", 2, { type: "likert", dimensionId: "d-i" })];
  const options = [
    opt("q1", "A", 1),
    opt("q1", "B"),
    opt("q1", "C"),
    opt("q2", "A"),
    opt("q2", "B", 1),
    ...["A", "B", "C"].map((v, i) => ({ id: `q3-${v}`, questionId: "q3", value: v, label: v, score: i + 1 })),
  ];
  const sessions: ItemSession[] = Array.from({ length: 6 }, (_, i) => ({
    id: `s${i}`,
    status: "completed",
    startedAt: "2026-10-01T09:00:00.000Z",
    completedAt: "2026-10-01T09:10:00.000Z",
    studentId: `u${i}`,
  }));
  const answers: ItemAnswer[] = [
    // q1 dijawab 6 (4 benar), q2 dijawab 4 (2 benar), q3 dijawab 2
    { sessionId: "s0", questionId: "q1", selectedOptionId: "q1-A", scoreEarned: 1 },
    { sessionId: "s1", questionId: "q1", selectedOptionId: "q1-A", scoreEarned: 1 },
    { sessionId: "s2", questionId: "q1", selectedOptionId: "q1-A", scoreEarned: 1 },
    { sessionId: "s3", questionId: "q1", selectedOptionId: "q1-A", scoreEarned: 1 },
    { sessionId: "s4", questionId: "q1", selectedOptionId: "q1-B", scoreEarned: 0 },
    { sessionId: "s5", questionId: "q1", selectedOptionId: "q1-B", scoreEarned: 0 },
    { sessionId: "s0", questionId: "q2", selectedOptionId: "q2-B", scoreEarned: 1 },
    { sessionId: "s1", questionId: "q2", selectedOptionId: "q2-B", scoreEarned: 1 },
    { sessionId: "s2", questionId: "q2", selectedOptionId: "q2-A", scoreEarned: 0 },
    { sessionId: "s3", questionId: "q2", selectedOptionId: "q2-A", scoreEarned: 0 },
    { sessionId: "s0", questionId: "q3", selectedOptionId: "q3-C", scoreEarned: 1 },
    { sessionId: "s1", questionId: "q3", selectedOptionId: "q3-B", scoreEarned: 1 },
  ];

  it("p-value, jumlah benar, sebaran opsi, distractor mati", () => {
    const stats = computeItemStats({ questions, options, answers, sessions });
    const s1 = stats.find((s) => s.questionId === "q1")!;
    expect(s1.answered).toBe(6);
    expect(s1.correct).toBe(4);
    expect(s1.p).toBe(0.667);
    expect(s1.options).toEqual({ A: 4, B: 2, C: 0 });
    expect(s1.deadOptions).toEqual(["C"]);
    // ambang distractor mati = minimal 10 responden → dengan 6 jawaban belum ditandai
    expect(s1.flags).not.toContain("distractor mati");
    expect(s1.skippedRate).toBe(0);
  });

  it("butir yang banyak dilewati ditandai", () => {
    const stats = computeItemStats({ questions, options, answers, sessions });
    const q2 = stats.find((s) => s.questionId === "q2")!;
    expect(q2.answered).toBe(4);
    expect(q2.skippedRate).toBe(0.333);
    expect(q2.flags).toContain("banyak dilewati");
  });

  it("likert tidak diberi flag kesulitan", () => {
    const stats = computeItemStats({ questions, options, answers, sessions });
    const q3 = stats.find((s) => s.questionId === "q3")!;
    expect(q3.type).toBe("likert");
    expect(q3.flags).toEqual([]);
  });

  it("filter versi", () => {
    const stats = computeItemStats({ questions, options, answers, sessions, versionId: "lain" });
    expect(stats).toHaveLength(0);
  });
});

describe("computeFunnel", () => {
  const questions = [q("q1", 0), q("q2", 1, { dimensionId: "d-i" })];
  const sessions: ItemSession[] = [
    {
      id: "s1",
      status: "completed",
      startedAt: "2026-10-01T09:00:00Z",
      completedAt: "2026-10-01T09:10:00Z",
      studentId: "u1",
    },
    {
      id: "s2",
      status: "completed",
      startedAt: "2026-10-01T09:00:00Z",
      completedAt: "2026-10-01T09:20:00Z",
      studentId: "u2",
    },
    { id: "s3", status: "in_progress", startedAt: "2026-10-01T09:00:00Z", completedAt: null, studentId: "u3" },
    { id: "s4", status: "in_progress", startedAt: "2026-10-01T09:00:00Z", completedAt: null, studentId: "u4" },
  ];
  const answers: ItemAnswer[] = [
    { sessionId: "s1", questionId: "q1", scoreEarned: 1 },
    { sessionId: "s2", questionId: "q1", scoreEarned: 1 },
    { sessionId: "s3", questionId: "q1", scoreEarned: 0 },
    { sessionId: "s1", questionId: "q2", scoreEarned: 1 },
  ];

  it("hitung status, konversi, median durasi", () => {
    const f = computeFunnel(sessions, answers, questions);
    expect(f.total).toBe(4);
    expect(f.byStatus).toEqual({ completed: 2, in_progress: 2 });
    expect(f.completionRate).toBe(0.5);
    expect(f.medianDurationMinutes).toBe(15);
  });

  it("drop per dimensi: dimensi kedua lebih sedikit yang sampai", () => {
    const f = computeFunnel(sessions, answers, questions);
    const dR = f.perDimension.find((d) => d.dimensionId === "d-r")!;
    const dI = f.perDimension.find((d) => d.dimensionId === "d-i")!;
    expect(dR.answered).toBe(3);
    expect(dI.answered).toBe(1);
    expect(dI.dropRate).toBeGreaterThan(dR.dropRate);
  });
});

describe("computeVersionStats", () => {
  it("bandingkan versi: konversi, confidence, p rata-rata", () => {
    const stats = computeVersionStats({
      versions: [
        { id: "v1", versionNumber: 1, status: "archived" },
        { id: "v2", versionNumber: 2, status: "live" },
      ],
      sessions: [
        {
          id: "a",
          status: "completed",
          startedAt: "2026-10-01T09:00:00Z",
          completedAt: "2026-10-01T09:10:00Z",
          studentId: "u1",
          versionId: "v1",
        },
        {
          id: "b",
          status: "in_progress",
          startedAt: "2026-10-01T09:00:00Z",
          completedAt: null,
          studentId: "u2",
          versionId: "v1",
        },
        {
          id: "c",
          status: "completed",
          startedAt: "2026-10-01T09:00:00Z",
          completedAt: "2026-10-01T09:12:00Z",
          studentId: "u3",
          versionId: "v2",
        },
      ],
      itemStats: [
        { versionId: "v1", p: 0.5 },
        { versionId: "v1", p: 0.7 },
        { versionId: "v2", p: 0.8 },
      ],
      confidences: [
        { sessionId: "a", confidence: 60, versionId: "v1" },
        { sessionId: "c", confidence: 80, versionId: "v2" },
      ],
    });
    const v1 = stats.find((s) => s.versionId === "v1")!;
    const v2 = stats.find((s) => s.versionId === "v2")!;
    expect(v1.completionRate).toBe(0.5);
    expect(v1.avgConfidence).toBe(60);
    expect(v1.avgP).toBe(0.6);
    expect(v2.completionRate).toBe(1);
    expect(v2.avgConfidence).toBe(80);
  });
});

describe("computeTimeseries", () => {
  it("bucket harian, termasuk hari kosong", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const rows = computeTimeseries(
      [
        {
          id: "s1",
          status: "completed",
          startedAt: "2026-10-09T09:00:00Z",
          completedAt: "2026-10-09T09:10:00Z",
          studentId: "u1",
        },
        { id: "s2", status: "in_progress", startedAt: "2026-10-09T10:00:00Z", completedAt: null, studentId: "u2" },
        {
          id: "s3",
          status: "completed",
          startedAt: "2026-10-10T08:00:00Z",
          completedAt: "2026-10-10T08:30:00Z",
          studentId: "u1",
        },
      ],
      { days: 3, now },
    );
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.date)).toEqual(["2026-10-08", "2026-10-09", "2026-10-10"]);
    expect(rows[1]).toMatchObject({ started: 2, completed: 1, users: 2 });
    expect(rows[2]).toMatchObject({ started: 1, completed: 1, users: 1 });
    expect(rows[0]).toMatchObject({ started: 0, completed: 0 });
  });
});

describe("aturan skor kemampuan (bakat)", () => {
  it("likert tidak dihitung untuk bakat, tetap dihitung untuk minat", async () => {
    const { countsForAbility } = await import("../lib/assessment-analytics");
    expect(countsForAbility("likert", "bakat")).toBe(false);
    expect(countsForAbility("likert", "minat")).toBe(true);
    expect(countsForAbility("multiple_choice", "bakat")).toBe(true);
    expect(countsForAbility("text_input", "bakat")).toBe(true);
    expect(countsForAbility("likert", null)).toBe(true);
  });

  it("persentase kemampuan selalu 0–100 (cegah 500% dari likert)", async () => {
    const { abilityPct } = await import("../lib/assessment-analytics");
    expect(abilityPct(5, 1)).toBe(100);
    expect(abilityPct(7, 10)).toBe(70);
    expect(abilityPct(0, 10)).toBe(0);
    expect(abilityPct(3, 0)).toBe(0);
    expect(abilityPct(-2, 10)).toBe(0);
  });
});

describe("skala likert mengikuti setelan admin", () => {
  it("default 1..n", async () => {
    const { likertPoint } = await import("../lib/assessment-analytics");
    expect([0, 1, 4].map((i) => likertPoint(i))).toEqual([1, 2, 5]);
  });
  it("min/max dari panel Penilaian dihormati", async () => {
    const { likertPoint } = await import("../lib/assessment-analytics");
    expect([0, 1, 2, 3, 4].map((i) => likertPoint(i, 0, 4))).toEqual([0, 1, 2, 3, 4]);
    expect([0, 1, 2].map((i) => likertPoint(i, 2, 5))).toEqual([2, 3, 4]);
    // max tidak masuk akal (≤ min) → diabaikan
    expect(likertPoint(3, 1, 0)).toBe(4);
  });
});
