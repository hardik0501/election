# Election Voter Data Search Platform — Testing Strategy

## 1. Quality Assurance Strategy

The testing suite guarantees data processing integrity, parsing accuracy, transliteration precision, and fast query execution through a multi-layer verification pyramid:

```
        / \
       /   \       E2E Search & Ingestion Flow
      / E2E \      (Browser automation, full batch lifecycle)
     /-------\
    /         \     Integration & API Tests
   / Integrat. \    (Database queries, Trigram scoring, File storage)
  /-------------\
 /               \   Unit & Algorithmic Tests
/   Unit & NLP    \  (Transliteration, Devanagari normalizer, Parsers)
-------------------
```

---

## 2. Test Suites

### 2.1 Unit Tests (`src/tests/unit/`)
- **Devanagari Normalization**: Verifies zero-width character stripping, NFC normalization, nukta preservation, and diacritic cleanups.
- **Transliteration Matrix**: Validates bidirectional conversion for common Indian names (e.g. *Ramesh*, *Sunita*, *Dharmendra*, *Pooja*, *Birendra*).
- **Tabular & Block Parsers**: Verifies regex tokenizers, age/gender extractions, and relation identifier mapping (`पिता`, `पति`, `माता`).

### 2.2 Integration Tests (`src/tests/integration/`)
- **Storage Service**: Tests raw file writing, SHA-256 calculation, and retrieval integrity.
- **Database Repository**: Tests batch insertion, duplicate detection logic, foreign key integrity, and query builders.
- **Search Engine**: Verifies weighted scoring calculations, trigram thresholds, compound filtering, and pagination.

### 2.3 Search Benchmark Tests (`src/tests/benchmark/`)
- Measures query execution latency across 100k+ voter mock records.
- Verifies Top-10 precision for misspelled English inputs against Hindi voter records.

---

## 3. Running Test Suites

```bash
# Run all unit and integration tests
npm test

# Run tests with code coverage
npm run test:coverage

# Run type checking
npm run typecheck

# Run linter
npm run lint
```
