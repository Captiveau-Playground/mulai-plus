"use client";

import { Quote } from "lucide-react";
import { useEffect, useState } from "react";

const QUOTES = [
  {
    text: "Aku sempat bingung antara Kedokteran dan Teknik Informatika. Setelah ikut test ini, rekomendasinya menegaskan kalau investigatif + teknis adalah kombinasi yang cocok untukku.",
    initial: "R",
    name: "Raka",
    meta: "Siswa kelas 12, hasil kode IAC",
  },
  {
    text: "Awalnya cuma nyoba karena gratisan, eh hasilnya bener-bener membantu milih prodi SNBP. Ayahku sampai ikut baca laporannya.",
    initial: "D",
    name: "Dinda",
    meta: "Siswi SMK, lolos prodi favorit",
  },
  {
    text: "Sebagai guru BK, laporan per siswa ini jelas dan mudah dinarasikan ke orang tua. Sangat membantu bagian konseling sekolah.",
    initial: "B",
    name: "Bu Sari",
    meta: "Guru BK, SMA di Surabaya",
  },
];

export function TestimonialCarousel() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % QUOTES.length), 5200);
    return () => clearInterval(t);
  }, []);

  const q = QUOTES[idx];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 md:py-24">
      <Quote className="mx-auto h-8 w-8 text-teal-500/40" />
      <blockquote
        key={idx}
        className="mt-6 font-bold font-bricolage text-gray-900 text-xl leading-relaxed md:text-2xl"
        style={{ animation: "quote-in 0.6s ease" }}
      >
        "{q.text}"
      </blockquote>
      <div className="mt-6 flex items-center justify-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-navy font-bold font-bricolage text-sm text-white">
          {q.initial}
        </div>
        <div className="text-left">
          <p className="font-bold font-manrope text-gray-900 text-sm">{q.name}</p>
          <p className="font-manrope text-gray-500 text-xs">{q.meta}</p>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-center gap-1.5">
        {QUOTES.map((_, i) => (
          <button
            key={i}
            aria-label={`Testimoni ${i + 1}`}
            onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-teal-500" : "w-1.5 bg-gray-300 hover:bg-gray-400"}`}
          />
        ))}
      </div>
    </div>
  );
}
