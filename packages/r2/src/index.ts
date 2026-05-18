/**
 * @mulai-plus/r2 - Cloudflare R2 Storage Package
 *
 * Server-side exports
 */

export type { CleanupResult, R2ObjectMeta, UploadResult } from "./server";
// Re-export server functions
export {
  cleanupOrphanedFiles,
  deleteFromR2,
  deleteManyFromR2,
  extractKeyFromUrl,
  getPresignedDownloadUrl,
  getPublicUrl,
  initR2Client,
  listR2Objects,
  listR2ObjectsDetailed,
  uploadToR2,
} from "./server";

// Re-export upload router
export { uploadRouter } from "./upload-router";
