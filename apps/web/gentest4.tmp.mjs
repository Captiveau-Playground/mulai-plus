const { generateTmbReportPdf } = await import("./src/lib/tmb-report-pdf.ts");
const blob = await generateTmbReportPdf({
  studentName: "Rina Putri Aurora",
  schoolName: "SMA Negeri 1 Surabaya",
  hollandCode: "EIA",
  hollandScores: { R: 0.4, I: 0.75, A: 0.65, S: 0.55, E: 0.9, C: 0.5 },
  abilityScores: {
    numerical: { correct: 8, total: 10 },
    verbal: { correct: 6, total: 10 },
    logical: { correct: 9, total: 10 },
    spatial: { correct: 5, total: 10 },
    clerical: { correct: 7, total: 10 },
  },
  abilityLevels: { numerical: "high", verbal: "medium", logical: "high", spatial: "low", clerical: "medium" },
  differentiation: "strong",
  confidenceScore: "82",
  majors: [
    {
      itemName: "Manajemen",
      confidence: "88",
      prodiRefs: [{ prodi: "Manajemen", university: "Universitas Indonesia" }],
    },
  ],
  careers: ["Marketing", "Business Development"],
  summary: "Profil dominan Enterprising.",
});
await Bun.write("/tmp/tmb-report-sample.pdf", new Uint8Array(await blob.arrayBuffer()));
console.log("OK bytes:", (await import("node:fs")).statSync("/tmp/tmb-report-sample.pdf").size);
