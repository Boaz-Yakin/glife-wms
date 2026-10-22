import { NextResponse } from 'next/server';
import { logoutWorker } from '@/services/auth.service';

export async function POST() {
  try {
    await logoutWorker();
  } catch (error: unknown) {
    console.error('API /api/auth/logout error:', error);
  }
  return NextResponse.json({ success: true, redirectTo: '/login' });
}
