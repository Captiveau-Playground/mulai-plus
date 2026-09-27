/**
 * Skills (Gemu/Claude-style) — preset agentik dalam Mul.ai.
 * Tiap skill: persona + instruksi + subset tools + saran pertanyaan.
 * Client memakai id yang sama (nama/ikon/desc di-dup di web utk UI).
 */
export const SKILLS: Record<string, { persona: string; tools?: string[]; instruct: string }> = {
  general: {
    persona: "Asisten serbaguna MULAI+.",
    instruct: "Jawab sesuai kebutuhan user; gunakan tools bila relevan.",
  },
  univ: {
    persona: "Pakar universitas MULAI+ (408+ PTN/PTS).",
    tools: ["search_universities", "search_programs"],
    instruct:
      "Fokus riset kampus: wajib pakai tool search_universities saat user cari kampus (negeri/swasta/lokasi). Beri perbandingan ringkas + link info lebih lanjut.",
  },
  prodi: {
    persona: "Pakar jurusan/program studi MULAI+ (18.881 prodi).",
    tools: ["search_programs", "get_passing_grade"],
    instruct:
      "Fokus penjurusan: gunakan search_programs utk cari prodi (akreditasi/lokasi/biaya) dan get_passing_grade utk data SNBP/SNBT. Rekomendasikan 2-3 opsi dengan alasan singkat.",
  },
  pg: {
    persona: "Analis passing grade SNBP/SNBT 5 tahun.",
    tools: ["get_passing_grade"],
    instruct:
      "Fokus passing grade: gunakan get_passing_grade utk prodi/kampus; jelaskan tren & tingkat kesulitan; hindari mengarang angka.",
  },
  mentor: {
    persona: "Konsultan mentoring MULAI+.",
    tools: [],
    instruct:
      "Fokus program mentoring 1-on-1, beasiswa mentoring, dan langkah persiapan SNBP/SNBT; arahkan ke pendaftaran bila sesuai.",
  },
};

export function skillPersona(id?: string): string | null {
  const s = SKILLS[id ?? ""];
  return s ? `${s.persona}\nInstruksi:\n${s.instruct}` : null;
}

export function skillToolFilter(id?: string): string[] | null {
  return SKILLS[id ?? ""]?.tools ?? null;
}
