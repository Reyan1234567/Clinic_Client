import { requestData, requestMessage } from "@/lib/api/client";
import type { FileRecord } from "@/lib/types";

/** Which bucket the upload lands in. */
export type UploadPurpose = "patient" | "visit" | "procedure" | "signature";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * POST /files/upload — requires `file.upload`.
 * multipart/form-data with the field named "file". jpeg/png/webp only, 10MB
 * max, 10 uploads per 15 minutes (429).
 *
 * This is step one of a two-step flow: attach the returned `id` as `fileId` to
 * a visit or procedure straight after, or the upload is orphaned.
 * `filePath` on the response is a short-lived Supabase signed URL.
 */
export function uploadFile(file: File, purpose: UploadPurpose) {
  const body = new FormData();
  body.append("file", file);
  body.append("purpose", purpose);

  return requestData<FileRecord>("/files/upload", { method: "POST", body });
}

/**
 * DELETE /files/:fileId — requires `file.delete`.
 * Only the uploader can delete unless their `file.delete` scope is GLOBAL.
 */
export function deleteFile(fileId: string) {
  return requestMessage(`/files/${fileId}`, { method: "DELETE" });
}
