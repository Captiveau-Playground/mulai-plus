import { describe, expect, it } from "vitest";
import {
  answerLabel,
  buildGuideRows,
  buildHistorySheets,
  buildQuestionSheet,
  buildTestSheet,
  type ExportData,
  type ExportRow,
  PREFIX_COLUMNS,
  testKey,
} from "../lib/assessment-history-export";

function fixture(): ExportData {
  const rows: ExportRow[] = [
    {
      studentId: "u1",
      name: "Ayu Lestari",
      email: "ayu@example.com",
      isGuest: false,
      source: "mandiri",
      schoolName: "",
      batchName: "",
      testCode: "DISCOVER",
      testName: "Tes Minat",
      family: "minat",
      versionNumber: 2,
      versionStatus: "live",
      sessionId: "s-ayu-1",
      versionId: "v2",
      startedAt: "2026-10-01T09:00:00.000Z",
      finishedAt: "2026-10-01T09:12:00.000Z",
      status: "completed",
      profileCode: "I-A-S",
      topDimensions: ["d-i", "d-a", "d-s"],
      rawScores: { "d-i": 18, "d-a": 14 },
      timedOut: false,
      xpEarned: 120,
      recommendations: [
        { rank: 1, name: "Kedokteran", confidence: 88 },
        { rank: 2, name: "DKV", confidence: 74 },
        { rank: 3, name: "Psikologi", confidence: 61 },
      ],
      confidenceProfile: "82",
      differentiation: "strong",
      confidenceMatch: { attemptId: "r1", createdAt: "2026-10-01T09:13:00.000Z" },
      answers: [
        { questionId: "q1", optionId: "o1b", score: 1 },
        { questionId: "q2", text: "0.75", score: 1 },
      ],
    },
    {
      studentId: "u1",
      name: "Ayu Lestari",
      email: "ayu@example.com",
      isGuest: false,
      source: "sekolah",
      schoolName: "SMA Negeri 1",
      batchName: "Batch Oktober",
      testCode: "DISCOVER",
      testName: "Tes Minat",
      family: "minat",
      versionNumber: 1,
      versionStatus: "archived",
      sessionId: "s-ayu-0",
      versionId: "v1",
      startedAt: "2026-09-01T09:00:00.000Z",
      finishedAt: "2026-09-01T09:20:00.000Z",
      status: "timeout",
      profileCode: "R-C-E",
      topDimensions: ["d-r"],
      rawScores: { "d-r": 20 },
      timedOut: true,
      xpEarned: 90,
      recommendations: [],
      confidenceProfile: null,
      differentiation: null,
      confidenceMatch: null,
      answers: [{ questionId: "q0", optionId: "o0a", score: 0 }],
    },
    {
      studentId: "guest-9",
      name: "Budi",
      email: "",
      isGuest: true,
      source: "sekolah",
      schoolName: "SMA Negeri 1",
      batchName: "Batch Oktober",
      testCode: "TALENT",
      testName: "Tes Bakat",
      family: "bakat",
      versionNumber: 1,
      versionStatus: "live",
      sessionId: "s-budi-1",
      versionId: "t1",
      startedAt: "2026-10-02T10:00:00.000Z",
      finishedAt: "2026-10-02T10:10:00.000Z",
      status: "completed",
      profileCode: "numerical-verbal",
      topDimensions: [],
      rawScores: {},
      timedOut: false,
      xpEarned: 100,
      recommendations: [{ rank: 1, name: "Statistika", confidence: 70 }],
      confidenceProfile: "65",
      differentiation: "moderate",
      confidenceMatch: { attemptId: "r9", createdAt: "2026-10-02T10:11:00.000Z" },
      answers: [{ questionId: "tq1", optionId: "to1a", score: 1 }],
    },
  ];

  return {
    generatedAt: "2026-10-20T00:00:00.000Z",
    total: 3,
    offset: 0,
    limit: 300,
    rows,
    questions: [
      {
        id: "q1",
        versionId: "v2",
        order: 0,
        code: "R-01",
        text: "Suka kerja praktis?",
        type: "multiple_choice",
        dimensionId: "d-r",
      },
      { id: "q2", versionId: "v2", order: 1, code: "N-02", text: "Hitung 3/4", type: "text_input", dimensionId: "d-i" },
      {
        id: "q0",
        versionId: "v1",
        order: 0,
        code: "R-01",
        text: "Versi lama",
        type: "multiple_choice",
        dimensionId: "d-r",
      },
      {
        id: "tq1",
        versionId: "t1",
        order: 0,
        code: "NUM-01",
        text: "2 + 3 = ?",
        type: "multiple_choice",
        dimensionId: "d-num",
      },
    ],
    options: [
      { id: "o1b", questionId: "q1", value: "B", label: "Ide kreatif", score: 1 },
      { id: "o1a", questionId: "q1", value: "A", label: "Data", score: 0 },
      { id: "o0a", questionId: "q0", value: "A", label: "Ya", score: 1 },
      { id: "to1a", questionId: "tq1", value: "A", label: "5", score: 1 },
    ],
    dimensions: [
      { id: "d-r", versionId: "v2", code: "R", name: "Realistic" },
      { id: "d-i", versionId: "v2", code: "I", name: "Investigative" },
      { id: "d-a", versionId: "v2", code: "A", name: "Artistic" },
      { id: "d-s", versionId: "v2", code: "S", name: "Social" },
      { id: "d-num", versionId: "t1", code: "num", name: "Numerasi" },
    ],
  };
}

const colIndex = (header: any[], name: string) => header.indexOf(name);

