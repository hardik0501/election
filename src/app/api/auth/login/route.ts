import { NextRequest, NextResponse } from 'next/server';
import { AuthService, UserRoleName } from '@/lib/security/auth';
import { RateLimiter } from '@/lib/security/rate-limiter';
import { SecurityAuditLogger } from '@/lib/security/audit';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    // 1. Rate Limiting: 5 login attempts per minute per IP
    const rateCheck = RateLimiter.check(`auth_login_${ip}`, 10, 60);
    if (!rateCheck.allowed) {
      await SecurityAuditLogger.log({
        action: 'RATE_LIMIT_EXCEEDED',
        entity_type: 'auth',
        ip_address: ip,
        changes: { endpoint: '/api/auth/login', reset_seconds: rateCheck.resetSeconds },
      });
      return NextResponse.json(
        { error: `Too many authentication attempts. Please retry after ${rateCheck.resetSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Check against configured admin/officer users
    const mockUsers = AuthService.getInitialAdminUsers();
    const foundUser = mockUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!foundUser || !AuthService.verifyPassword(password, foundUser.password_hash)) {
      await SecurityAuditLogger.log({
        action: 'LOGIN_FAILED',
        entity_type: 'user',
        ip_address: ip,
        changes: { attempted_email: email, reason: 'Invalid credentials' },
      });
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Generate signed token
    const token = AuthService.generateToken({
      id: foundUser.id,
      email: foundUser.email,
      full_name: foundUser.full_name,
      role: foundUser.role,
    });

    await SecurityAuditLogger.log({
      action: 'LOGIN',
      entity_type: 'user',
      entity_id: foundUser.id,
      user_id: foundUser.id,
      ip_address: ip,
      changes: { email: foundUser.email, role: foundUser.role },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: foundUser.id,
        email: foundUser.email,
        full_name: foundUser.full_name,
        role: foundUser.role,
      },
      token,
    });

    // Set HTTP-only secure cookie
    response.cookies.set('voterfinder_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Error in login:', error);
    return NextResponse.json({ error: error.message || 'Authentication error' }, { status: 500 });
  }
}
