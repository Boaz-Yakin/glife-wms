import { createClient } from "@/lib/supabase/server"
import { type User } from "@supabase/supabase-js"

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "SUPERVISOR" | "PICKER" | "INSPECTOR" | "STORE" | "VENDOR"

export interface AuthenticatedUser extends User {
  role?: UserRole
}

export class AuthError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 401) {
    super(message)
    this.name = "AuthError"
    this.statusCode = statusCode
  }
}

/**
 * Ensures the request is authenticated via Supabase session.
 * Throws AuthError if unauthenticated.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new AuthError("Authentication required: Please sign in.", 401)
  }

  const role = (
    user.app_metadata?.role ||
    user.app_metadata?.user_role ||
    user.user_metadata?.role ||
    user.user_metadata?.user_role
  ) as UserRole || undefined
  return { ...user, role }
}

/**
 * Ensures the authenticated user has one of the allowed roles.
 * Throws AuthError if not authorized.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthenticatedUser> {
  const user = await requireAuth()
  const role = user.role

  if (!role || !allowedRoles.includes(role)) {
    throw new AuthError(`Forbidden: Requires one of [${allowedRoles.join(", ")}] permissions.`, 403)
  }

  return user
}

/**
 * Requires ADMIN role for privileged system/master actions.
 * Platform SUPER_ADMIN also satisfies this requirement.
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  return await requireRole(["SUPER_ADMIN", "ADMIN"])
}

/**
 * Requires Manager roles (SUPER_ADMIN, ADMIN or SUPERVISOR) for operational actions.
 */
export async function requireManager(): Promise<AuthenticatedUser> {
  return await requireRole(["SUPER_ADMIN", "ADMIN", "SUPERVISOR"])
}

/**
 * Validates internal API request secret.
 * Returns true if requestSecret matches INTERNAL_API_SECRET or SUPABASE_SERVICE_ROLE_KEY.
 */
export function verifyInternalSecret(requestSecret?: string | null): boolean {
  if (!requestSecret) return false

  const internalSecret = process.env.INTERNAL_API_SECRET
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (internalSecret && requestSecret === internalSecret) {
    return true
  }

  if (serviceKey && requestSecret === serviceKey) {
    return true
  }

  return false
}
