import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@orpc/server", () => {
  class E extends Error {
    code = "";
    constructor(c: string, o?: any) {
      super(o?.message || c);
      this.code = c;
    }
  }
  const p = () => {
    const x: any = () => x;
    x.input = () => x;
    x.handler = (fn: any) => ({ handler: fn });
    x.use = () => x;
    x.middleware = () => x;
    return x;
  };
  return { ORPCError: E, os: { $context: () => p() } };
});

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

// ESIGN_SECRET is set via CI/CD env or .env file
// For local dev, ensure ESIGN_SECRET is set in your env

import { esignRouter } from "../routers/esign";

describe("esignRouter", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("signDocument", () => {
    it("generates HMAC token", async () => {
      const { db } = await import("@mulai-plus/db");
      (db.query.esignSignature.findFirst as any).mockResolvedValue(null);
      const r = await (esignRouter.signDocument as any).handler({
        input: { signerName: "Salma", signerRole: "program_manager", documentId: "doc1", documentDate: "test" },
      });
      expect(r.token).toContain(".");
    });
    it("works for founder role", async () => {
      const { db } = await import("@mulai-plus/db");
      (db.query.esignSignature.findFirst as any).mockResolvedValue(null);
      const r = await (esignRouter.signDocument as any).handler({
        input: { signerName: "Febby", signerRole: "founder", documentId: "doc2", documentDate: "test" },
      });
      expect(r.token).toContain(".");
    });
  });

  describe("verifySignature", () => {
    it("rejects malformed", async () => {
      const r = await (esignRouter.verifySignature as any).handler({ input: { token: "abc" } });
      expect(r.valid).toBe(false);
    });
    it("rejects tampered", async () => {
      const { db } = await import("@mulai-plus/db");
      (db.query.esignSignature.findFirst as any).mockResolvedValue(null);
      const signed = await (esignRouter.signDocument as any).handler({
        input: { signerName: "X", signerRole: "program_manager", documentId: "d1", documentDate: "t1" },
      });
      const [data] = signed.token.split(".");
      const r = await (esignRouter.verifySignature as any).handler({ input: { token: `${data}.${"0".repeat(64)}` } });
      expect(r.valid).toBe(false);
    });
    it("returns valid for genuine", async () => {
      const { db } = await import("@mulai-plus/db");
      (db.query.esignSignature.findFirst as any).mockResolvedValue(null);
      const signed = await (esignRouter.signDocument as any).handler({
        input: { signerName: "Febby", signerRole: "founder", documentId: "doc2", documentDate: "test" },
      });
      (db.query.esignSignature.findFirst as any).mockResolvedValue({ verifiedCount: 0 });
      const r = await (esignRouter.verifySignature as any).handler({ input: { token: signed.token } });
      expect(r.valid).toBe(true);
      expect(r.signerName).toBe("Febby");
    });
  });

  describe("getSignaturesByDocument", () => {
    it("returns list", async () => {
      const { db } = await import("@mulai-plus/db");
      (db.query.esignSignature.findMany as any).mockResolvedValue([
        { token: "t1", signerName: "Salma", signerRole: "program_manager" },
      ]);
      const r = await (esignRouter.getSignaturesByDocument as any).handler({ input: { documentId: "doc1" } });
      expect(r).toHaveLength(1);
    });
    it("returns empty", async () => {
      const { db } = await import("@mulai-plus/db");
      (db.query.esignSignature.findMany as any).mockResolvedValue([]);
      const r = await (esignRouter.getSignaturesByDocument as any).handler({ input: { documentId: "none" } });
      expect(r).toEqual([]);
    });
  });
});
