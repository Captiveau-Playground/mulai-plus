// Guard pengiriman email — mencegah email sungguhan terkirim ke alamat uji.
//
// Insiden 24 Okt 2026: notifikasi otomatis mengirim ke akun e2e `@test.local`
// sehingga Resend mencatat bounce dan kuota harian terkuras. Semua pemanggil
// (mail, notify-user, dsb.) sekarang lewat guard ini.

/**
 * Domain yang TIDAK BOLEH dikirimi email sungguhan: TLD reservasi
 * (RFC 2606/6761: `.test`, `.invalid`, `.localhost`), `example.com/org/net`,
 * dan `*.local` (mDNS).
 */
const RESERVED_DOMAIN = /^example\.(?:com|org|net)$/i;
const RESERVED_TLD = /\.(?:test|invalid|localhost|local)$/i;

export function isTestRecipient(email: string | null | undefined): boolean {
  if (!email) return false;
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase();
  if (!domain) return false;
  if (domain === "localhost") return true;
  return RESERVED_DOMAIN.test(domain) || RESERVED_TLD.test(domain);
}

/** Kill-switch environment (staging/lokal): `EMAIL_SENDING_DISABLED=1`. */
export function emailSendingDisabled(): boolean {
  return process.env.EMAIL_SENDING_DISABLED === "1" || process.env.DISABLE_EMAIL === "1";
}

let warned = false;

/**
 * Apakah pengiriman ke `to` harus dilewati? Menulis satu log per proses
 * supaya penyebabnya terlihat tanpa membanjiri log.
 */
export function shouldSkipEmail(to: string | string[] | null | undefined): boolean {
  const list = Array.isArray(to) ? to : to ? [to] : [];
  for (const addr of list) {
    if (isTestRecipient(addr)) {
      if (!warned) {
        warned = true;
        console.log(`[email] dilewati: alamat uji (${addr}) — email tidak dikirim`);
      }
      return true;
    }
  }
  return emailSendingDisabled();
}
