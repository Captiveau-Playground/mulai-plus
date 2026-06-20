export function getSentryEnvironment(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (url.includes("localhost") || url.includes("127.0.0.1")) return "development";
  if (url.includes("staging")) return "staging";
  return "production";
}
