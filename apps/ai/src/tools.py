"""
Tool definitions for LLM function calling.

Each tool:
1. Has a JSON schema (for LLM)
2. Has an async handler (executes query, returns formatted string)
"""

from __future__ import annotations

from typing import Any

from src.db import query

# ─── Tool Schemas (for LLM function calling) ──────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_universities",
            "description": "Cari perguruan tinggi berdasarkan nama, kota, provinsi, atau akreditasi. Hasil: nama, jenis, akreditasi, kota, provinsi.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Nama universitas atau kata kunci",
                    },
                    "city": {
                        "type": "string",
                        "description": "Filter berdasarkan kota/kabupaten",
                    },
                    "province": {
                        "type": "string",
                        "description": "Filter berdasarkan provinsi",
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
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_programs",
            "description": "Cari program studi berdasarkan nama, jenjang, atau nama universitas. Hasil: nama prodi, jenjang, universitas, akreditasi prodi.",
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
                },
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
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_university_detail",
            "description": "Ambil detail lengkap universitas: alamat, website, email, akreditasi, jumlah prodi, dosen, mahasiswa.",
            "parameters": {
                "type": "object",
                "properties": {
                    "university_name": {
                        "type": "string",
                        "description": "Nama universitas",
                    },
                },
                "required": ["university_name"],
            },
        },
    },
]

# ─── Tool Handlers ───────────────────────────────────────────────

MAX_RESULTS = 8


async def handle_tool_call(name: str, args: dict[str, Any]) -> str:
    """Execute a tool and return a formatted string result."""

    handler_name = f"_handle_{name}"

    handler = HANDLERS.get(name)
    if not handler:
        return f"Error: tool '{name}' tidak dikenal."

    try:
        result = await handler(args)
        return result
    except Exception as e:
        print(f"[tools] Error in {name}: {e}")
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
        conditions.append(f"u.regency ILIKE ${param_idx}")
        params.append(f"%{city}%")
        param_idx += 1
    if province := args.get("province"):
        conditions.append(f"u.province ILIKE ${param_idx}")
        params.append(f"%{province}%")
        param_idx += 1
    if type_ := args.get("type"):
        conditions.append(f"u.type = ${param_idx}")
        params.append(type_)
        param_idx += 1
    if acc := args.get("accreditation"):
        conditions.append(f"u.accreditation = ${param_idx}")
        params.append(acc)
        param_idx += 1

    where = " AND ".join(conditions) if conditions else "TRUE"

    sql = f"""
        SELECT u.name, u.type, u.province, u.regency, u.accreditation,
               COALESCE(lc.total_lecturers, 0) as total_lecturers,
               COALESCE(pc.total_programs, 0) as total_programs
        FROM universities u
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
        lines.append(f"\n🏛️ **{r['name']}** ({r['type']}){acc}{prog}")
        lines.append(f"   📍 {r.get('regency') or '-'}, {r.get('province') or '-'}")

    return "\n".join(lines)


async def _handle_search_programs(args: dict[str, Any]) -> str:
    conditions: list[str] = []
    params: list[Any] = []
    param_idx = 1

    if q := args.get("query"):
        conditions.append(f"sp.name ILIKE ${param_idx}")
        params.append(f"%{q}%")
        param_idx += 1
    if level := args.get("level"):
        conditions.append(f"sp.level = ${param_idx}")
        params.append(level)
        param_idx += 1
    if uni := args.get("university"):
        conditions.append(f"u.name ILIKE ${param_idx}")
        params.append(f"%{uni}%")
        param_idx += 1
    if acc := args.get("accreditation"):
        conditions.append(f"sp.accreditation = ${param_idx}")
        params.append(acc)
        param_idx += 1

    where = " AND ".join(conditions) if conditions else "TRUE"

    sql = f"""
        SELECT sp.name, sp.level, sp.accreditation, u.name as university_name, u.province
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
        lines.append(f"\n📚 **{r['name']}** ({r['level']}){acc}")
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
        SELECT u.*, ud.website, ud.email, ud.phone, ud.address,
               ss.avg_graduates, ss.avg_new_students,
               lc.total_lecturers, pc.total_programs
        FROM universities u
        LEFT JOIN university_details ud ON ud.id_sp = u.id_sp
        LEFT JOIN student_stats ss ON ss.id_sp = u.id_sp
        LEFT JOIN lecturer_counts lc ON lc.id_sp = u.id_sp
        LEFT JOIN program_counts pc ON pc.id_sp = u.id_sp
        WHERE u.name ILIKE $1 AND u.status = 'Aktif'
        LIMIT 1
        """,
        f"%{uni_name}%",
    )

    if not rows:
        return f"Universitas '{uni_name}' tidak ditemukan."

    r = rows[0]
    lines = [
        f"🏛️ **{r['name']}**",
        f"   Jenis: {r.get('type') or '-'}",
        f"   Akreditasi: {r.get('accreditation') or '-'}",
        f"   Lokasi: {r.get('regency') or '-'}, {r.get('province') or '-'}",
        f"   Alamat: {r.get('address') or '-'}",
    ]
    if r.get("website"):
        lines.append(f"   🌐 {r['website']}")
    if r.get("email"):
        lines.append(f"   📧 {r['email']}")
    if r.get("phone"):
        lines.append(f"   📞 {r['phone']}")
    if r.get("total_programs"):
        lines.append(f"   📚 Program studi: {r['total_programs']}")
    if r.get("total_lecturers"):
        lines.append(f"   👨‍🏫 Dosen: {r['total_lecturers']}")
    if r.get("avg_graduates"):
        lines.append(f"   🎓 Rata-rata lulusan/tahun: {r['avg_graduates']}")

    return "\n".join(lines)


HANDLERS = {
    "search_universities": _handle_search_universities,
    "search_programs": _handle_search_programs,
    "get_passing_grade": _handle_get_passing_grade,
    "get_university_detail": _handle_get_university_detail,
}
