/**
 * Prompt & konstanta chatbot — port dari apps/ai-python/src/engine/responder.py.
 */
export const SYSTEM_PROMPT = `Kamu adalah asisten chatbot dari MULAI+, platform bimbingan universitas, jurusan, dan beasiswa di Indonesia.

Tugas:
- Bantu calon mahasiswa cari info universitas, prodi, passing grade, beasiswa
- Rekomendasi jurusan berdasarkan minat
- Jelaskan program mentoring MULAI+
- Ramah, informatif, bahasa Indonesia natural

Data:
- 408+ PTN/PTS, 18.881 prodi (D3-S3)
- Passing grade SNBP/SNBT 5 tahun
- Mentoring 1-on-1 + beasiswa mentoring

Aturan format:
1. Jawab LANGSUNG, tanpa pengantar seperti "Berdasarkan data..."
2. Gunakan MARKDOWN untuk struktur:
   - **bold** untuk nama universitas/jurusan
   - - bullet untuk daftar
   - | tabel | untuk data perbandingan
3. Maksimal 3 paragraf + 1 tabel jika perlu
4. Akhiri dengan 1 baris ajakan ("Ada yang mau ditanyakan lagi?")
5. JANGAN pernah mengarang passing grade / akreditasi
6. Jika data kosong, bilang apa adanya + saran kata kunci lain

Gunakan tools database untuk data real-time. Jangan ngasih data palsu.`;

export const FOLLOWUPS_STATIC: Record<string, string[]> = {
  universitas: ["Cari universitas negeri", "Info akreditasi kampus", "Daftar PTN favorit"],
  prodi: ["Rekomendasi jurusan", "Info passing grade", "Prospek kerja jurusan"],
  beasiswa: ["Info beasiswa LPDP", "Beasiswa dalam negeri", "Syarat beasiswa"],
  mentoring: ["Program mentoring 1-on-1", "Testimoni alumni", "Biaya mentoring"],
  jurusan: ["Rekomendasi jurusan", "Info passing grade", "Prospek kerja lulusan"],
};

export const FALLBACK_REPLIES: Array<[string, string[]]> = [
  [
    "Maaf, layanan sedang sibuk. Coba tanya lagi nanti ya! 🙏\n\nSementara itu, kamu bisa cek langsung:\n- 🏛️ Universitas: /explore/universities\n- 📚 Program Studi: /explore/study-programs\n- 📊 Passing Grade: /explore/passing-grade",
    ["Cari universitas negeri", "Info passing grade", "Tanya program mentoring"],
  ],
  [
    "Mohon maaf, lagi error nih. Coba ulangi pertanyaannya ya! 😊\n\nAtau cek langsung:\n- 🏛️ Jelajahi Universitas\n- 📚 Cari Program Studi\n- 💡 Info Beasiswa",
    ["Rekomendasi jurusan", "Info SNBP 2026", "Cari beasiswa"],
  ],
  [
    "Wah, ada kendala teknis. Coba lagi sebentar ya! ⚡\n\nSembari menunggu, kamu bisa lihat-lihat dulu:\n- /explore/universities\n- /explore/study-programs",
    ["PTN dengan akreditasi unggul", "Jurusan dengan passing grade rendah", "Info program mentoring"],
  ],
];

/** Ekstrak topik follow-up dari teks jawaban (fallback kalau LLM tidak kasih). */
export function extractTopics(text: string): string[] {
  const lower = text.toLowerCase();
  for (const [keyword, followups] of Object.entries(FOLLOWUPS_STATIC)) {
    if (lower.includes(keyword)) {
      return followups.slice(0, 3);
    }
  }
  return FOLLOWUPS_STATIC.universitas ?? [];
}
