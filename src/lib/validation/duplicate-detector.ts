import { Voter, SourceFile } from '@/types';
import { normalizeEpic, normalizeHindi, normalizeEnglish, normalizeHouseNumber } from '../nlp/normalization';
import crypto from 'crypto';

export type DuplicateType =
  | 'DUPLICATE_EPIC'
  | 'DUPLICATE_SERIAL_PART'
  | 'POSSIBLE_DUPLICATE_RECORD'
  | 'REPEATED_IMPORT';

export interface DuplicateCluster {
  id: string;
  duplicate_type: DuplicateType;
  confidence: number;
  description: string;
  voter_ids: string[];
  voters: Voter[];
  source_file_ids: string[];
  matched_attributes: {
    epic?: string;
    serial_number?: number;
    part_number?: string;
    name?: string;
    relation_name?: string;
    age?: number;
    house_number?: string;
    file_hash?: string;
  };
  suggested_action: string;
  created_at: string;
}

export class DuplicateDetector {
  /**
   * 1. Detect Duplicate EPIC numbers across all records or within a batch
   */
  public static detectEpicDuplicates(voters: Voter[]): DuplicateCluster[] {
    const epicMap = new Map<string, Voter[]>();
    const clusters: DuplicateCluster[] = [];

    for (const v of voters) {
      if (!v.epic_number) continue;
      const normEpic = normalizeEpic(v.epic_number);
      if (!normEpic) continue;

      const group = epicMap.get(normEpic) || [];
      group.push(v);
      epicMap.set(normEpic, group);
    }

    for (const [epic, group] of epicMap.entries()) {
      if (group.length > 1) {
        clusters.push({
          id: `dup_epic_${epic}_${crypto.randomUUID().slice(0, 8)}`,
          duplicate_type: 'DUPLICATE_EPIC',
          confidence: 0.99,
          description: `Exact Duplicate EPIC Number: "${epic}" found in ${group.length} voter records across rolls.`,
          voter_ids: group.map((v) => v.id),
          voters: group,
          source_file_ids: Array.from(new Set(group.map((v) => v.source_file_id))),
          matched_attributes: {
            epic,
          },
          suggested_action: 'Verify original documents to determine if EPIC was incorrectly re-assigned or scanned twice.',
          created_at: new Date().toISOString(),
        });
      }
    }

    return clusters;
  }

  /**
   * 2. Detect Duplicate Serial Number within the same Source File or Part Number
   */
  public static detectSerialPartDuplicates(voters: Voter[]): DuplicateCluster[] {
    const serialMap = new Map<string, Voter[]>();
    const clusters: DuplicateCluster[] = [];

    for (const v of voters) {
      const serial = v.source_serial_number || v.serial_number;
      if (!serial) continue;

      const scopeKey = v.source_file_id
        ? `file_${v.source_file_id}_s_${serial}`
        : `part_${v.part_number || 'default'}_s_${serial}`;

      const group = serialMap.get(scopeKey) || [];
      group.push(v);
      serialMap.set(scopeKey, group);
    }

    for (const [key, group] of serialMap.entries()) {
      if (group.length > 1) {
        const first = group[0];
        clusters.push({
          id: `dup_serial_${key}_${crypto.randomUUID().slice(0, 8)}`,
          duplicate_type: 'DUPLICATE_SERIAL_PART',
          confidence: 0.95,
          description: `Duplicate Serial #${first.source_serial_number || first.serial_number} in the same Part/File (${group.length} records).`,
          voter_ids: group.map((v) => v.id),
          voters: group,
          source_file_ids: Array.from(new Set(group.map((v) => v.source_file_id))),
          matched_attributes: {
            serial_number: first.source_serial_number || first.serial_number,
            part_number: first.part_number || undefined,
          },
          suggested_action: 'Check sequential numbering on the original PDF roll page.',
          created_at: new Date().toISOString(),
        });
      }
    }

    return clusters;
  }

