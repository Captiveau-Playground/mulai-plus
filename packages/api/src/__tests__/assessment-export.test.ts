import { describe, expect, it } from "vitest";
import {
  buildConfigRows,
  buildGuideRows,
  buildQuestionRows,
  EXPORT_COLUMNS,
  type ExportContent,
  evalLabel,
  keyLetter,
  tampilanLabel,
  tipeLabel,
} from "../lib/assessment-export";

const dims = [
  { id: "d-r", code: "R", name: "Realistic" },
  { id: "d-num", code: "NUM", name: "Numerasi" },
];

function fixture(): ExportContent {
  return {
    dimensions: dims,
    questions: [
      {
        id: "q1",
        dimensionId: "d-r",
        questionText: "Kamu lebih suka bekerja dengan…",
        questionType: "multiple_choice",
        presentationMode: "emoji_option",
        weight: 2,
        questionCode: "R-01",
        durationSeconds: 45,
        isActive: true,
        mediaUrl: "https://cdn/x.png",
        mediaType: "image",
        mediaCaption: "Gambar contoh",
        displayOrder: 1,
      },
      {
        id: "q2",
        dimensionId: "d-num",
        questionText: "Hitung 3/4 + 0",
        questionType: "text_input",
        presentationMode: "standard_option_card",
        weight: 1,
        isActive: true,
        displayOrder: 2,
      },
      {
        id: "q3",
        dimensionId: "d-r",
        questionText: "Saya suka kerja praktis",
        questionType: "likert",
        presentationMode: "standard_option_card",
        weight: 1,
        isActive: true,
        displayOrder: 3,
      },
      {
        id: "q4",
        dimensionId: "d-r",
        questionText: "Soal nonaktif",
        questionType: "multiple_choice",
        presentationMode: "standard_option_card",
        weight: 1,
        isActive: false,
        displayOrder: 4,
      },
    ],
    options: [
      {
        questionId: "q1",
        optionValue: "A",
        label: "Data dan eksperimen",
        targetDimension: "d-r",
        icon: "🔬",
        imageUrl: "https://cdn/a.png",
        imageCaption: "Lab",
        score: 0,
        displayOrder: 0,
      },
      {
        questionId: "q1",
        optionValue: "B",
        label: "Ide kreatif",
        targetDimension: "d-r",
        icon: "🎨",
        score: 3,
        displayOrder: 1,
      },
      ...["Sangat tidak suka", "Tidak suka", "Netral", "Suka", "Sangat suka"].map((caption, i) => ({
        questionId: "q3",
        optionValue: String.fromCharCode(65 + i),
        label: caption,
        targetDimension: "d-r",
        icon: "😍",
        score: i + 1,
        displayOrder: i,
      })),
      {
        questionId: "q4",
        optionValue: "A",
        label: "Ya",
        targetDimension: "d-r",
        score: 1,
        displayOrder: 0,
      },
    ],
    textConfigs: [
      {
        questionId: "q2",
        evaluationType: "numeric_tolerance",
        answerKey: "0.75",
        numericTolerance: "0.01",
      },
    ],
  };
}

const col = (name: (typeof EXPORT_COLUMNS)[number]) => EXPORT_COLUMNS.indexOf(name);

