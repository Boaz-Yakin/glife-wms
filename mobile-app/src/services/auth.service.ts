import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * TRD-002: worker authentication & role-based access control.
 * Role/status always come from public.users (server-controlled),
 * never from user_metadata (which the user can edit themselves).
 */

export type WorkerRole = 'ADMIN' | 'SUPERVISOR' | 'INSPECTOR' | 'PICKER';

export const MANAGER_ROLES: readonly WorkerRole[] = ['ADMIN', 'SUPERVISOR'];
export const INSPECTOR_ROLES: readonly WorkerRole[] = ['INSPECTOR', ...MANAGER_ROLES];
export const PICKER_ROLES: readonly WorkerRole[] = ['PICKER', ...MANAGER_ROLES];

export const PIN_PATTERN = /^\d{6}$/;
const MOBILE_ROLES: readonly WorkerRole[] = ['ADMIN', 'SUPERVISOR', 'INSPECTOR', 'PICKER'];

export type AuthErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN_ROLE'
  | 'ACCOUNT_INACTIVE'
  | 'PIN_CHANGE_REQUIRED'
  | 'INVALID_CREDENTIALS'
  | 'LOCKED'
  | 'INVALID_INPUT';

const STATUS_BY_CODE: Record<AuthErrorCode, number> = {
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN_ROLE: 403,
  ACCOUNT_INACTIVE: 403,
  PIN_CHANGE_REQUIRED: 403,
  LOCKED: 423,
  INVALID_INPUT: 400,
};

export class AuthError extends Error {
  readonly status: number;
  constructor(
    readonly code: AuthErrorCode,
    message: string,
    readonly lockedUntil?: string
  ) {
    super(message);
    this.status = STATUS_BY_CODE[code];
  }
}

export interface WorkerProfile {
  id: string;
  role: WorkerRole;
  status: string;
  mustChangePin: boolean;
  firstName: string | null;
}

export interface WorkerContext {
  userId: string;
  role: WorkerRole;
  supabase: SupabaseClient;
}

function isWorkerRole(value: unknown): value is WorkerRole {
  return typeof value === 'string' && (MOBILE_ROLES as readonly string[]).includes(value);
}

export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

function phoneToEmail(phone: string): string {
  return `${phone}@glife.com`;
}

export async function getWorkerProfile(userId: string): Promise<WorkerProfile | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('users')
    .select('id, role, status, must_change_pin, first_name')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data || !isWorkerRole(data.role)) return null;

  return {
    id: data.id as string,
    role: data.role,
    status: String(data.status ?? 'INACTIVE'),
    mustChangePin: data.must_change_pin === true,
    firstName: (data.first_name as string | null) ?? null,
  };
}

/**
 * Guard for API routes. Re-checks status on every request (TRD-002 Q7)
 * and returns the worker id from the session (Q11: never trust body userId).
 */
export async function requireWorker(
  allowedRoles: readonly WorkerRole[],
  options: { allowPinChangePending?: boolean } = {}
): Promise<WorkerContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new AuthError('UNAUTHENTICATED', 'Login required.');

  const profile = await getWorkerProfile(user.id);
  if (!profile) throw new AuthError('FORBIDDEN_ROLE', 'No worker profile for this account.');
  if (profile.status !== 'ACTIVE') {
    throw new AuthError('ACCOUNT_INACTIVE', 'This account has been deactivated.');
  }
  if (profile.mustChangePin && !options.allowPinChangePending) {
    throw new AuthError('PIN_CHANGE_REQUIRED', 'You must set a new PIN first.');
  }
  if (!allowedRoles.includes(profile.role)) {
    throw new AuthError('FORBIDDEN_ROLE', 'Your role cannot perform this action.');
  }

  return { userId: user.id, role: profile.role, supabase };
}

export interface LoginResult {
  role: WorkerRole;
  mustChangePin: boolean;
}

/**
 * Phone + PIN (workers) or phone + password (ADMIN) login.
 * 5 consecutive failures lock the phone for 15 minutes (TRD-002 Q8).
 */
export async function loginWorker(rawPhone: string, secret: string): Promise<LoginResult> {
  const phone = normalizePhone(rawPhone);
  if (phone.length < 10 || secret.length < 6) {
    throw new AuthError('INVALID_INPUT', 'Enter a 10-digit phone number and 6-digit PIN.');
  }

  const admin = createAdminClient();

  const { data: attempt, error: attemptError } = await admin
    .from('auth_login_attempts')
    .select('locked_until')
    .eq('phone', phone)
    .maybeSingle();
  if (attemptError) throw attemptError;

  const lockedUntil = attempt?.locked_until as string | null | undefined;
  if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
    throw new AuthError('LOCKED', 'Too many failed attempts.', lockedUntil);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: phoneToEmail(phone),
    password: secret,
  });

  if (error || !data.user) {
    const { data: newLock, error: rpcError } = await admin.rpc('record_login_failure', {
      p_phone: phone,
    });
    if (rpcError) throw rpcError;
    if (typeof newLock === 'string') {
      throw new AuthError('LOCKED', 'Too many failed attempts.', newLock);
    }
    throw new AuthError('INVALID_CREDENTIALS', 'Phone number or PIN is incorrect.');
  }

  await admin.from('auth_login_attempts').delete().eq('phone', phone);

  const profile = await getWorkerProfile(data.user.id);
  if (!profile || profile.status !== 'ACTIVE') {
    await supabase.auth.signOut();
    throw new AuthError(
      profile ? 'ACCOUNT_INACTIVE' : 'FORBIDDEN_ROLE',
      profile ? 'This account has been deactivated.' : 'No worker profile for this account.'
    );
  }

  // Legacy workers still on a non-PIN password (e.g. the web-app default)
  // are migrated to a 6-digit PIN on this login.
  let mustChangePin = profile.mustChangePin;
  if (!MANAGER_ROLES.includes(profile.role) && !PIN_PATTERN.test(secret) && !mustChangePin) {
    const { error: flagError } = await admin
      .from('users')
      .update({ must_change_pin: true })
      .eq('id', profile.id);
    if (flagError) throw flagError;
    mustChangePin = true;
  }

  return { role: profile.role, mustChangePin };
}

/** Sets a new 6-digit PIN and clears the forced-change flag (TRD-002 Q10). */
export async function changeWorkerPin(newPin: string): Promise<WorkerRole> {
  if (!PIN_PATTERN.test(newPin)) {
    throw new AuthError('INVALID_INPUT', 'PIN must be exactly 6 digits.');
  }

  const { userId, role, supabase } = await requireWorker(MOBILE_ROLES, {
    allowPinChangePending: true,
  });

  const { error } = await supabase.auth.updateUser({ password: newPin });
  if (error) {
    throw new AuthError('INVALID_INPUT', error.message);
  }

  const admin = createAdminClient();
  const { error: flagError } = await admin
    .from('users')
    .update({ must_change_pin: false })
    .eq('id', userId);
  if (flagError) throw flagError;

  return role;
}

export async function logoutWorker(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

/** Landing route for a role after login (TRD-002 Q4). */
export function homePathForRole(role: WorkerRole): string {
  if (role === 'PICKER') return '/picking';
  if (role === 'INSPECTOR') return '/inventory';
  return '/mode';
}
