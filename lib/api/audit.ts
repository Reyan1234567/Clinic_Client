import { buildQuery, requestPage } from "@/lib/api/client";
import type { AuditLog } from "@/lib/types";

export interface AuditListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  action?: string;
  entity?: string;
  userId?: string;
  from?: string;
  to?: string;
}

/** GET /audit-logs — requires `audit.read`. Admin-only clinic-wide trail. */
export function listAuditLogs(params: AuditListParams = {}) {
  return requestPage<AuditLog>(`/audit-logs${buildQuery({ ...params })}`);
}
