import { NextResponse } from 'next/server';
import { MANAGER_ROLES, requireWorker } from '@/services/auth.service';
import { authErrorResponse } from '@/lib/api-auth';

/** Current worker identity — used by the client for the offline-queue owner check. */
export async function GET() {
  try {
    const { userId, role } = await requireWorker(['ADMIN', 'SUPERVISOR', 'INSPECTOR', 'PICKER']);
    return NextResponse.json({
      success: true,
      userId,
      role,
      isManager: MANAGER_ROLES.includes(role),
    });
  } catch (error: unknown) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('API /api/auth/me error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load session.' }, { status: 500 });
  }
}
