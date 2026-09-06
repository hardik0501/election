import { NextRequest, NextResponse } from 'next/server';
import { SecurityAuditLogger } from '@/lib/security/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

  await SecurityAuditLogger.log({
    action: 'LOGOUT',
    entity_type: 'user',
    ip_address: ip,
  });

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.delete('voterfinder_session');
  return response;
}
