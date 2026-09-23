"""
Tool definitions for LLM function calling.

Each tool:
1. Has a JSON schema (for LLM)
2. Has an async handler (executes query, returns formatted string)
"""

from __future__ import annotations

from difflib import SequenceMatcher
from typing import Any

from src.db import query

# ─── Tool Schemas (for LLM function calling) ──────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_universities",
            "description": "Cari perguruan tinggi berdasarkan nama, kota/kabupaten, provinsi, jenis (Negeri/Swasta/Agama/Kedinasan), akreditasi, kategori PTN (Akademik/Vokasi/PTKIN), atau status PTN-BH. Hasil: nama, jenis, akreditasi, lokasi, jumlah prodi, rentang biaya kuliah.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Nama universitas atau kata kunci",
                    },
                    "city": {
                        "type": "string",
                        "description": "Filter berdasarkan kota/kabupaten (misal: Surabaya, Depok, Bandung)",
                    },
                    "province": {
                        "type": "string",
                        "description": "Filter berdasarkan provinsi (misal: Jawa Timur, DKI Jakarta)",
                    },
                    "type": {
                        "type": "string",
                        "enum": ["Negeri", "Swasta", "Agama", "Kedinasan"],
                        "description": "Filter jenis perguruan tinggi",
                    },
                    "accreditation": {
                        "type": "string",
                        "enum": ["Unggul", "Baik Sekali", "Baik"],
                        "description": "Filter akreditasi institusi",
                    },
                    "ptn_category": {
                        "type": "string",
                        "enum": ["PTN Akademik", "PTN Vokasi", "PTKIN"],
                        "description": "Kategori PTN (hanya untuk perguruan tinggi negeri)",
                    },
                    "is_ptnbh": {
                        "type": "boolean",
                        "description": "True = hanya PTN Berbadan Hukum (misal UI, UGM, ITB), False = non-PTNBH",
                    },
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_programs",
            "description": "Cari program studi berdasarkan nama, jenjang, nama universitas, akreditasi prodi, atau provinsi kampus. Hasil: nama prodi, jenjang, akreditasi, jumlah mahasiswa & dosen, universitas, lokasi.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Nama program studi atau kata kunci (misal: kedokteran, teknik informatika)",
                    },
                    "level": {
                        "type": "string",
                        "enum": ["S1", "D3", "D4", "S2", "S3", "Profesi"],
                        "description": "Filter jenjang pendidikan",
                    },
                    "university": {
                        "type": "string",
                        "description": "Nama universitas penyelenggara",
                    },
                    "accreditation": {
                        "type": "string",
                        "enum": ["Unggul", "Baik Sekali", "Baik"],
                        "description": "Filter akreditasi program studi",
                    },
                    "province": {
                        "type": "string",
                        "description": "Filter kampus di provinsi tertentu",
                    },
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_passing_grade",
            "description": "Ambil data passing grade SNBP/SNBT untuk program studi tertentu. Hasil: tahun, daya tampung, peminat, diterima, passing grade (%).",
            "parameters": {
                "type": "object",
                "properties": {
                    "program_name": {
                        "type": "string",
                        "description": "Nama program studi (misal: Kedokteran, Teknik Informatika)",
                    },
                    "university_name": {
                        "type": "string",
                        "description": "Nama universitas (opsional, untuk mempersempit pencarian)",
                    },
                    "year": {
                        "type": "integer",
                        "description": "Tahun (opsional, default 5 tahun terakhir)",
                    },
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_university_detail",
            "description": "Ambil detail lengkap universitas: alamat, website, email, telepon, akreditasi, jumlah prodi, dosen, mahasiswa, biaya kuliah, lama studi, tingkat kelulusan, tanggal berdiri, nama lama.",
            "parameters": {
                "type": "object",
                "properties": {
                    "university_name": {
                        "type": "string",
                        "description": "Nama universitas",
                    },
                },
                "additionalProperties": False,
                "required": ["university_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_program_detail",
            "description": "Ambil detail program studi: jenjang, akreditasi, jumlah mahasiswa, jumlah dosen, rasio dosen:mahasiswa, jumlah dosen NIDN/NIDK, persentase kelengkapan data.",
            "parameters": {
                "type": "object",
                "properties": {
                    "program_name": {
                        "type": "string",
                        "description": "Nama program studi (misal: Kedokteran, Teknik Informatika)",
                    },
                    "university_name": {
                        "type": "string",
                        "description": "Nama universitas (opsional, untuk mempersempit)",
                    },
                },
                "additionalProperties": False,
            },
        },
    },
]

# ─── Tool Handlers ───────────────────────────────────────────────

MAX_RESULTS = 8

# Normalisasi nama lokasi: buang semua karakter non-alphanumeric supaya
# 'D.K.I. Jakarta' bisa match dengan 'DKI Jakarta', 'Kota Surabaya' dgn 'Surabaya', dll.
def _loc_normalize(expr: str) -> str:
    return f"regexp_replace({expr}, '[^a-zA-Z0-9]', '', 'g')"


# Sinonim istilah prodi yang umum (data PDDIKTI pakai nama resmi)
TERM_SYNONYMS = {
    "kedokteran": ["dokter"],
    "dokter": ["kedokteran"],
    "keperawatan": ["nursing"],
    "hukum": [],
}


def _term_conditions(column: str, term: str, param_idx: int, params: list) -> list[str]:
    """Buat kondisi ILIKE untuk satu term + sinonimnya."""
    terms = [term] + TERM_SYNONYMS.get(term.lower(), [])
    conds = []
    for t in terms:
        conds.append(f"{column} ILIKE ${param_idx}")
        params.append(f"%{t}%")
        param_idx += 1
    return conds


# Alias tool name yang sering salah eja / salah sebut oleh LLM
TOOL_ALIASES = {
    "search_universitas": "search_universities",
    "search_university": "search_universities",
    "search_universities": "search_universities",
    "search_uni": "search_universities",
    "search_program": "search_programs",
    "search_program_studi": "search_programs",
    "search_programs": "search_programs",
    "get_passinggrade": "get_passing_grade",
    "get_passing_grades": "get_passing_grade",
    "get_passing_grade_data": "get_passing_grade",
    "get_university": "get_university_detail",
    "get_university_details": "get_university_detail",
    "university_detail": "get_university_detail",
    "detail_universitas": "get_university_detail",
    "get_program": "get_program_detail",
    "get_program_details": "get_program_detail",
    "program_detail": "get_program_detail",
    "detail_program": "get_program_detail",
    "detail_prodi": "get_program_detail",
}


def _normalize_tool_name(name: str) -> str:
    """Normalisasi nama tool: lowercase, buang non-alphanumeric."""
    return "".join(c for c in name.lower() if c.isalnum())


def _resolve_tool_name(name: str) -> str | None:
    """Resolve nama tool ke handler yang benar:
    1. exact match
    2. alias yang sudah diketahui
    3. fuzzy match (SequenceMatcher) terhadap nama tool terdaftar
    """
    if name in HANDLERS:
        return name
    if alias := TOOL_ALIASES.get(name):
        return alias

    normalized = _normalize_tool_name(name)
    known = {_normalize_tool_name(k): k for k in HANDLERS}
    if normalized in known:
        return known[normalized]

    # Fuzzy: cari yang paling mirip (tanpa underscore, huruf/angka saja)
    best: tuple[float, str | None] = (0.0, None)
    for norm_key, real_name in known.items():
        score = SequenceMatcher(None, normalized, norm_key).ratio()
        if score > best[0]:
            best = (score, real_name)
    if best[0] >= 0.72:
        return best[1]
    return None


async def handle_tool_call(name: str, args: dict[str, Any]) -> str:
    """Execute a tool and return a formatted string result."""

    resolved = _resolve_tool_name(name)
    if not resolved:
        return f"Error: tool '{name}' tidak dikenal."

    handler = HANDLERS[resolved]

    try:
        result = await handler(args)
        return result
    except Exception as e:
        print(f"[tools] Error in {resolved}: {e}")
        return f"Maaf, terjadi kesalahan saat mengambil data: {str(e)[:200]}"


async def _handle_search_universities(args: dict[str, Any]) -> str:
    conditions: list[str] = []
    params: list[Any] = []
    param_idx = 1

    if q := args.get("query"):
        conditions.append(f"u.name ILIKE ${param_idx}")
        params.append(f"%{q}%")
        param_idx += 1
    if city := args.get("city"):
        conditions.append(f"{_loc_normalize('u.regency')} ILIKE '%' || {_loc_normalize(f'${param_idx}')} || '%'")
        params.append(city)
        param_idx += 1
    if province := args.get("province"):
        conditions.append(f"{_loc_normalize('u.province')} ILIKE '%' || {_loc_normalize(f'${param_idx}')} || '%'")
        params.append(province)
        param_idx += 1
    if type_ := args.get("type"):
        conditions.append(f"u.type = ${param_idx}")
        params.append(type_)
        param_idx += 1
    if acc := args.get("accreditation"):
        # ILIKE biar match 'Unggul' maupun 'Terakreditasi Unggul'
        conditions.append(f"u.accreditation ILIKE ${param_idx}")
        params.append(f"%{acc}%")
        param_idx += 1
    if ptn_category := args.get("ptn_category"):
        conditions.append(f"su.type = ${param_idx}")
        params.append(ptn_category)
        param_idx += 1
    if args.get("is_ptnbh") is not None:
        conditions.append(f"su.is_ptnbh = ${param_idx}")
        params.append(1 if args.get("is_ptnbh") else 0)
        param_idx += 1

    where = " AND ".join(conditions) if conditions else "TRUE"

    sql = f"""
        SELECT u.name, u.type, u.province, u.regency, u.accreditation, u.tuition_range,
               COALESCE(lc.total_lecturers, 0) as total_lecturers,
               COALESCE(pc.total_programs, 0) as total_programs,
               su.type as ptn_category, su.is_ptnbh
        FROM universities u
        LEFT JOIN (
            SELECT DISTINCT ON (um.id_sp) um.id_sp, su.type, su.is_ptnbh
            FROM university_mappings um
            JOIN snpmb_universities su ON su.id_ptn = um.id_ptn
        ) su ON su.id_sp = u.id_sp
        LEFT JOIN lecturer_counts lc ON lc.id_sp = u.id_sp
        LEFT JOIN program_counts pc ON pc.id_sp = u.id_sp
        WHERE {where} AND u.status = 'Aktif'
        ORDER BY u.name
        LIMIT {MAX_RESULTS}
    """

    rows = await query(sql, *params)

    if not rows:
        return f"Tidak ditemukan universitas dengan kriteria tersebut."

    lines = [f"Ditemukan {len(rows)} universitas:"]
    for r in rows:
        acc = f" • Akreditasi: {r['accreditation']}" if r.get("accreditation") else ""
        prog = f" • {r['total_programs']} prodi" if r.get("total_programs") else ""
        badge = " 🏛️PTN-BH" if r.get("is_ptnbh") else ""
        lines.append(f"\n🏛️ **{r['name']}** ({r['type']}){badge}{acc}{prog}")
        lines.append(f"   📍 {r.get('regency') or '-'}, {r.get('province') or '-'}")
        if r.get("tuition_range"):
            lines.append(f"   💰 Biaya: {r['tuition_range']}")
        if r.get("ptn_category"):
            lines.append(f"   🏷️ {r['ptn_category']}")

    return "\n".join(lines)


async def _handle_search_programs(args: dict[str, Any]) -> str:
    conditions: list[str] = []
    params: list[Any] = []
    param_idx = 1

    if q := args.get("query"):
        # Term + sinonim (misal 'kedokteran' juga match 'Pendidikan Dokter')
        conditions.append(f"({' OR '.join(_term_conditions('sp.name', q, param_idx, params))})")
        param_idx += 1 + len(TERM_SYNONYMS.get(q.lower(), []))
    if level := args.get("level"):
        conditions.append(f"sp.level = ${param_idx}")
        params.append(level)
        param_idx += 1
    if uni := args.get("university"):
        conditions.append(f"u.name ILIKE ${param_idx}")
        params.append(f"%{uni}%")
        param_idx += 1
    if acc := args.get("accreditation"):
        # ILIKE biar match 'Unggul' maupun 'Terakreditasi Unggul'
        conditions.append(f"sp.accreditation ILIKE ${param_idx}")
        params.append(f"%{acc}%")
        param_idx += 1
    if province := args.get("province"):
        conditions.append(f"{_loc_normalize('u.province')} ILIKE '%' || {_loc_normalize(f'${param_idx}')} || '%'")
        params.append(province)
        param_idx += 1

    where = " AND ".join(conditions) if conditions else "TRUE"

    sql = f"""
        SELECT sp.name, sp.level, sp.accreditation, sp.total_students, sp.total_lecturers,
               u.name as university_name, u.province
        FROM study_programs sp
        JOIN universities u ON u.id_sp = sp.id_sp
        WHERE {where} AND sp.status = 'Aktif'
        ORDER BY sp.name
        LIMIT {MAX_RESULTS}
    """

    rows = await query(sql, *params)

    if not rows:
        return f"Tidak ditemukan program studi dengan kriteria tersebut."

    lines = [f"Ditemukan {len(rows)} program studi:"]
    for r in rows:
        acc = f" • Akreditasi: {r['accreditation']}" if r.get("accreditation") else ""
        stats = []
        if r.get("total_students"):
            stats.append(f"{r['total_students']} mahasiswa")
        if r.get("total_lecturers"):
            stats.append(f"{r['total_lecturers']} dosen")
        stat_str = f" • {' • '.join(stats)}" if stats else ""
        lines.append(f"\n📚 **{r['name']}** ({r['level']}){acc}{stat_str}")
        lines.append(f"   🏛️ {r['university_name']} — {r.get('province') or '-'}")

    return "\n".join(lines)


async def _handle_get_passing_grade(args: dict[str, Any]) -> str:
    program_name = args.get("program_name", "")
    university_name = args.get("university_name", "")
    year = args.get("year")

    conditions: list[str] = []
    params: list[Any] = []
    param_idx = 1

    # Search in both SNBP and SNBT via program mappings
    conditions.append(f"pddikti_program_name ILIKE ${param_idx}")
    params.append(f"%{program_name}%")
    param_idx += 1

    if university_name:
        conditions.append(f"u.name ILIKE ${param_idx}")
        params.append(f"%{university_name}%")
        param_idx += 1

    where = " AND ".join(conditions)

    # Find matching programs
    sql = f"""
        SELECT DISTINCT pm.snpmb_program_id, pm.snpmb_program_name,
               pm.level, u.name as university_name
        FROM program_mappings pm
        JOIN universities u ON u.id_sp = pm.id_sp
        WHERE {where}
        LIMIT 5
    """

    rows = await query(sql, *params)
    if not rows:
        return f"Tidak ditemukan data passing grade untuk program '{program_name}'."

    results = []
    for row in rows:
        prog_id = row["snpmb_program_id"]
        uni_name = row["university_name"]
        prog_name = row["snpmb_program_name"]
        level = row["level"] or ""

        # Get passing grade from both SNBP and SNBT
        pg_sql = """
            SELECT 'SNBP' as jalur, year, capacity, applicants, accepted,
                   ROUND(accepted::numeric / NULLIF(applicants, 0) * 100, 2) as passing_grade
            FROM snbp_capacity_history
            WHERE id_prodi = $1
              AND ($2::int IS NULL OR year = $2)
            UNION ALL
            SELECT 'SNBT' as jalur, year, capacity, applicants, accepted,
                   ROUND(accepted::numeric / NULLIF(applicants, 0) * 100, 2) as passing_grade
            FROM snbt_capacity_history
            WHERE id_prodi = $1
              AND ($2::int IS NULL OR year = $2)
            ORDER BY year DESC, jalur
            LIMIT 10
        """

        pg_rows = await query(pg_sql, prog_id, year)

        if pg_rows:
            results.append(f"\n📊 **{prog_name}** ({level}) — {uni_name}")
            for pg in pg_rows:
                pg_val = pg["passing_grade"]
                pg_str = f"{pg_val:.1f}%" if pg_val else "-"
                results.append(
                    f"   {pg['jalur']} {pg['year']}: {pg_str} (daya tampung: {pg['capacity']}, peminat: {pg['applicants']})"
                )

    if not results:
        return f"Data passing grade untuk '{program_name}' belum tersedia."

    return "\n".join(results)


async def _handle_get_university_detail(args: dict[str, Any]) -> str:
    uni_name = args.get("university_name", "")

    rows = await query(
        """
        SELECT u.*, ud.website, ud.email, ud.phone, ud.address, ud.subdistrict,
               ud.postal_code, ud.founded_date, ud.supervisor, ud.group_name,
               ss.avg_graduates, ss.avg_new_students, gr.graduation_rate,
               lc.total_lecturers, pc.total_programs, tf.tuition_range,
               su.type as ptn_category, su.is_ptnbh
        FROM universities u
        LEFT JOIN university_details ud ON ud.id_sp = u.id_sp
        LEFT JOIN student_stats ss ON ss.id_sp = u.id_sp
        LEFT JOIN graduation_rates gr ON gr.id_sp = u.id_sp
        LEFT JOIN lecturer_counts lc ON lc.id_sp = u.id_sp
        LEFT JOIN program_counts pc ON pc.id_sp = u.id_sp
        LEFT JOIN tuition_fees tf ON tf.id_sp = u.id_sp
        LEFT JOIN (
            SELECT DISTINCT ON (um.id_sp) um.id_sp, su.type, su.is_ptnbh
            FROM university_mappings um
            JOIN snpmb_universities su ON su.id_ptn = um.id_ptn
        ) su ON su.id_sp = u.id_sp
        WHERE u.name ILIKE $1 AND u.status = 'Aktif'
        LIMIT 1
        """,
        f"%{uni_name}%",
    )

    if not rows:
        return f"Universitas '{uni_name}' tidak ditemukan."

    r = rows[0]
    badge = " 🏛️PTN-BH" if r.get("is_ptnbh") else ""
    lines = [
        f"🏛️ **{r['name']}**{badge}",
        f"   Jenis: {r.get('type') or '-'}",
    ]
    if r.get("ptn_category"):
        lines.append(f"   Kategori: {r['ptn_category']}")
    lines.append(f"   Akreditasi: {r.get('accreditation') or '-'}")
    lines.append(f"   Lokasi: {r.get('regency') or '-'}, {r.get('province') or '-'}")
    lines.append(f"   Alamat: {r.get('address') or '-'}")
    if r.get("subdistrict"):
        lines.append(f"   Kecamatan: {r['subdistrict']}")
    if r.get("postal_code"):
        lines.append(f"   Kode pos: {r['postal_code']}")
    if r.get("founded_date"):
        lines.append(f"   📅 Berdiri: {r['founded_date']}")
    if r.get("website"):
        lines.append(f"   🌐 {r['website']}")
    if r.get("email"):
        lines.append(f"   📧 {r['email']}")
    if r.get("phone"):
        lines.append(f"   📞 {r['phone']}")
    if r.get("tuition_range"):
        lines.append(f"   💰 Biaya kuliah: {r['tuition_range']}")
    if r.get("total_programs"):
        lines.append(f"   📚 Program studi: {r['total_programs']}")
    if r.get("total_lecturers"):
        lines.append(f"   👨‍🏫 Dosen: {r['total_lecturers']}")
    if r.get("avg_graduates"):
        lines.append(f"   🎓 Rata-rata lulusan/tahun: {r['avg_graduates']}")
    if r.get("avg_new_students"):
        lines.append(f"   🆕 Rata-rata mahasiswa baru/tahun: {r['avg_new_students']}")
    if r.get("graduation_rate") is not None:
        lines.append(f"   📈 Tingkat kelulusan: {r['graduation_rate']}%")
    if r.get("supervisor"):
        lines.append(f"   🏢 Pembina: {r['supervisor']}")

    # Lama studi per jenjang
    durations = await query(
        "SELECT level, avg_duration_years FROM study_durations WHERE id_sp = $1 AND avg_duration_years IS NOT NULL ORDER BY level",
        rows[0]["id_sp"],
    )
    if durations:
        dur_str = ", ".join(f"{d['level']}: ~{d['avg_duration_years']} tahun" for d in durations)
        lines.append(f"   ⏳ Lama studi: {dur_str}")

    # Nama lama
    old_names = await query(
        "SELECT old_name, year_changed FROM name_histories WHERE id_sp = $1 ORDER BY year_changed",
        rows[0]["id_sp"],
    )
    if old_names:
        names_str = ", ".join(
            f"{n['old_name']} (berubah {n['year_changed']})" if n.get("year_changed") else n["old_name"]
            for n in old_names
        )
        lines.append(f"   🕰️ Sebelumnya: {names_str}")

    return "\n".join(lines)


async def _handle_get_program_detail(args: dict[str, Any]) -> str:
    program_name = args.get("program_name", "")
    university_name = args.get("university_name", "")

    # Term + sinonim (misal 'kedokteran' juga match 'Pendidikan Dokter')
    params: list[Any] = []
    term_conds: list[str] = []
    terms = ([program_name] + TERM_SYNONYMS.get(program_name.lower(), [])) if program_name else []
    for t in terms:
        term_conds.append(f"sp.name ILIKE ${len(params) + 1}")
        params.append(f"%{t}%")

    conditions = [f"({' OR '.join(term_conds) if term_conds else 'TRUE'})", "sp.status = 'Aktif'"]
    if university_name:
        conditions.append(f"u.name ILIKE ${len(params) + 1}")
        params.append(f"%{university_name}%")

    where = " AND ".join(conditions)
    sql = f"""
        SELECT sp.id_sms, sp.name, sp.level, sp.accreditation, sp.total_students,
               sp.total_lecturers, sp.teaching_lecturers, sp.ratio,
               sp.lecturers_nidn, sp.lecturers_nidk, sp.data_completeness,
               u.name as university_name, u.province, u.regency
        FROM study_programs sp
        JOIN universities u ON u.id_sp = sp.id_sp
        WHERE {where}
        ORDER BY sp.name
        LIMIT 3
    """

    rows = await query(sql, *params)
    if not rows:
        return f"Program studi '{program_name}' tidak ditemukan."

    lines = []
    for r in rows:
        lines.append(f"\n📚 **{r['name']}** ({r['level']}) — {r['university_name']}")
        lines.append(f"   🏛️ {r.get('regency') or '-'}, {r.get('province') or '-'}")
        if r.get("accreditation"):
            lines.append(f"   ⭐ Akreditasi: {r['accreditation']}")
        if r.get("total_students"):
            lines.append(f"   👩‍🎓 Mahasiswa: {r['total_students']}")
        if r.get("total_lecturers"):
            lines.append(f"   👨‍🏫 Dosen: {r['total_lecturers']} (mengajar: {r.get('teaching_lecturers') or '-'})")
        if r.get("lecturers_nidn"):
            lines.append(f"   🆔 Dosen NIDN: {r['lecturers_nidn']}, NIDK: {r.get('lecturers_nidk') or 0}")
        if r.get("ratio"):
            lines.append(f"   ⚖️ Rasio dosen:mahasiswa: {r['ratio']}")
        if r.get("data_completeness") is not None:
            lines.append(f"   📊 Kelengkapan data: {r['data_completeness']}%")

    return "\n".join(lines)


HANDLERS = {
    "search_universities": _handle_search_universities,
    "search_programs": _handle_search_programs,
    "get_passing_grade": _handle_get_passing_grade,
    "get_university_detail": _handle_get_university_detail,
    "get_program_detail": _handle_get_program_detail,
}
