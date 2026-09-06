/**
 * Production-Grade Hindi OCR Text Normalizer
 * 
 * Handles:
 * - Unicode canonical composition (NFC)
 * - Nukta canonicalization
 * - Zero-width character stripping (ZWJ, ZWNJ, ZWSP)
 * - Devanagari digit to Arabic numeral conversion
 * - Punctuation & whitespace normalization
 * - Safe OCR character substitution heuristics for EPIC alphanumeric tokens
 * - Preservation of raw vs normalized values
 */

export interface NormalizedOcrField {
  raw_value: string;
  normalized_value: string;
  confidence: number;
  substitutions_applied: string[];
}

export class HindiOcrNormalizer {
  private static DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

  private static NUKTA_MAP: Record<string, string> = {
    'क़': 'क',
    'ख़': 'ख',
    'ग़': 'ग',
    'ज़': 'ज',
    'ड़': 'ड',
    'ढ़': 'ढ',
    'फ़': 'फ',
    'य़': 'य',
    'ऱ': 'र',
    'ऩ': 'न',
    'ऴ': 'ळ',
  };

  /**
   * Normalize Hindi text with Unicode NFC, Nukta handling, and whitespace cleanup
   */
  public static normalizeHindiText(text: string | null | undefined): string {
    if (!text) return '';

    let str = text.normalize('NFC');

    // Strip zero-width characters and formatting marks
    str = str.replace(/[\u200B\u200C\u200D\uFEFF\u00A0]/g, ' ');

    // Canonicalize Nuktas
    str = str.replace(/([\u0915\u0916\u0917\u091C\u0921\u0922\u092B\u092F\u0930\u0928])\u093C/g, (match) => {
      return this.NUKTA_MAP[match] || match;
    });

    // Standardize Candrabindu to Anusvara
    str = str.replace(/\u0901/g, '\u0902');

    // Replace Danda, double Danda, and OCR pipes with spaces
    str = str.replace(/[\u0964\u0965|]/g, ' ');

    // Convert Devanagari digits to standard digits
    for (let i = 0; i < 10; i++) {
      str = str.replaceAll(this.DEVANAGARI_DIGITS[i], i.toString());
    }

    // Collapse multiple whitespaces
    str = str.replace(/\s+/g, ' ').trim();

    return str;
  }

  /**
   * Safe OCR EPIC normalizer with targeted alphanumeric disambiguation
   * (e.g., standard Indian EPIC format: 3 uppercase letters followed by 7 digits like ABC1234567)
   */
  public static normalizeEpicOcr(rawEpic: string | null | undefined): NormalizedOcrField {
    if (!rawEpic) {
      return {
        raw_value: '',
        normalized_value: '',
        confidence: 0.0,
        substitutions_applied: [],
      };
    }

    const raw = rawEpic.trim();
    let cleaned = raw
      .toUpperCase()
      .replace(/[\s\-_.:]/g, '') // preserve '/' for state electoral EPICs like WB/12/34567
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

    const substitutions: string[] = [];

    // Check if it matches 10-char EPIC pattern with common OCR confusions in prefix or numeric suffix
    if (cleaned.length === 10) {
      const prefix = cleaned.slice(0, 3);
      const suffix = cleaned.slice(3);

      let newPrefix = prefix;
      let newSuffix = suffix;

      // Prefix should be alpha (e.g. '0' -> 'O', '1' -> 'I', '8' -> 'B', '5' -> 'S')
      if (/[0-9]/.test(prefix)) {
        newPrefix = prefix
          .replace(/0/g, 'O')
          .replace(/1/g, 'I')
          .replace(/5/g, 'S')
          .replace(/8/g, 'B');
        if (newPrefix !== prefix) substitutions.push(`Prefix OCR corrected: ${prefix} -> ${newPrefix}`);
      }

      // Suffix should be numeric (e.g. 'O' -> '0', 'I' -> '1', 'S' -> '5', 'B' -> '8', 'Z' -> '2')
      if (/[A-Z]/.test(suffix)) {
        newSuffix = suffix
          .replace(/O/g, '0')
          .replace(/I/g, '1')
          .replace(/S/g, '5')
          .replace(/B/g, '8')
          .replace(/Z/g, '2');
        if (newSuffix !== suffix) substitutions.push(`Suffix OCR corrected: ${suffix} -> ${newSuffix}`);
      }

      cleaned = newPrefix + newSuffix;
    }

    // Convert any Devanagari numerals
    for (let i = 0; i < 10; i++) {
      if (cleaned.includes(this.DEVANAGARI_DIGITS[i])) {
        cleaned = cleaned.replaceAll(this.DEVANAGARI_DIGITS[i], i.toString());
        substitutions.push(`Devanagari digit ${this.DEVANAGARI_DIGITS[i]} -> ${i}`);
      }
    }

    const isValidEpicPattern = /^[A-Z]{3}[0-9]{7}$/.test(cleaned) || /^[A-Z0-9/]{6,16}$/.test(cleaned);
    const confidence = isValidEpicPattern ? (substitutions.length > 0 ? 0.92 : 0.99) : 0.70;

    return {
      raw_value: raw,
      normalized_value: cleaned,
      confidence,
      substitutions_applied: substitutions,
    };
  }

