import { NextRequest, NextResponse } from 'next/server';
import { dbRepository } from '@/lib/db/database';
import { SecurityAuditLogger } from '@/lib/security/audit';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const issueId = params.id;
    const body = await req.json();
    const { action, field, new_value, voter_id, notes, resolved_by } = body;

    if (!action || !['ACCEPT', 'EDIT', 'REJECT_RECORD', 'MARK_REVIEWED'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid resolution action. Must be ACCEPT, EDIT, REJECT_RECORD, or MARK_REVIEWED.' },
        { status: 400 }
      );
    }

    let previousValue: any = null;

    // If action is EDIT and voter_id is provided, apply field update to voter entity
    if (action === 'EDIT' && voter_id && field) {
      const existingVoter = await dbRepository.getVoterById(voter_id);
      if (existingVoter) {
        previousValue = (existingVoter as any)[field];
        const updates: Record<string, any> = { [field]: new_value };

        // If editing name or relation name, auto sync dual-script / transliterated fields
        if (field === 'name_hi') {
          updates.name_hindi = new_value;
        } else if (field === 'name_en') {
          updates.name_english = new_value;
        } else if (field === 'epic_number') {
          updates.epic_number = new_value ? String(new_value).trim().toUpperCase() : null;
        }

        await dbRepository.updateVoter(voter_id, updates);
      }
    } else if (action === 'REJECT_RECORD' && voter_id) {
      await dbRepository.updateVoter(voter_id, { validation_status: 'REJECTED' as any });
    } else if (action === 'ACCEPT' && voter_id) {
      await dbRepository.updateVoter(voter_id, { validation_status: 'VALID' });
    }

    // Resolve in repository if stored as schema validation error
    const resolvedError = await dbRepository.resolveValidationError(issueId, {
      action,
      notes,
      resolved_by: resolved_by || 'Admin User',
    });

    // Record comprehensive security audit trail
    await SecurityAuditLogger.log({
      action: 'VALIDATION_DECISION',
      entity_type: 'validation_issue',
      entity_id: issueId,
      user_id: resolved_by || 'admin_user',
      changes: {
        action,
        voter_id,
        field,
        previous_value: previousValue,
        new_value: new_value || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Validation issue resolved with action: ${action}`,
      resolution: {
        action,
        voter_id,
        field,
        previous_value: previousValue,
        new_value,
        resolved_at: new Date().toISOString(),
      },
      resolved_error: resolvedError,
    });
  } catch (error: any) {
    console.error('Error resolving validation issue:', error);
    return NextResponse.json({ error: error.message || 'Failed to resolve validation issue' }, { status: 500 });
  }
}
