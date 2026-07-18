import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ──
vi.mock("@mulai-plus/env/server", () => ({
  env: { ESIGN_SECRET: "test-secret" },
}));
vi.mock("@orpc/server", () => ({
  ORPCError: class extends Error {
    code = "";
    constructor(c: string, o?: any) {
      super(o?.message || c);
      this.code = c;
    }
  },
  os: {
    $context: () => {
      const p: any = () => p;
      p.input = () => p;
      p.handler = (fn: any) => ({ handler: fn });
      p.use = () => p;
      p.middleware = () => p;
      return p;
    },
  },
}));
vi.mock("@mulai-plus/db", () => {
  const ff = vi.fn();
  const fm = vi.fn();
  return {
    db: {
      query: { esignSignature: { findFirst: ff, findMany: fm } },
      insert: vi.fn(),
      update: vi.fn(),
      select: vi.fn(),
    },
    and: () => [],
    eq: () => ({}),
    desc: () => ({}),
    count: () => 0,
    sql: () => "",
  };
});
vi.mock("@mulai-plus/db/schema/esign", () => ({ esignSignature: {} }));
vi.mock("@mulai-plus/db/schema/audit", () => ({}));
vi.mock("@mulai-plus/db/schema/auth", () => ({}));
vi.mock("@mulai-plus/db/schema/programs", () => ({}));

import { esignRouter } from "../routers/esign";

describe("esignRouter", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── signDocument ──
  describe("signDocument", () => {
    it("generates HMAC token with dot separator", async () => {
      const m = await import("@mulai-plus/db");
      (m.db as any).query.esignSignature.findFirst.mockResolvedValue(null);
      const r = await (esignRouter.signDocument as any).handler({
        input: {
          signerName: "Salma",
          signerRole: "program_manager",
          documentId: "doc1",
          documentDate: "test",
        },
      });
      expect(r.token).toContain(".");
      expect(r.token.split(".")).toHaveLength(2);
    });

    it("works for founder role", async () => {
      const m = await import("@mulai-plus/db");
      (m.db as any).query.esignSignature.findFirst.mockResolvedValue(null);
      const r = await (esignRouter.signDocument as any).handler({
        input: {
          signerName: "Febby",
          signerRole: "founder",
          documentId: "doc2",
          documentDate: "test",
        },
      });
      expect(r.token).toContain(".");
    });
  });

  // ── verifySignature ──
  describe("verifySignature", () => {
    it("rejects malformed token", async () => {
      const r = await (esignRouter.verifySignature as any).handler({
        input: { token: "abc" },
      });
      expect(r.valid).toBe(false);
    });

    it("rejects tampered HMAC", async () => {
      const m = await import("@mulai-plus/db");
      (m.db as any).query.esignSignature.findFirst.mockResolvedValue(null);
      const signed = await (esignRouter.signDocument as any).handler({
        input: {
          signerName: "X",
          signerRole: "program_manager",
          documentId: "d1",
          documentDate: "t1",
        },
      });
      const [data] = signed.token.split(".");
      const fakeSig = "0".repeat(64);
      const r = await (esignRouter.verifySignature as any).handler({
        input: { token: `${data}.${fakeSig}` },
      });
      expect(r.valid).toBe(false);
    });

    it("returns signer details for valid token", async () => {
      const m = await import("@mulai-plus/db");
      (m.db as any).query.esignSignature.findFirst.mockResolvedValue(null);
      const signed = await (esignRouter.signDocument as any).handler({
        input: {
          signerName: "Febby",
          signerRole: "founder",
          documentId: "doc2",
          documentDate: "test",
        },
      });
      (m.db as any).query.esignSignature.findFirst.mockResolvedValue({
        verifiedCount: 0,
      });
      const r = await (esignRouter.verifySignature as any).handler({
        input: { token: signed.token },
      });
      expect(r.valid).toBe(true);
      expect(r.signerName).toBe("Febby");
      expect(r.documentId).toBe("doc2");
    });
  });

  // ── getSignaturesByDocument ──
  describe("getSignaturesByDocument", () => {
    it("returns signatures for document", async () => {
      const m = await import("@mulai-plus/db");
      (m.db.query.esignSignature.findMany as any).mockResolvedValue([
        { token: "t1", signerName: "Salma", signerRole: "program_manager" },
      ]);
      const r = await (esignRouter.getSignaturesByDocument as any).handler({
        input: { documentId: "doc1" },
      });
      expect(r).toHaveLength(1);
    });

    it("returns empty if none exist", async () => {
      const m = await import("@mulai-plus/db");
      (m.db.query.esignSignature.findMany as any).mockResolvedValue([]);
      const r = await (esignRouter.getSignaturesByDocument as any).handler({
        input: { documentId: "none" },
      });
      expect(r).toEqual([]);
    });
  });
});
