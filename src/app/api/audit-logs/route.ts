import { NextRequest, NextResponse } from 'next/server';
import { SecurityAuditLogger } from '@/lib/security/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || undefined;
    const entity_type = searchParams.get('entity_type') || undefined;
    const user_id = searchParams.get('user_id') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const logs = await SecurityAuditLogger.getLogs({
      action,
      entity_type,
      user_id,
      limit,
    });

    return NextResponse.json({
      total: logs.length,
      logs,
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch audit logs' }, { status: 500 });
  }
}
