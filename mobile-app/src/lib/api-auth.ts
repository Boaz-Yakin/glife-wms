import { NextResponse } from 'next/server';
import { AuthError } from '@/services/auth.service';

/** Maps an AuthError to the TRD-002 §4.2 JSON shape; returns null for other errors. */
export function authErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof AuthError)) return null;
  return NextResponse.json(
    {
      success: false,
      code: error.code,
      error: error.message,
      ...(error.lockedUntil ? { lockedUntil: error.lockedUntil } : {}),
    },
    { status: error.status }
  );
}
