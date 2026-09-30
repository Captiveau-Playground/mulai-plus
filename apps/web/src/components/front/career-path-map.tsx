/** Peta jalur karir — HTML/CSS animated (root karir → 3 cabang jurusan), menggantikan SVG statis. */
export function CareerPathMap() {
  const branches = [
    {
      label: "Teknik Informatika",
      sub: "3 prodi · 5 kampus",
      color: "border-brand-navy/30",
      dot: "#1a1f6d",
      tag: "cc-white",
    },
    { label: "Desain & DKV", sub: "4 prodi · 6 kampus", color: "border-teal-500/40", dot: "#0d9488", tag: "cc-teal" },
    {
      label: "Ilmu Komunikasi",
      sub: "2 prodi · 4 kampus",
      color: "border-violet-500/40",
      dot: "#7c3aed",
      tag: "cc-violet",
    },
  ];

  return (
    <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/40 p-3.5">
      <div className="flex items-center gap-3.5">
        {/* Root karir */}
        <div className="shrink-0 animate-[mindmap-pop_0.5s_ease_both]">
          <div className="relative flex h-16 w-22 min-w-22 flex-col items-center justify-center rounded-xl bg-brand-navy px-3 shadow-brand-navy/20 shadow-lg">
            <span className="font-bold font-manrope text-[11px] text-white leading-none">Game</span>
            <span className="font-bold font-manrope text-[11px] text-brand-orange leading-tight">Developer</span>
            <span className="absolute -top-2 -right-2 rounded-full bg-teal-500 px-1.5 py-0.5 font-bold font-manrope text-[8px] text-white shadow">
              84%
            </span>
          </div>
        </div>

        {/* Cabang */}
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          {branches.map((b, i) => (
            <div key={b.label} className="flex items-center gap-2.5">
              {/* connector */}
              <div className="relative h-px flex-1 overflow-visible bg-transparent">
                <span
                  className="absolute inset-y-0 left-0 h-px w-full rounded-full"
                  style={{ backgroundColor: b.dot, opacity: 0.35 }}
                />
                <span
                  className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 animate-[mindmap-flow_1.7s_linear_infinite] rounded-full"
                  style={{ backgroundColor: b.dot, animationDelay: `${i * 0.45}s` }}
                />
              </div>
              {/* card */}
              <div
                className={`group flex min-w-0 animate-[mindmap-pop_0.5s_ease_both] items-center gap-2.5 rounded-xl border bg-white p-2.5 pr-3 transition-all hover:-translate-y-0.5 hover:shadow-md ${b.color}`}
                style={{ animationDelay: `${0.25 + i * 0.18}s` }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold font-manrope text-[10px] text-white"
                  style={{ backgroundColor: b.dot }}
                >
                  {b.label[0]}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold font-bricolage text-[11px] text-gray-900 leading-tight group-hover:text-brand-navy">
                    {b.label}
                  </span>
                  <span className="block font-manrope text-[9px] text-gray-400">{b.sub}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
