import { createHmac, randomUUID } from "node:crypto";
import { and, count, db, desc, eq, sql } from "@mulai-plus/db";
import { auditLog } from "@mulai-plus/db/schema/audit";
import { esignSignature } from "@mulai-plus/db/schema/esign";
import { env } from "@mulai-plus/env/server";
import { z } from "zod";
import { adminProcedure, publicProcedure } from "../index";

// ── HMAC Signing ──
const SECRET = env.ESIGN_SECRET;

function b64url(data: string): string {
  return Buffer.from(data, "utf-8")
    .toString("base64")
    .replace(/[+/]/g, (c) => (c === "+" ? "-" : "_"))
    .replace(/=+$/, "");
}

function b64urlDecode(str: string): string {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return Buffer.from(b64, "base64").toString("utf-8");
}

function hmacSign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("hex");
}

function createSignedToken(payload: Record<string, unknown>): string {
  const data = JSON.stringify(payload);
  const encoded = b64url(data);
  const sig = hmacSign(data);
  return `${encoded}.${sig}`;
}

function verifySignedToken(token: string): { valid: boolean; payload: Record<string, unknown> | null } {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return { valid: false, payload: null };

  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^[0-9a-f]{64}$/i.test(sig)) return { valid: false, payload: null };

  try {
    const data = b64urlDecode(encoded);
    const expectedSig = hmacSign(data);
    if (sig !== expectedSig) return { valid: false, payload: null };
    return { valid: true, payload: JSON.parse(data) };
  } catch {
    return { valid: false, payload: null };
  }
}

export const esignRouter = {
  /**
   * Generate an HMAC-signed e-signature token.
   * Stateless (HMAC) + DB audit trail.
   */
  signDocument: publicProcedure
    .input(
      z.object({
        signerName: z.string(),
        signerRole: z.enum(["program_manager", "founder"]),
        documentId: z.string(),
        documentDate: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const payload = { n: input.signerName, r: input.signerRole, d: input.documentId, t: input.documentDate };
      const token = createSignedToken(payload);

      // DB audit trail
      try {
        const existing = await db.query.esignSignature.findFirst({
          where: and(eq(esignSignature.documentId, input.documentId), eq(esignSignature.signerRole, input.signerRole)),
        });
        if (!existing) {
          await db.insert(esignSignature).values({
            id: randomUUID(),
            token,
            documentType: "summary_report",
            documentId: input.documentId,
            signerName: input.signerName,
            signerRole: input.signerRole,
            documentHash: hmacSign(input.documentId),
          });

          await db.insert(auditLog).values({
            id: randomUUID(),
            action: "ESIGN_CREATED",
            resource: "esign_signature",
            resourceId: input.documentId,
            details: { signerName: input.signerName, signerRole: input.signerRole, token },
          });
        }
      } catch {
        // DB failure doesn't block QR
      }

      return { token, url: `/verify/signature/${token}` };
    }),

  /**
   * Verify an HMAC-signed token.
   */
  verifySignature: publicProcedure.input(z.object({ token: z.string() })).handler(async ({ input }) => {
    const { valid, payload } = verifySignedToken(input.token);
    if (!valid || !payload) {
      return { valid: false, message: "Tanda tangan digital tidak valid atau telah diubah." };
    }

    let dbRecord = null;
    try {
      dbRecord = await db.query.esignSignature.findFirst({ where: eq(esignSignature.token, input.token) });
      if (dbRecord) {
        await db
          .update(esignSignature)
          .set({ verifiedCount: (dbRecord.verifiedCount ?? 0) + 1, lastVerifiedAt: new Date() })
          .where(eq(esignSignature.token, input.token));
      }
    } catch {
      // noop
    }

    return {
      valid: true,
      signerName: payload.n,
      signerRole: payload.r,
      documentId: payload.d,
      documentDate: payload.t,
      verifiedAt: new Date().toISOString(),
      totalVerifications: (dbRecord?.verifiedCount ?? 0) + 1,
    };
  }),

  /**
   * List all signatures (admin).
   */
  listSignatures: adminProcedure
    .input(
      z
        .object({
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
        .optional(),
    )
    .handler(async ({ input }) => {
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const items = await db
        .select()
        .from(esignSignature)
        .orderBy(desc(esignSignature.createdAt))
        .limit(limit)
        .offset(offset);

      const [total] = await db.select({ count: count() }).from(esignSignature);

      return {
        data: items.map((s) => ({
          ...s,
          createdAt: s.createdAt?.toISOString() ?? null,
          lastVerifiedAt: s.lastVerifiedAt?.toISOString() ?? null,
        })),
        pagination: { total: total?.count ?? 0, limit, offset },
      };
    }),

  /**
   * Get signature stats (admin).
   */
  getStats: adminProcedure.handler(async () => {
    const [total] = await db.select({ count: count() }).from(esignSignature);
    const [totalVerified] = await db
      .select({ count: count() })
      .from(esignSignature)
      .where(sql`${esignSignature.verifiedCount} > 0`);

    const roleDistribution = await db
      .select({
        role: esignSignature.signerRole,
        count: count(),
      })
      .from(esignSignature)
      .groupBy(esignSignature.signerRole);

    const recent = await db.select().from(esignSignature).orderBy(desc(esignSignature.createdAt)).limit(5);

    return {
      total: total?.count ?? 0,
      totalVerified: totalVerified?.count ?? 0,
      roleDistribution,
      recent: recent.map((s) => ({
        signerName: s.signerName,
        signerRole: s.signerRole,
        documentId: s.documentId,
        createdAt: s.createdAt?.toISOString(),
        verifiedCount: s.verifiedCount,
      })),
    };
  }),

  /**
   * Get signatures for a specific document (used by student page).
   */
  getSignaturesByDocument: publicProcedure.input(z.object({ documentId: z.string() })).handler(async ({ input }) => {
    const records = await db.query.esignSignature.findMany({
      where: eq(esignSignature.documentId, input.documentId),
      orderBy: [desc(esignSignature.createdAt)],
    });

    return records.map((r) => ({
      token: r.token,
      signerName: r.signerName,
      signerRole: r.signerRole,
      url: `/verify/signature/${r.token}`,
    }));
  }),
};

// ── Exported utilities ──
export { createSignedToken, hmacSign };
