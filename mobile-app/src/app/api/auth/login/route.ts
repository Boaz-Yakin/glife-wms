import { NextResponse } from 'next/server';
import { homePathForRole, loginWorker } from '@/services/auth.service';
import { authErrorResponse } from '@/lib/api-auth';

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const phone = typeof (body as { phone?: unknown })?.phone === 'string' ? (body as { phone: string }).phone : '';
    const secret = typeof (body as { secret?: unknown })?.secret === 'string' ? (body as { secret: string }).secret : '';

    const { role, mustChangePin } = await loginWorker(phone, secret);

    return NextResponse.json({
      success: true,
      role,
      redirectTo: mustChangePin ? '/login/change-pin' : homePathForRole(role),
    });
  } catch (error: unknown) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error('API /api/auth/login error:', error);
    return NextResponse.json({ success: false, error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
