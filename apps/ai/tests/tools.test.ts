import { describe, expect, test } from "bun:test";
import { buildSearchPrograms, buildSearchUniversities, resolveToolName } from "../src/tools/execute";

describe("tool SQL builder", () => {
  test("search_universities: kondisi query + city", () => {
    const { sql, params } = buildSearchUniversities({ query: "UI", province: "DKI Jakarta", is_ptnbh: true });
    expect(sql).toContain("u.name ILIKE $1");
    expect(sql).toContain("u.province");
    expect(sql).toContain("su.is_ptnbh = $3");
    expect(sql).toContain("status = 'Aktif'");
    expect(params).toEqual(["%UI%", "DKI Jakarta", 1]);
  });

  test("search_programs: term + sinonim kedokteran", () => {
    const { sql, params } = buildSearchPrograms({ query: "kedokteran" });
    expect(sql).toContain("sp.name ILIKE $1 OR sp.name ILIKE $2");
    expect(params).toEqual(["%kedokteran%", "%dokter%"]);
  });

  test("resolveToolName: alias + fuzzy", () => {
    expect(resolveToolName("search_universitas")).toBe("search_universities");
    expect(resolveToolName("get_passinggrade")).toBe("get_passing_grade");
    expect(resolveToolName("search_uni")).toBe("search_universities");
    expect(resolveToolName("get_passing_grade")).toBe("get_passing_grade");
    expect(resolveToolName("acakxy")).toBeNull();
  });
});