  /**
   * Clean and normalize parsed name, preserving original value and computing confidence
   */
  public static normalizeVoterName(rawName: string | null | undefined): NormalizedOcrField {
    if (!rawName) {
      return {
        raw_value: '',
        normalized_value: '',
        confidence: 0.0,
        substitutions_applied: [],
      };
    }

    const raw = rawName.trim();
    let cleaned = this.normalizeHindiText(raw);

    // Remove stray punctuation and prefixes like "नाम:" or "श्री"
    cleaned = cleaned
      .replace(/^(?:नाम|मतदाता\s*का\s*नाम|निर्वाचक\s*का\s*नाम|Name)\s*[:：.]?\s*/i, '')
      .replace(/[^\u0900-\u097Fa-zA-Z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    let confidence = 0.95;
    if (cleaned.length < 2) confidence = 0.40;
    else if (cleaned.length > 50) confidence = 0.70;

    return {
      raw_value: raw,
      normalized_value: cleaned,
      confidence,
      substitutions_applied: [],
    };
  }

  /**
   * Safe house number cleaner
   */
  public static normalizeHouseNo(rawHouse: string | null | undefined): NormalizedOcrField {
    if (!rawHouse) {
      return {
        raw_value: '',
        normalized_value: '',
        confidence: 0.0,
        substitutions_applied: [],
      };
    }

    const raw = rawHouse.trim();
    let cleaned = this.normalizeHindiText(raw);

    // Strip common prefixes
    cleaned = cleaned
      .replace(/^(?:मकान\s*संख्या|गृह\s*संख्या|मकान\s*नं\.?|म\.?\s*क्र\.?|House\s*No\.?|H\.?\s*No\.?)\s*[:：.]?\s*/i, '')
      .replace(/[^\u0900-\u097Fa-zA-Z0-9\s/_\-.]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      raw_value: raw,
      normalized_value: cleaned,
      confidence: cleaned.length > 0 ? 0.95 : 0.0,
      substitutions_applied: [],
    };
  }

  /**
   * Clean parsed age with numeric boundary validation
   */
  public static normalizeAge(rawAge: string | number | null | undefined): {
    raw_value: string;
    parsed_age: number | null;
    confidence: number;
  } {
    if (rawAge === null || rawAge === undefined || String(rawAge).trim() === '') {
      return { raw_value: '', parsed_age: null, confidence: 0.0 };
    }

    const rawStr = String(rawAge).trim();
    let digits = rawStr;

    // Convert Devanagari digits
    for (let i = 0; i < 10; i++) {
      digits = digits.replaceAll(this.DEVANAGARI_DIGITS[i], i.toString());
    }

    const match = digits.match(/\d{2,3}/);
    if (!match) {
      return { raw_value: rawStr, parsed_age: null, confidence: 0.30 };
    }

    const ageNum = parseInt(match[0], 10);
    const isValid = ageNum >= 18 && ageNum <= 130;

    return {
      raw_value: rawStr,
      parsed_age: isValid ? ageNum : ageNum,
      confidence: isValid ? 0.98 : 0.60,
    };
  }
}
