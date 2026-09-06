# Election Voter Data Search Platform — Security & Governance Model

## 1. Overview & Threat Model

Electoral roll records contain sensitive citizen PII (Personally Identifiable Information), including names, age, gender, household address, and EPIC numbers. The platform enforces strict data governance, access controls, query rate-limiting, and comprehensive cryptographic audit trails.

---

## 2. Core Security Pillars

### 2.1 Role-Based Access Control (RBAC)

The platform supports granular permission levels:

| Role | Search Records | View PII Details | Export Data | Upload Batches | Admin Settings & Audit Logs |
|---|---|---|---|---|---|
| **Electoral Auditor** | ✅ | ✅ Full | ✅ Masked / Signed | ❌ | ✅ View Only |
| **Data Operator** | ✅ | ✅ Full | ❌ | ✅ | ❌ |
| **Search User** | ✅ | ✅ Masked House No | ❌ | ❌ | ❌ |
| **System Administrator** | ✅ | ✅ Full | ✅ Full | ✅ | ✅ Full Access |

---

### 2.2 Data Protection & Encryption

1. **In-Transit Security**: Strict TLS 1.3 encryption for all client-to-server and internal database traffic.
2. **At-Rest Security**:
   - PostgreSQL volume encryption (AES-256).
   - Raw PDF/CSV storage encryption at rest.
   - SHA-256 cryptographic digests generated immediately upon upload to guarantee raw file non-repudiation.
3. **PII Masking on Export**:
   - Option to mask exact house numbers (e.g., `42-B` → `4*`) and EPIC IDs (e.g., `ABC1234567` → `ABC****567`) in public search views.

---

### 2.3 Rate Limiting & Abuse Prevention

To prevent mass voter data harvesting and scraping:
1. **IP & Session Throttling**: Max 60 search requests per minute per IP address.
2. **Bulk Query Guard**: Restrict max pagination window to 10,000 records unless authenticated with high-privilege Export role.
3. **CAPTCHA / Challenge Gate**: Activated dynamically upon detecting rapid automated query sequences.

---

### 2.4 Immutable Audit Logging

Every interaction is recorded in `search_logs` and `audit_logs`:
- Exact timestamp and originating IP.
- Query parameters, filters, and transliteration targets.
- Number of records exposed.
- Identity of operator/user.
- Record modification or manual verification actions.
