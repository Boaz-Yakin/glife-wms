"use server"

import {
  getTenantAuditLogs,
  generateAuditLogsCsv,
  GetAuditLogsParams,
} from "@/services/audit-log.service"

export async function fetchAuditLogsAction(params?: GetAuditLogsParams) {
  return await getTenantAuditLogs(params)
}

export async function downloadAuditLogsCsvAction() {
  return await generateAuditLogsCsv()
}
