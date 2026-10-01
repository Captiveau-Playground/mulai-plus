/**
 * Maintenance-mode worker — halaman 503 branded utk seluruh zona.
 *
 * Cara pakai (runbook lengkap: docs/infrastructure/maintenance-mode.md):
 *   1) wrangler deploy  (nama: maintenance-mode)
 *   2) CF Dashboard → Workers → mulai-plus-web → Triggers → Custom Domains:
 *      lepas route mulaiplus.id, attach ke worker maintenance-mode.
 *      Ulangi utk api.mulaiplus.id (respon jadi JSON) jika perlu.
 *   3) Undo = balikin Custom Domain ke worker asal.
 */
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const host = url.hostname;

    // API host → JSON 503 (mudah dibaca klien/monitoring).
    const wantsJson =
      request.headers.get("accept")?.includes("application/json") ||
      host.includes("api.") ||
      url.pathname.startsWith("/rpc") ||
      url.pathname.startsWith("/api");

    const eta = "30 menit";

    return new Response(
      wantsJson
        ? JSON.stringify({
            error: "maintenance",
            message: "Kami sedang melakukan pemeliharaan. Coba lagi sebentar ya.",
            retryAfterSec: 1800,
            status: "https://status.mulaiplus.id",
          })
        : `<!doctype html><html lang="id"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/>
<title>MULAI+ Sedang Pemeliharaan</title>
<style>
  body{margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#f4f5f9;font-family:'Segoe UI',system-ui,sans-serif;color:#3a3a42}
  .card{max-width:480px;text-align:center;padding:40px 28px;background:#fff;border-radius:20px;box-shadow:0 18px 50px rgba(26,31,109,.10)}
  .logo{font-size:30px;font-weight:800;color:#1a1f6d}
  .logo b{color:#fe9114}
  .badge{display:inline-block;margin-top:18px;padding:5px 14px;border-radius:999px;background:#fef1e6;color:#c2540b;font-size:12px;font-weight:700}
  h1{font-size:22px;color:#1a1f6d;margin:10px 0 8px}
  p{font-size:14px;color:#8a8a92;line-height:1.6;margin:0 0 22px}
  .btn{display:inline-block;background:#fe9114;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 24px;border-radius:12px}
  .foot{margin-top:22px;font-size:11px;color:#b6b6bd}
</style></head><body>
<div class="card">
  <div class="logo">MULAI<b>+</b></div>
  <div class="badge">🚧 PEMELIHARAAN TERJADWAL</div>
  <h1>Sebentar lagi kembali normal</h1>
  <p>Kami sedang melakukan pembaruan sistem agar lebih cepat & nyaman.
  Perkiraan selesai: <b>${eta}</b>. Kamu bisa pantau status kami di bawah — makasih udah sabar! 🙏</p>
  <a class="btn" href="https://status.mulaiplus.id" target="_blank" rel="noopener">Cek Status Layanan</a>
  <div class="foot">MULAI+ · mulaiplus.id<br/>Tes Minat Bakat · AI Assistant Mul.ai</div>
</div>
</body></html>`,
      {
        status: 503,
        headers: {
          "content-type": wantsJson ? "application/json; charset=utf-8" : "text/html; charset=utf-8",
          "cache-control": "no-store",
          "retry-after": "1800",
        },
      },
    );
  },
} satisfies ExportedHandler;