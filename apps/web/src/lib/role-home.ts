/**
 * Beranda per role — SATU sumber kebenaran.
 *
 * Sebelumnya rantai `if (role === ...)` disalin di beberapa tempat (form login,
 * halaman login, halaman /dashboard) dan sempat tertinggal saat role B2B
 * (`school_admin`/`school_viewer`) ditambahkan — akibatnya admin sekolah
 * dilempar ke dashboard siswa. Semua redirect/navigasi berbasis role sekarang
 * memakai fungsi ini.
 */
export function homeForRole(role?: string | null): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "mentor":
      return "/mentor";
    case "program_manager":
      return "/program-manager/programs";
    case "school_admin":
    case "school_viewer":
      return "/sekolah";
    default:
      return "/dashboard/student";
  }
}

/** Benarkah role ini termasuk pengguna area sekolah (B2B)? */
export function isSchoolRole(role?: string | null): boolean {
  return role === "school_admin" || role === "school_viewer";
}
