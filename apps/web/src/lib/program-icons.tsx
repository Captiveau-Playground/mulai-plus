import type { LucideIcon } from "lucide-react";
import {
  FlaskConical,
  Globe,
  GraduationCap,
  Heart,
  Languages,
  Leaf,
  Map as MapIcon,
  Monitor,
  Palette,
  Scale,
  Settings,
  TrendingUp,
  Wrench,
} from "lucide-react";

type IconMap = [string[], LucideIcon][];

const iconRules: IconMap = [
  // Kesehatan
  [
    [
      "kesehatan",
      "kedokteran",
      "keperawatan",
      "farmasi",
      "gizi",
      "kebidanan",
      "dokter",
      "perawat",
      "medis",
      "gigi",
      "ilmu kesehatan",
      "nutrisi",
      "psikologi",
      "terapi",
      "promosi kesehatan",
      "kesehatan masyarakat",
      "epidemiologi",
      "biomedis",
      "keperawatan gigi",
      "kebidanan",
      "keperawatan",
    ],
    Heart,
  ],

  // Teknik (non-IT)
  [
    [
      "teknik sipil",
      "teknik mesin",
      "teknik elektro",
      "teknik industri",
      "teknik kimia",
      "teknik pertambangan",
      "teknik perminyakan",
      "teknik geodesi",
      "teknik nuklir",
      "teknik penerbangan",
      "teknik perkapalan",
      "teknik lingkungan",
      "teknik fisika",
      "teknik material",
      "teknik metalurgi",
      "teknik otomotif",
      "teknik elektronika",
      "teknik telekomunikasi",
      "teknik bioproses",
      "teknik sistem",
      "teknik energi",
      "teknik kelautan",
      "teknik instrumentasi",
      "teknik dirgantara",
      "teknik pengairan",
      "teknik transportasi",
      "teknik konstruksi",
      "teknik produksi",
      "teknik tenaga",
      "teknik listrik",
      "teknik alat berat",
      "teknik perawatan",
      "teknik pembakaran",
      "arsitektur",
      "teknik arsitektur",
    ],
    Wrench,
  ],

  // IT / Komputer
  [
    [
      "informatika",
      "komputer",
      "sistem informasi",
      "teknologi informasi",
      "ilmu komputer",
      "teknik komputer",
      "rekayasa perangkat lunak",
      "data",
      "jaringan",
      "sistem komputer",
      "cyber",
      "keamanan informasi",
      "pemrograman",
      "kecerdasan buatan",
      "artificial intelligence",
      "machine learning",
      "software engineering",
    ],
    Monitor,
  ],

  // Ekonomi / Bisnis
  [
    [
      "ekonomi",
      "bisnis",
      "manajemen",
      "akuntansi",
      "keuangan",
      "perbankan",
      "pemasaran",
      "kewirausahaan",
      "administrasi niaga",
      "asuransi",
      "perpajakan",
      "logistik",
      "bisnis digital",
      "manajemen bisnis",
      "ekonomi syariah",
      "bisnis internasional",
    ],
    TrendingUp,
  ],

  // Hukum
  [["hukum"], Scale],

  // Pendidikan / Keguruan
  [
    [
      "pendidikan",
      "keguruan",
      "guru",
      "paud",
      "bimbingan konseling",
      "pedagogik",
      "tarbiyah",
      "ilmu pendidikan",
      "pendidikan guru",
      "pendidikan anak",
      "pendidikan luar biasa",
    ],
    GraduationCap,
  ],

  // Seni / Desain
  [
    [
      "seni",
      "desain",
      "musik",
      "tari",
      "teater",
      "seni rupa",
      "kriya",
      "film",
      "animasi",
      "broadcasting",
      "fotografi",
      "etnomusikologi",
      "koreografi",
      "seni karawitan",
      "seni pedalangan",
    ],
    Palette,
  ],

  // Pertanian / Peternakan
  [
    [
      "pertanian",
      "agribisnis",
      "agro",
      "peternakan",
      "perikanan",
      "kehutanan",
      "perkebunan",
      "pangan",
      "agroteknologi",
      "agronomi",
      "ilmu tanah",
      "proteksi tanaman",
      "penyuluhan pertanian",
      "teknologi hasil pertanian",
      "teknologi pangan",
      "teknologi hasil ternak",
    ],
    Leaf,
  ],

  // MIPA / Sains
  [
    [
      "matematika",
      "fisika",
      "kimia",
      "biologi",
      "statistika",
      "sains",
      "ilmu pengetahuan alam",
      "geofisika",
      "astronomi",
      "mikrobiologi",
      "biokimia",
      "biofisika",
      "ilmu kelautan",
      "oseanografi",
      "meteorologi",
      "geologi",
      "kartografi",
      "penginderaan jauh",
    ],
    FlaskConical,
  ],

  // Bahasa / Sastra
  [
    [
      "bahasa",
      "sastra",
      "linguistik",
      "inggris",
      "jepang",
      "mandarin",
      "arab",
      "prancis",
      "jerman",
      "korea",
      "rusia",
      "filologi",
      "penerjemahan",
      "sastra daerah",
      "sastra indonesia",
      "sastra inggris",
    ],
    Languages,
  ],

  // Sosial / Politik
  [
    [
      "sosiologi",
      "politik",
      "hubungan internasional",
      "antropologi",
      "komunikasi",
      "administrasi publik",
      "kesejahteraan sosial",
      "ilmu sosial",
      "ilmu politik",
      "pemerintahan",
      "kebijakan publik",
      "demografi",
      "kriminologi",
    ],
    Globe,
  ],

  // Pariwisata / Hospitality
  [
    [
      "pariwisata",
      "perhotelan",
      "hospitality",
      "travel",
      "wisata",
      "hotel",
      "restoran",
      "tata boga",
      "tata rias",
      "tata busana",
      "tata kecantikan",
    ],
    MapIcon,
  ],
];

/**
 * Map a program name to a matching icon based on keyword rules.
 * Falls back to Settings (gear) icon if no match is found.
 */
export function getProgramIcon(name: string): LucideIcon {
  const lower = name.toLowerCase();

  for (const [keywords, icon] of iconRules) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return icon;
      }
    }
  }

  return Settings;
}
