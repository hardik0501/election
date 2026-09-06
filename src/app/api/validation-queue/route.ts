import { NextRequest, NextResponse } from 'next/server';
import { dbRepository } from '@/lib/db/database';
import { VoterDataQualityValidator, ValidationIssue } from '@/lib/validation/rules';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const severity = searchParams.get('severity');
    const field = searchParams.get('field');
    const status = searchParams.get('status'); // 'all', 'open', 'resolved'

    // Retrieve raw stored validation errors + live validated issues
    const storedErrors = await dbRepository.getAllValidationErrors(status === 'all' || status === 'resolved');
    const allVoters = await dbRepository.searchVoters({ limit: 500 });
    const sourceFiles = await dbRepository.getSourceFiles();
    const sourceFileMap = new Map(sourceFiles.map((f) => [f.id, f.original_filename]));

    const validationIssues: ValidationIssue[] = [];

    // 1. Run dynamic rules across voters
    for (const voter of allVoters.results) {
      const fileName = voter.source_file_id ? sourceFileMap.get(voter.source_file_id) : undefined;
      const res = VoterDataQualityValidator.validateVoterRecord(voter, {
        source_file_name: fileName,
      });

      for (const issue of res.issues) {
        validationIssues.push(issue);
      }
    }

    // 2. Add any stored schema errors that may not be covered by field rules
    for (const err of storedErrors) {
      const fileName = err.source_file_id ? sourceFileMap.get(err.source_file_id) : undefined;
      const matchingVoter = allVoters.results.find((v) => v.id === err.voter_id);

      validationIssues.push({
        id: err.id,
        voter_id: err.voter_id || 'unknown_voter',
        source_file_id: err.source_file_id || 'unknown_file',
        file_name: fileName,
        page_number: matchingVoter?.source_page_number || 1,
        serial_number: matchingVoter?.source_serial_number || matchingVoter?.serial_number || 1,
        field_name: err.error_code?.toLowerCase().includes('epic') ? 'epic_number' : 'name',
        current_value: matchingVoter?.epic_number || matchingVoter?.name_en || null,
        confidence: matchingVoter?.extraction_confidence || 0.8,
        issue: err.error_message,
        severity: err.severity || 'WARNING',
        suggested_action: 'Inspect original source roll document to verify entry.',
        is_resolved: err.is_resolved,
        resolution: (err as any).resolution || null,
        created_at: err.created_at,
      });
    }

    // Deduplicate by issue description + voter_id
    const seen = new Set<string>();
    let filteredIssues = validationIssues.filter((issue) => {
      const key = `${issue.voter_id}_${issue.field_name}_${issue.issue}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Apply query filters
    if (severity) {
      filteredIssues = filteredIssues.filter((i) => i.severity.toLowerCase() === severity.toLowerCase());
    }
    if (field) {
      filteredIssues = filteredIssues.filter((i) => i.field_name.toLowerCase() === field.toLowerCase());
    }
    if (status === 'open') {
      filteredIssues = filteredIssues.filter((i) => !i.is_resolved);
    } else if (status === 'resolved') {
      filteredIssues = filteredIssues.filter((i) => i.is_resolved);
    }

    return NextResponse.json({
      total: filteredIssues.length,
      open_count: filteredIssues.filter((i) => !i.is_resolved).length,
      resolved_count: filteredIssues.filter((i) => i.is_resolved).length,
      issues: filteredIssues,
    });
  } catch (error: any) {
    console.error('Error fetching validation queue:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch validation queue' }, { status: 500 });
  }
}
