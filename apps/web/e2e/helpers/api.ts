// Klien oRPC untuk e2e.
// - rpc(): dari Node (tanpa cookie) → untuk prosedur publik (discover.*)
// - adminRpc(): dari konteks browser (cookie sesi login) → untuk discoverAdmin.*
import type { Page } from "@playwright/test";
import { API_URL, RPC_URL } from "./env";

export type RpcResult<T = any> = T & { ok?: boolean; error?: string };

/** Panggil oRPC dari Node tanpa sesi. */
export async function rpc<T = any>(path: string, input: unknown = {}): Promise<RpcResult<T>> {
  const res = await fetch(`${RPC_URL}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ json: input }),
  });
  const raw = await res.text();
  let parsed: any = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: `http_${res.status}: ${raw.slice(0, 160)}` } as RpcResult<T>;
  }
  if (res.status >= 400 && !parsed?.json) {
    return { ok: false, error: parsed?.message ?? `http_${res.status}` } as RpcResult<T>;
  }
  return (parsed?.json ?? parsed) as RpcResult<T>;
}

/** Panggil oRPC dari halaman yang sudah login → cookie sesi ikut terkirim. */
export async function adminRpc<T = any>(page: Page, path: string, input: unknown = {}): Promise<RpcResult<T>> {
  return page.evaluate(
    async ([base, p, body]) => {
      const res = await fetch(`${base}/rpc/${p}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ json: body }),
      });
      const raw = await res.text();
      try {
        const j = JSON.parse(raw);
        return j?.json ?? j;
      } catch {
        return { ok: false, error: `http_${res.status}: ${raw.slice(0, 160)}` };
      }
    },
    [API_URL, path, input] as const,
  ) as Promise<RpcResult<T>>;
}

/** Buat akun lewat Better Auth (dipakai untuk user/admin e2e). */
export async function signUpViaApi(name: string, email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3001" },
    body: JSON.stringify({ name, email, password }),
  });
  const raw = await res.text();
  let j: any = null;
  try {
    j = JSON.parse(raw);
  } catch {
    /* noop */
  }
  return { ok: res.ok && !!j?.user?.id, userId: j?.user?.id as string | undefined, raw: raw.slice(0, 240) };
}
