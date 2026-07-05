import { createHmac, randomUUID } from "node:crypto";
import { and, db, eq } from "@mulai-plus/db";
import { esignSignature } from "@mulai-plus/db/schema/esign";
import { env } from "@mulai-plus/env/server";
import { z } from "zod";
import { publicProcedure } from "../index";

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

  // Validate hex signature
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
   * Generate an HMAC-signed e-signature token for a signer.
   * Stateless — token contains all data + HMAC signature.
   * Also stored in DB for audit trail.
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
      const payload = {
        n: input.signerName,
        r: input.signerRole,
        d: input.documentId,
        t: input.documentDate,
      };

      const token = createSignedToken(payload);

      // Save to DB for audit trail (optional — HMAC alone is sufficient)
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
        }
      } catch {
        // DB failure doesn't block QR generation
      }

      return { token, url: `/verify/signature/${token}` };
    }),

  /**
   * Verify an HMAC-signed token.
   * First validates HMAC (cryptographic), then enriches with DB data if available.
   */
  verifySignature: publicProcedure.input(z.object({ token: z.string() })).handler(async ({ input }) => {
    // 1. HMAC verification (cryptographic — works even without DB)
    const { valid, payload } = verifySignedToken(input.token);
    if (!valid || !payload) {
      return { valid: false, message: "Tanda tangan digital tidak valid atau telah diubah." };
    }

    // 2. DB enrichment (optional — for audit trail + extra validation)
    let dbRecord = null;
    try {
      dbRecord = await db.query.esignSignature.findFirst({
        where: eq(esignSignature.token, input.token),
      });

      if (dbRecord) {
        await db
          .update(esignSignature)
          .set({
            verifiedCount: (dbRecord.verifiedCount ?? 0) + 1,
            lastVerifiedAt: new Date(),
          })
          .where(eq(esignSignature.token, input.token));
      }
    } catch {
      // DB failure doesn't block verification
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
};
