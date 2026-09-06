import crypto from 'crypto';
import { AuditLog } from '@/types';
import { dbRepository } from '../db/database';

export type AuditActionType =
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'FILE_UPLOAD'
  | 'IMPORT_STARTED'
  | 'IMPORT_COMPLETED'
  | 'VOTER_EDIT'
  | 'VOTER_DELETE'
  | 'VALIDATION_DECISION'
  | 'USER_CHANGES'
  | 'SOURCE_ACCESS'
  | 'RATE_LIMIT_EXCEEDED';

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /credential/i,
  /api[_-]?key/i,
  /private/i,
];

export class SecurityAuditLogger {
  /**
   * Redact sensitive fields recursively to ensure no secrets/passwords are ever written to audit logs
   */
  public static redactSecrets(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactSecrets(item));
    }

    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
      if (isSensitive) {
        sanitized[key] = '[REDACTED_SECRET]';
      } else if (val && typeof val === 'object') {
        sanitized[key] = this.redactSecrets(val);
      } else {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }

  /**
   * Log an audited security or administrative action
   */
  public static async log(entry: {
    action: AuditActionType | string;
    entity_type: string;
    entity_id?: string | null;
    user_id?: string | null;
    changes?: Record<string, any>;
    ip_address?: string | null;
  }): Promise<AuditLog> {
    const cleanChanges = this.redactSecrets(entry.changes || {});

    const logItem: AuditLog = {
      id: `audit_${crypto.randomUUID()}`,
      user_id: entry.user_id || null,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id || null,
      changes: cleanChanges,
      ip_address: entry.ip_address || null,
      created_at: new Date().toISOString(),
    };

    await dbRepository.recordAuditLog(logItem);
    return logItem;
  }

  /**
   * Retrieve audit logs with filtering
   */
  public static async getLogs(filters?: {
    action?: string;
    entity_type?: string;
    user_id?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    return dbRepository.getAuditLogs(filters);
  }
}
