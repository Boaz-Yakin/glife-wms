import { headers } from 'next/headers'
import { TenantContext } from './types'
import { resolveTenantFromHost } from './resolver'

export async function getCurrentTenant(): Promise<TenantContext> {
  const headerList = await headers()
  const host = headerList.get('host') || 'localhost'
  return await resolveTenantFromHost(host)
}

export async function getActiveTenantId(): Promise<string> {
  const headerList = await headers()
  const headerTenantId = headerList.get('x-tenant-id')
  if (headerTenantId) return headerTenantId

  const tenant = await getCurrentTenant()
  return tenant.tenantId
}
