import { NextResponse } from 'next/server';
import { changeWorkerPin, homePathForRole } from '@/services/auth.service';
import { authErrorResponse } from '@/lib/api-auth';

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const pin = typeof (body as { pin?: unknown })?.pin === 'string' ? (body as { pin: string }).pin : '';

    const role = await changeWorkerPin(pin);

    return NextResponse.json({ success: true, redirectTo: homePathForRole(role) });
  } catch (error: unknown) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error('API /api/auth/change-pin error:', error);
    return NextResponse.json({ success: false, error: 'Failed to change PIN.' }, { status: 500 });
  }
}
