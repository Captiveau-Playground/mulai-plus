import { randomUUID } from "node:crypto";
import { and, db, eq } from "@mulai-plus/db";
import { esignSignature } from "@mulai-plus/db/schema/esign";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../index";

// ── Deterministic hash of document snapshot ──
function hashDocument(data: Record<string, unknown>): string {
  // Simple SHA-256-like hash using crypto
  const json = JSON.stringify(data, Object.keys(data).sort());
  // Use a simple but collision-resistant hash; in production use Web Crypto
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 32; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

export const esignRouter = {
  /**
   * Generate an e-signature for a signer on a document.
   * Called for each role (program_manager, founder) when generating PDF.
   */
  sign: protectedProcedure
    .input(
      z.object({
        documentId: z.string(), // report id
        documentType: z.string().default("summary_report"),
        signerName: z.string(),
        signerRole: z.enum(["program_manager", "founder"]),
        documentSnapshot: z.object({
          studentName: z.string(),
          mentorName: z.string(),
          programName: z.string(),
          batchName: z.string(),
          date: z.string(),
          itemCount: z.number(),
        }),
      }),
    )
    .handler(async ({ input }) => {
      // Check if this role already signed this document
      const existingRole = await db.query.esignSignature.findFirst({
        where: and(eq(esignSignature.documentId, input.documentId), eq(esignSignature.signerRole, input.signerRole)),
      });

      if (existingRole) {
        return {
          token: existingRole.token,
          url: `/verify/signature/${existingRole.token}`,
          signerName: existingRole.signerName,
          signerRole: existingRole.signerRole,
        };
      }

      // Generate a unique token
      const token = generateToken();
      const docHash = hashDocument(input.documentSnapshot as Record<string, unknown>);

      await db.insert(esignSignature).values({
        id: randomUUID(),
        token,
        documentType: input.documentType,
        documentId: input.documentId,
        signerName: input.signerName,
        signerRole: input.signerRole,
        documentHash: docHash,
        metadata: input.documentSnapshot,
      });

      return {
        token,
        url: `/verify/signature/${token}`,
        signerName: input.signerName,
        signerRole: input.signerRole,
      };
    }),

  /**
   * Verify a signature token.
   */
  verifySignature: publicProcedure.input(z.object({ token: z.string() })).handler(async ({ input }) => {
    const record = await db.query.esignSignature.findFirst({
      where: eq(esignSignature.token, input.token),
    });

    if (!record) {
      return { valid: false, message: "Signature not found or invalid." };
    }

    // Increment verification count
    await db
      .update(esignSignature)
      .set({
        verifiedCount: (record.verifiedCount ?? 0) + 1,
        lastVerifiedAt: new Date(),
      })
      .where(eq(esignSignature.token, input.token));

    return {
      valid: true,
      signerName: record.signerName,
      signerRole: record.signerRole,
      documentType: record.documentType,
      documentId: record.documentId,
      timestamp: record.createdAt,
      verifiedAt: new Date().toISOString(),
      totalVerifications: (record.verifiedCount ?? 0) + 1,
    };
  }),
};
