import type { AppContext } from "../config";

/** Akses quota harian per tier via RateLimitDO (binding sama dengan rate-limit). */
export function dailyStub(
  c: AppContext,
  entityKey: string,
): { checkDaily: (t: string, l: number) => Promise<boolean>; peekDaily: (t: string) => Promise<number> } | null {
  const binding = (c.env as { RATE_LIMIT_DO?: DurableObjectNamespace }).RATE_LIMIT_DO;
  if (!binding) return null;
  return binding.get(binding.idFromName(entityKey)) as unknown as {
    checkDaily: (t: string, l: number) => Promise<boolean>;
    peekDaily: (t: string) => Promise<number>;
  };
}