  /**
   * 3. Detect Possible Duplicate Records using Composite Similarity
   * IMPORTANT: Adheres strictly to the rule: DO NOT assume same name alone means duplicate!
   * Requires matching: Normalized Name + Normalized Relation Name + Normalized House Number + Age (within ±1 year).
   */
  public static detectPossibleDuplicateRecords(voters: Voter[]): DuplicateCluster[] {
    const compositeMap = new Map<string, Voter[]>();
    const clusters: DuplicateCluster[] = [];

    for (const v of voters) {
      const name = (v.normalized_name_en || normalizeEnglish(v.name_en || '')).replace(/\s+/g, '');
      const relName = (v.normalized_relation_name_en || normalizeEnglish(v.relation_name_en || '')).replace(/\s+/g, '');
      const house = v.normalized_house_number || normalizeHouseNumber(v.house_number || '');
      const ageBracket = v.age ? Math.floor(v.age / 2) * 2 : 'noage'; // group age within ±1-2 years

      // Require at least name + relation name + house or age to form a composite key
      if (!name || !relName || name.length < 3 || relName.length < 3) {
        continue;
      }

      const compositeKey = `${name}_rel_${relName}_h_${house}_age_${ageBracket}`;
      const group = compositeMap.get(compositeKey) || [];
      group.push(v);
      compositeMap.set(compositeKey, group);
    }

    for (const [key, group] of compositeMap.entries()) {
      if (group.length > 1) {
        // Double check they aren't already flagged under the exact same EPIC
        const uniqueEpics = new Set(group.map((v) => v.epic_number).filter(Boolean));
        const first = group[0];

        clusters.push({
          id: `dup_possible_${key}_${crypto.randomUUID().slice(0, 8)}`,
          duplicate_type: 'POSSIBLE_DUPLICATE_RECORD',
          confidence: uniqueEpics.size > 1 ? 0.75 : 0.88,
          description: `Possible Duplicate Record: Matching Name ("${first.name_en || first.name_hi}"), Relation ("${first.relation_name_en || first.relation_name_hi}"), House "${first.house_number}" and Age ~${first.age}.`,
          voter_ids: group.map((v) => v.id),
          voters: group,
          source_file_ids: Array.from(new Set(group.map((v) => v.source_file_id))),
          matched_attributes: {
            name: first.name_en || first.name_hi,
            relation_name: first.relation_name_en || first.relation_name_hi || undefined,
            house_number: first.house_number || undefined,
            age: first.age || undefined,
          },
          suggested_action: 'Examine both records and source pages to verify if this is a double enrollment or coincidentally identical family members.',
          created_at: new Date().toISOString(),
        });
      }
    }

    return clusters;
  }

  /**
   * 4. Detect Repeated Imports by SHA-256 Digest
   */
  public static detectRepeatedImports(sourceFiles: SourceFile[]): DuplicateCluster[] {
    const hashMap = new Map<string, SourceFile[]>();
    const clusters: DuplicateCluster[] = [];

    for (const f of sourceFiles) {
      if (!f.file_hash_sha256) continue;
      const group = hashMap.get(f.file_hash_sha256) || [];
      group.push(f);
      hashMap.set(f.file_hash_sha256, group);
    }

    for (const [hash, group] of hashMap.entries()) {
      if (group.length > 1) {
        clusters.push({
          id: `dup_file_${hash.slice(0, 10)}_${crypto.randomUUID().slice(0, 8)}`,
          duplicate_type: 'REPEATED_IMPORT',
          confidence: 1.0,
          description: `Repeated Source Document Upload: Identical SHA-256 Digest (${group.map((f) => f.original_filename).join(', ')}) uploaded ${group.length} times.`,
          voter_ids: [],
          voters: [],
          source_file_ids: group.map((f) => f.id),
          matched_attributes: {
            file_hash: hash,
          },
          suggested_action: 'Archive or remove redundant import batch to prevent duplicate roll overhead.',
          created_at: new Date().toISOString(),
        });
      }
    }

    return clusters;
  }

  /**
   * Run all duplicate detection strategies and return unified clusters
   */
  public static runAllDuplicateChecks(
    voters: Voter[],
    sourceFiles: SourceFile[] = []
  ): {
    totalClusters: number;
    clusters: DuplicateCluster[];
    summary: Record<DuplicateType, number>;
  } {
    const epicDups = this.detectEpicDuplicates(voters);
    const serialDups = this.detectSerialPartDuplicates(voters);
    const possibleDups = this.detectPossibleDuplicateRecords(voters);
    const fileDups = this.detectRepeatedImports(sourceFiles);

    const all = [...epicDups, ...serialDups, ...possibleDups, ...fileDups];

    return {
      totalClusters: all.length,
      clusters: all,
      summary: {
        DUPLICATE_EPIC: epicDups.length,
        DUPLICATE_SERIAL_PART: serialDups.length,
        POSSIBLE_DUPLICATE_RECORD: possibleDups.length,
        REPEATED_IMPORT: fileDups.length,
      },
    };
  }
}