describe("assessment-history-export", () => {
  it("label jawaban: opsi, isian, kosong", () => {
    const data = fixture();
    const opts = new Map(data.options.map((o) => [o.id, o]));
    expect(answerLabel({ questionId: "q1", optionId: "o1b" }, opts)).toBe("B. Ide kreatif");
    expect(answerLabel({ questionId: "q2", text: "0.75" }, opts)).toBe("0.75");
    expect(answerLabel(undefined, opts)).toBe("");
    expect(answerLabel({ questionId: "q1", optionId: null }, opts)).toBe("");
  });

  it("satu baris = satu percobaan, kolom Q mengikuti item versi barisnya", () => {
    const data = fixture();
    const discover = data.rows.filter((r) => r.testCode === "DISCOVER");
    const rows = buildTestSheet(discover, data);
    const header = rows[0] as any[];
    expect(header.slice(0, PREFIX_COLUMNS.length)).toEqual([...PREFIX_COLUMNS]);
    // 2 versi (v1: 1 item, v2: 2 item) → kolom Q1..Q2
    expect(header.slice(PREFIX_COLUMNS.length)).toEqual(["Q1", "Q2"]);
    expect(rows.length - 1).toBe(2);

    // urut kronologis: percobaan 1 = sesi September (versi 1), percobaan 2 = Oktober (versi 2)
    const r1 = rows[1] as any[];
    expect(r1[colIndex(header, "Nama")]).toBe("Ayu Lestari");
    expect(r1[colIndex(header, "ID Siswa")]).toBe("u1");
    expect(r1[colIndex(header, "Percobaan ke")]).toBe(1);
    expect(r1[colIndex(header, "Versi Soal")]).toBe(1);
    expect(r1[colIndex(header, "Status Versi")]).toBe("archived");
    expect(r1[colIndex(header, "Status Sesi")]).toBe("timeout");
    expect(r1[colIndex(header, "Timeout")]).toBe("ya");
    expect(r1[colIndex(header, "Q1")]).toBe("A. Ya");
    expect(r1[colIndex(header, "Q2")]).toBe("");

    const r2 = rows[2] as any[];
    expect(r2[colIndex(header, "Percobaan ke")]).toBe(2);
    expect(r2[colIndex(header, "Versi Soal")]).toBe(2);
    expect(r2[colIndex(header, "Profil (kode)")]).toBe("I-A-S");
    expect(r2[colIndex(header, "Dimensi Teratas")]).toBe("I-A-S");
    expect(r2[colIndex(header, "Skor Mentah")]).toBe("d-i:18 · d-a:14");
    expect(r2[colIndex(header, "Confidence (profil)")]).toBe("82");
    expect(r2[colIndex(header, "Confidence (rekomendasi #1)")]).toBe(88);
    expect(r2[colIndex(header, "Rekomendasi #1")]).toBe("Kedokteran (88%)");
    expect(r2[colIndex(header, "Rekomendasi #3")]).toBe("Psikologi (61%)");
    expect(r2[colIndex(header, "Dijawab")]).toBe(2);
    expect(r2[colIndex(header, "Total Skor")]).toBe(2);
    expect(r2[colIndex(header, "Durasi (menit)")]).toBe(12);
    expect(r2[colIndex(header, "Q1")]).toBe("B. Ide kreatif");
    expect(r2[colIndex(header, "Q2")]).toBe("0.75");
  });

  it("sheet per tes+versi, plus sheet Soal & Petunjuk", () => {
    const data = fixture();
    const sheets = buildHistorySheets(data);
    expect(sheets.map((s) => s.name)).toEqual(["DISCOVER v1", "DISCOVER v2", "TALENT v1", "Soal", "Petunjuk"]);

    const soalSheet = sheets.find((s) => s.name === "Soal");
    if (!soalSheet) throw new Error("sheet Soal tidak ditemukan");
    const soal = soalSheet.rows;
    const sh = soal[0] as any[];
    expect(sh.slice(0, 8)).toEqual([
      "Kode Tes",
      "Versi Soal",
      "Status Versi",
      "Q",
      "Kode Soal",
      "Dimensi",
      "Tipe",
      "Teks Soal",
    ]);
    const v2first = soal.find((r) => r[0] === "DISCOVER" && r[1] === 2 && r[3] === "Q1") as any[];
    expect(v2first[4]).toBe("R-01");
    expect(v2first[5]).toBe("R");
    expect(v2first[7]).toBe("Suka kerja praktis?");
    expect(v2first[8]).toBe("Data"); // opsi A
    expect(v2first[9]).toBe("Ide kreatif"); // opsi B
  });

  it("petunjuk menjelaskan versi, profil, confidence", () => {
    const data = fixture();
    const guide = buildGuideRows(data, [{ name: "DISCOVER v2", count: 1 }])
      .flat()
      .join(" | ");
    expect(guide).toContain("Versi Soal");
    expect(guide).toContain("Confidence (profil)");
    expect(guide).toContain("Confidence (rekomendasi #1)");
    expect(guide).toContain("1 orang + 1 percobaan");
  });

  it("testKey membedakan versi", () => {
    const data = fixture();
    expect(testKey(data.rows[0]!)).toBe("DISCOVER v2");
    expect(testKey(data.rows[1]!)).toBe("DISCOVER v1");
  });

  it("buildQuestionSheet memuat semua versi yang muncul", () => {
    const data = fixture();
    const rows = buildQuestionSheet(data.rows, data);
    const versions = new Set(rows.slice(1).map((r) => `${r[0]} v${r[1]}`));
    expect([...versions].sort()).toEqual(["DISCOVER v1", "DISCOVER v2", "TALENT v1"]);
  });
});
