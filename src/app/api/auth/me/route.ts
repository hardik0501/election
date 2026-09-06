import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/security/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cookieToken = req.cookies.get('voterfinder_session')?.value;
    const token = authHeader?.replace(/^Bearer\s+/i, '') || cookieToken;

    if (!token) {
      // Default to guest/viewer mode if not logged in
      return NextResponse.json({
        authenticated: false,
        user: {
          id: 'guest',
          email: 'guest@voterfinder.gov.in',
          full_name: 'Guest Voter Inspector',
          role: 'VIEWER',
          permissions: ['CAN_SEARCH', 'CAN_VIEW_SOURCE'],
        },
      });
    }

    const session = AuthService.verifyToken(token);
    if (!session) {
      return NextResponse.json({ authenticated: false, error: 'Session expired or invalid' }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user_id,
        email: session.email,
        full_name: session.full_name,
        role: session.role,
        permissions: session.permissions,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 });
  }
}
