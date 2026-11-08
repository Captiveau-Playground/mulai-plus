/**
 * Feature flag rilis bertahap.
 *
 * B2B (sekolah: pendaftaran, portal sekolah, batch/kelas, verifikasi) DINONAKTIFKAN
 * secara default sampai rilis bertahap siap. Semua data B2B tetap tersimpan; hanya
 * pintu masuknya (login sekolah, pendaftaran, portal, menu admin) yang disembunyikan.
 *
 * Aktifkan lewat env: `NEXT_PUBLIC_B2B_ENABLED=1` (web) lalu deploy ulang.
 */
export const B2B_ENABLED = process.env.NEXT_PUBLIC_B2B_ENABLED === "1";