describe("assessment-export", () => {
  it("label mapping bolak-balik dengan importer", () => {
    expect(tipeLabel("multiple_choice")).toBe("pilihan ganda");
    expect(tipeLabel("text_input")).toBe("isian (mengetik)");
    expect(tipeLabel("likert")).toBe("skala (likert)");
    expect(evalLabel("numeric_tolerance")).toBe("angka");
    expect(evalLabel("keyword_match")).toBe("kata");
    expect(evalLabel("pattern_match")).toBe("pola");
    expect(evalLabel("exact_match")).toBe("persis");
    expect(evalLabel(undefined)).toBe("");
    expect(tampilanLabel("emoji_option")).toBe("emoji");
    expect(tampilanLabel("image_option")).toBe("gambar");
    expect(tampilanLabel("visual_comparison")).toBe("banding");
    expect(tampilanLabel("standard_option_card")).toBe("standar");
  });

  it("header = kontrak import + kolom lanjutan", () => {
    const rows = buildQuestionRows(fixture());
    expect(rows[0]?.slice(0, 15)).toEqual([
      "Teks",
      "Dimensi",
      "Tipe",
      "Opsi A",
      "Opsi B",
      "Opsi C",
      "Opsi D",
      "Opsi E",
      "Opsi F",
      "Kunci",
      "Bobot",
      "Kunci Isian",
      "Cara nilai",
      "Toleransi",
      "Tampilan",
    ]);
    expect(rows[0]?.length).toBe(EXPORT_COLUMNS.length);
  });

  it("soal pilihan ganda: opsi, kunci dari skor, media, target, ikon", () => {
    const [, row] = buildQuestionRows(fixture());
    expect(row).toBeDefined();
    const r = row as (string | number)[];
    expect(r[col("Teks")]).toBe("Kamu lebih suka bekerja dengan…");
    expect(r[col("Dimensi")]).toBe("R");
    expect(r[col("Tipe")]).toBe("pilihan ganda");
    expect(r[col("Opsi A")]).toBe("Data dan eksperimen");
    expect(r[col("Opsi B")]).toBe("Ide kreatif");
    expect(r[col("Kunci")]).toBe("B"); // score 3 > 0
    expect(r[col("Bobot")]).toBe(2);
    expect(r[col("Tampilan")]).toBe("emoji");
    expect(r[col("Kode")]).toBe("R-01");
    expect(r[col("Durasi")]).toBe(45);
    expect(r[col("Aktif")]).toBe("ya");
    expect(r[col("Media URL")]).toBe("https://cdn/x.png");
    expect(r[col("Target A")]).toBe("d-r");
    expect(r[col("Ikon A")]).toBe("🔬");
    expect(r[col("Skor A")]).toBe(0);
    expect(r[col("Skor B")]).toBe(3);
    expect(r[col("Gambar A")]).toBe("https://cdn/a.png");
    expect(r[col("Caption Gambar A")]).toBe("Lab");
  });

  it("soal isian: kunci isian + cara nilai + toleransi", () => {
    const [, , row] = buildQuestionRows(fixture());
    const r = row as (string | number)[];
    expect(r[col("Tipe")]).toBe("isian (mengetik)");
    expect(r[col("Kunci Isian")]).toBe("0.75");
    expect(r[col("Cara nilai")]).toBe("angka");
    expect(r[col("Toleransi")]).toBe("0.01");
    expect(r[col("Kunci")]).toBe("");
  });

  it("soal skala: caption di Opsi A–E, tanpa kunci", () => {
    const [, , , row] = buildQuestionRows(fixture());
    const r = row as (string | number)[];
    expect(r[col("Tipe")]).toBe("skala (likert)");
    expect(r[col("Opsi A")]).toBe("Sangat tidak suka");
    expect(r[col("Opsi E")]).toBe("Sangat suka");
    expect(r[col("Kunci")]).toBe("");
    expect(r[col("Skor A")]).toBe(1);
    expect(r[col("Skor E")]).toBe(5);
  });

  it("soal nonaktif dilewati kecuali diminta", () => {
    const active = buildQuestionRows(fixture());
    expect(active.length).toBe(4); // header + 3 aktif
    const all = buildQuestionRows(fixture(), { includeInactive: true });
    expect(all.length).toBe(5);
    const last = all[4] as (string | number)[];
    expect(last[col("Teks")]).toBe("Soal nonaktif");
    expect(last[col("Aktif")]).toBe("tidak");
  });

  it("kunci jatuh ke opsi berskor pertama", () => {
    expect(
      keyLetter([
        { questionId: "q", optionValue: "A", label: "a", score: 0 },
        { questionId: "q", optionValue: "C", label: "c", score: 1 },
      ]),
    ).toBe("C");
    expect(keyLetter([])).toBe("");
  });

  it("sheet konfigurasi memuat aturan + dimensi", () => {
    const rows = buildConfigRows(
      {
        name: "Tes Minat",
        code: "DISCOVER",
        versionNumber: 3,
        status: "draft",
        config: { total_dim: 6, randomize_a: false },
      },
      dims,
    );
    expect(rows[0]).toEqual(["Kunci", "Nilai", "Arti"]);
    expect(rows.some((r) => r[0] === "total_dim" && r[1] === 6)).toBe(true);
    expect(rows.some((r) => r[0] === "randomize_a" && r[1] === false)).toBe(true);
    expect(rows.some((r) => r[0] === "R" && r[1] === "Realistic")).toBe(true);
  });

  it("petunjuk menyebut kolom lanjutan & peringatan append", () => {
    const rows = buildGuideRows({ name: "Tes Minat", code: "DISCOVER", versionNumber: 2, status: "live" }, 42);
    const flat = rows.flat().join(" | ");
    expect(flat).toContain("42 soal");
    expect(flat).toContain("Import = menambah");
    expect(flat).toContain("Target A–F");
    expect(flat).toContain("Skor A–F");
  });
});
