import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { ReleaseNotes } from "@/components/changelog/release-notes";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Changelog — MULAI+",
  description: "Catatan pembaruan & fitur terbaru MULAI+.",
  robots: { index: true, follow: true },
};

export const revalidate = 3600; // cache halaman di edge 1 jam (Next data cache)

type GithubRelease = {
  tag_name: string;
  name: string | null;
  published_at: string;
  prerelease: boolean;
  body: string | null;
  html_url: string;
};

const REPO = "Captiveau-Playground/mulai-plus";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

const GITHUB_RELEASES_URL = `https://github.com/${REPO}/releases`;

async function getReleases(): Promise<GithubRelease[] | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=30`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "mulaiplus-web" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as GithubRelease[];
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export default async function ChangelogPage() {
  const releases = await getReleases();

  return (
    <div className="w-full">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-gray-100 border-b bg-gradient-to-b from-brand-navy/[0.02] via-white to-white px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
        <div className="pointer-events-none absolute top-0 left-1/4 h-72 w-72 -translate-x-1/2 -translate-y-1/3 rounded-full bg-brand-navy/[0.03] blur-[120px]" />
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-navy/10 bg-brand-navy/5 px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-brand-orange" />
              <span className="font-manrope font-semibold text-[11px] text-brand-navy/60 uppercase tracking-wider">
                Changelog
              </span>
            </div>
            <h1 className="font-bold font-bricolage text-4xl text-brand-navy leading-tight tracking-tight sm:text-5xl">
              Pembaruan <span className="text-brand-orange">MULAI+</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl font-manrope text-base text-text-muted-custom leading-relaxed sm:text-lg">
              Catatan fitur baru, perbaikan, dan peningkatan platform — dibuat otomatis dari setiap rilis.
            </p>
          </div>
        </div>
      </section>

      {/* ── Daftar Release ── */}
      <section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {releases === null ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
              <p className="font-manrope text-sm text-text-muted-custom">
                Gagal memuat changelog. Coba lagi sebentar ya.
              </p>
            </div>
          ) : releases.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
              <p className="font-manrope text-sm text-text-muted-custom">
                Belum ada rilis tercatat. Lihat riwayat di{" "}
                <a
                  href={GITHUB_RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-orange underline"
                >
                  GitHub Releases
                </a>
                .
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {releases.map((r, i) => (
                <article
                  key={r.tag_name}
                  className={`rounded-2xl border p-6 shadow-sm transition-shadow hover:shadow-md ${
                    i === 0
                      ? "border-brand-orange/30 bg-gradient-to-br from-brand-orange/[0.03] to-white"
                      : "border-gray-100 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-brand-navy px-2.5 py-1 font-mono font-semibold text-white text-xs">
                      {r.tag_name}
                    </span>
                    {r.prerelease ? (
                      <Badge className="border-amber-100 bg-amber-50 font-manrope text-[10px] text-amber-700">
                        Staging/Preview
                      </Badge>
                    ) : (
                      <Badge className="border-emerald-100 bg-emerald-50 font-manrope text-[10px] text-emerald-700">
                        Production
                      </Badge>
                    )}
                    {i === 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange/10 px-2 py-0.5 font-manrope font-semibold text-[10px] text-brand-orange uppercase tracking-wide">
                        Terbaru
                      </span>
                    )}
                    <span className="ml-auto font-manrope text-text-muted-custom/60 text-xs">
                      {formatDate(r.published_at)}
                    </span>
                  </div>

                  <div className="mt-4">
                    <ReleaseNotes body={r.body || ""} />
                  </div>

                  <a
                    href={r.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1 font-manrope font-medium text-brand-orange text-xs transition-colors hover:text-brand-navy"
                  >
                    Lihat rilis di GitHub →
                  </a>
                </article>
              ))}
            </div>
          )}

          <p className="mt-8 text-center font-manrope text-text-muted-custom/50 text-xs">
            Changelog ini diperbarui otomatis dari{" "}
            <a
              href={GITHUB_RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-navy underline"
            >
              GitHub Releases
            </a>{" "}
            — tag versi dibuat oleh pipeline kami setiap ada perubahan.
          </p>
        </div>
      </section>
    </div>
  );
}
