/** id pendek acak (24-karakternetral) — ganti via nanoid bila tersedia. */
export function nanoidish(len = 24): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  const arr = new Uint8Array(len);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(arr);
  else for (let i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 256);
  for (let i = 0; i < len; i++) s += chars[arr[i] % chars.length];
  return s;
}
