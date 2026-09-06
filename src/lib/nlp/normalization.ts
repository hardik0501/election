/**
 * Normalization utilities for Devanagari (Hindi) and Latin (English) voter data.
 */

// Devanagari Unicode code-point range: U+0900 to U+097F
export const DEVANAGARI_REGEX = /[\u0900-\u097F]/;
export const LATIN_REGEX = /[a-zA-Z]/;

export type DetectedScript = 'devanagari' | 'latin' | 'mixed' | 'numeric' | 'unknown';

/**
 * Detects whether a string is primarily Devanagari, Latin, Mixed, or Numeric.
 */
export function detectScript(text: string): DetectedScript {
  if (!text || typeof text !== 'string') return 'unknown';
  const clean = text.trim();
  if (!clean) return 'unknown';

  const hasDevanagari = DEVANAGARI_REGEX.test(clean);
  const hasLatin = LATIN_REGEX.test(clean);

  if (hasDevanagari && hasLatin) return 'mixed';
  if (hasDevanagari) return 'devanagari';
  if (hasLatin) return 'latin';
  if (/^\d+$/.test(clean)) return 'numeric';
  return 'unknown';
}

/**
 * Canonical Devanagari Text Normalizer
 * Cleans zero-width characters, canonicalizes Nuktas, removes noise, and formats diacritics.
 */
export function normalizeHindi(text: string | null | undefined): string {
  if (!text) return '';
  
  let str = text.normalize('NFC');

  // Strip Zero-Width Joiners / Non-Joiners and Zero-Width Spaces
  str = str.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

  // Harmonize Nuktas into canonical single code-points (or decompose if needed)
  const nuktaMap: Record<string, string> = {
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

  // Convert composite nukta variations (character + U+093C)
  str = str.replace(/([\u0915\u0916\u0917\u091C\u0921\u0922\u092B\u092F\u0930\u0928])\u093C/g, (match) => {
    return nuktaMap[match] || match;
  });

  // Standardize Candrabindu to Anusvara for resilient matching
  str = str.replace(/\u0901/g, '\u0902');

  // Remove Danda and double Danda
  str = str.replace(/[\u0964\u0965|]/g, ' ');

  // Normalize Hindi numerals to standard Arabic numerals
  const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  for (let i = 0; i < 10; i++) {
    str = str.replaceAll(devanagariDigits[i], i.toString());
  }

  // Remove excess whitespace and non-character artifacts
  str = str.replace(/[^\u0900-\u097F0-9\sa-zA-Z/_-]/g, ' ');
  str = str.replace(/\s+/g, ' ').trim();

  return str;
}

/**
 * Normalized English name / location string.
 */
export function normalizeEnglish(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9\s/_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Standardize EPIC / Voter ID
 */
export function normalizeEpic(epic: string | null | undefined): string {
  if (!epic) return '';
  return epic
    .toUpperCase()
    .replace(/\s+/g, '') // strip whitespace
    .replace(/[\-_._\\]/g, '') // remove hyphens, underscores, dots, backslashes
    .trim();
}

/**
 * Normalize House Number (handles prefixes like H.No, Flat, Griha Sankhya)
 */
export function normalizeHouseNumber(houseNo: string | null | undefined): string {
  if (!houseNo) return '';
  let str = houseNo.trim();
  // Strip common prefixes in Hindi/English
  str = str.replace(/^(h\.?\s*no\.?|house\s*no\.?|म\.?\s*क्र\.?|मकान\s*नं\.?|गृह\s*सं\.?)\s*:?/i, '');
  return str.trim();
}
