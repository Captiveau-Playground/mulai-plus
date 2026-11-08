// URL WEB (frontend) untuk semua link yang dibagikan ke pengguna.
//
// Kenapa dipisah: `APP_URL` pernah diisi dengan URL BACKEND (port 3000) sehingga
// link undangan/referral mengarah ke API, bukan ke aplikasi web. Helper ini:
//  • memakai `WEB_URL` bila ada (paling eksplisit),
//  • lalu `APP_URL`,
//  • lalu default http://localhost:3001,
//  • dan MENOLAK URL yang jelas-jelas backend (port API) dengan fallback aman + warning.

const DEFAULT_WEB = "http://localhost:3001";

/** Port backend yang tidak boleh dipakai untuk link web. */
function looksLikeApiBase(url: string): boolean {
  try {
    const u = new URL(url);
    const api = process.env.SERVER_URL || process.env.BETTER_AUTH_URL || "";
    if (api) {
      try {
        const a = new URL(api);
        if (a.host === u.host) return true;
      } catch {
        /* abaikan */
      }
    }
    // dev: backend 3000, web 3001
    const isLocal = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    return isLocal && u.port === "3000";
  } catch {
    return false;
  }
}

let warned = false;

/** Base URL web tanpa trailing slash, siap dipakai untuk menyusun link. */
export function webBaseUrl(): string {
  const candidates = [process.env.WEB_URL, process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL].filter(
    (v): v is string => !!v && v.trim().length > 0,
  );

  for (const candidate of candidates) {
    const url = candidate.replace(/\/$/, "");
    if (looksLikeApiBase(url)) {
      if (!warned) {
        warned = true;
        console.warn(
          `[config] URL web "${url}" tampak seperti URL BACKEND — dilewati. ` +
            "Set WEB_URL (atau APP_URL) ke alamat frontend, mis. http://localhost:3001.",
        );
      }
      continue;
    }
    return url;
  }
  return DEFAULT_WEB;
}

/** Path lengkap di web, mis. `webUrl("/assessment/invite/ABC123")`. */
export function webUrl(path: string): string {
  const base = webBaseUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
