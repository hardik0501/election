import { describe, it, expect } from 'vitest';
import {
  detectScript,
  normalizeHindi,
  normalizeEnglish,
  normalizeEpic,
  normalizeHouseNumber,
} from '../lib/nlp/normalization';
import {
  transliterateEnglishToHindi,
  transliterateHindiToEnglish,
  expandSearchQuery,
} from '../lib/nlp/transliteration';

describe('Devanagari Normalization Suite', () => {
  it('should detect scripts accurately', () => {
    expect(detectScript('रमेश')).toBe('devanagari');
    expect(detectScript('Ramesh')).toBe('latin');
    expect(detectScript('रमेश Kumar')).toBe('mixed');
    expect(detectScript('12345')).toBe('numeric');
  });

  it('should clean zero-width spaces and harmonise nuktas', () => {
    const textWithZWSP = 'र\u200Bमे\u200Cश';
    expect(normalizeHindi(textWithZWSP)).toBe('रमेश');

    // Hindi numerals to standard digits
    expect(normalizeHindi('उम्र १२३')).toBe('उम्र 123');
  });

  it('should normalize EPIC IDs uniformly', () => {
    expect(normalizeEpic(' wb / 12 / 34567 ')).toBe('WB/12/34567');
    expect(normalizeEpic('abc-1234567')).toBe('ABC1234567');
  });

  it('should clean house number prefixes', () => {
    expect(normalizeHouseNumber('H.No. 42-B')).toBe('42-B');
    expect(normalizeHouseNumber('मकान नं 101')).toBe('101');
  });
});

describe('Transliteration Engine Suite', () => {
  it('should transliterate English names to Hindi Devanagari candidates', () => {
    const hindiRamesh = transliterateEnglishToHindi('Ramesh');
    expect(hindiRamesh).toContain('रमेश');

    const hindiSunita = transliterateEnglishToHindi('Sunita');
    expect(hindiSunita).toContain('सुनीता');

    const hindiSharma = transliterateEnglishToHindi('Sharma');
    expect(hindiSharma).toContain('शर्मा');
  });

  it('should transliterate Hindi Devanagari to English', () => {
    const engRamesh = transliterateHindiToEnglish('रमेश');
    expect(engRamesh.toLowerCase()).toBe('ramesh');

    const engSunita = transliterateHindiToEnglish('सुनीता');
    expect(engSunita.toLowerCase()).toBe('sunita');
  });

  it('should expand search queries for dual-script search', () => {
    const expanded = expandSearchQuery('Ramesh');
    expect(expanded.detected_script).toBe('latin');
    expect(expanded.candidates).toContain('रमेश');
  });
});
