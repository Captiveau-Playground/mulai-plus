/**
 * Kebijakan kuota chatbot (pure — mudah di-test).
 *
 *  - NON-AUTH (guest): dibatasi 3 pesan per session.
 *  - AUTH (logged-in): UNLIMITED — proteksinya rate limit 15 req/menit (lihat rate-limit.ts).
 */
export const GUEST_QUOTA_MAX = 3;

export type QuotaPolicy = {
  max: number; // Infinity = unlimited
  exhaustedMessage: string;
};

export function quotaPolicy(isAuth: boolean): QuotaPolicy {
  if (isAuth) {
    return { max: Number.POSITIVE_INFINITY, exhaustedMessage: "" };
  }
  return {
    max: GUEST_QUOTA_MAX,
    exhaustedMessage:
      "Kamu sudah memakai 3 chat gratis. Login untuk lanjut tanpa batas — dan bisa lanjut ngobrol sepuasnya! 🚀",
  };
}

/** Apakah pemakaian = max untuk non-auth (auth selalu boleh). */
export function quotaExhausted(isAuth: boolean, used: number): boolean {
  const policy = quotaPolicy(isAuth);
  return used >= policy.max;
}
