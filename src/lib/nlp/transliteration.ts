/**
 * Indic Transliteration Engine (Hindi Devanagari <-> Latin English)
 * Designed for Indian Electoral Roll names, relatives, and locations.
 */

import { detectScript, normalizeEnglish, normalizeHindi } from './normalization';

// Direct character/phoneme mappings
const VOWEL_MAP_ENG_TO_HIN: Record<string, string> = {
  a: 'ा',
  aa: 'ा',
  i: 'ि',
  ee: 'ी',
  u: 'ु',
  oo: 'ू',
  e: 'े',
  ai: 'ै',
  o: 'ो',
  au: 'ौ',
  ou: 'ौ',
};

const INITIAL_VOWEL_ENG_TO_HIN: Record<string, string> = {
  a: 'अ',
  aa: 'आ',
  i: 'इ',
  ee: 'ई',
  u: 'उ',
  oo: 'ऊ',
  e: 'ए',
  ai: 'ऐ',
  o: 'ओ',
  au: 'औ',
  ou: 'औ',
};

const CONSONANT_MAP_ENG_TO_HIN: Record<string, string> = {
  k: 'क',
  kh: 'ख',
  g: 'ग',
  gh: 'घ',
  ch: 'च',
  chh: 'छ',
  j: 'ज',
  jh: 'झ',
  t: 'त',
  th: 'थ',
  d: 'द',
  dh: 'ध',
  n: 'न',
  p: 'प',
  ph: 'फ',
  f: 'फ',
  b: 'ब',
  bh: 'भ',
  m: 'म',
  y: 'य',
  r: 'र',
  l: 'ल',
  v: 'व',
  w: 'व',
  sh: 'श',
  shh: 'ष',
  s: 'स',
  h: 'ह',
  ks: 'क्ष',
  ksh: 'क्ष',
  gy: 'ज्ञ',
  tr: 'त्र',
  cr: 'क्र',
  kr: 'क्र',
  pr: 'प्र',
  br: 'ब्र',
  gr: 'ग्र',
  dr: 'द्र',
};

// Hindi to English phoneme mappings
const HIN_TO_ENG_VOWELS: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'an', 'अः': 'ah',
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ँ': 'n',
};

const HIN_TO_ENG_CONSONANTS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'क्ष': 'ksh', 'त्र': 'tr', 'ज्ञ': 'gy', 'श्र': 'shr',
};

// Common Indian Name Variations dictionary for immediate high-accuracy match
const COMMON_NAMES_DICTIONARY: Record<string, { hindi: string; english: string[] }> = {
  'ram': { hindi: 'राम', english: ['ram', 'rama'] },
  'shyam': { hindi: 'श्याम', english: ['shyam', 'siam'] },
  'dayal': { hindi: 'दयाल', english: ['dayal', 'deyal'] },
  'ramdayal': { hindi: 'रामदयाल', english: ['ramdayal', 'ram dayal', 'ramdeyal'] },
  'ramesh': { hindi: 'रमेश', english: ['ramesh', 'ramesha'] },
  'suresh': { hindi: 'सुरेश', english: ['suresh', 'suresha'] },
  'rajesh': { hindi: 'राजेश', english: ['rajesh', 'rajesha'] },
  'dinesh': { hindi: 'दिनेश', english: ['dinesh', 'dinesha'] },
  'mahesh': { hindi: 'महेश', english: ['mahesh', 'mahesha'] },
  'mukesh': { hindi: 'मुकेश', english: ['mukesh', 'mukesha'] },
  'sunita': { hindi: 'सुनीता', english: ['sunita', 'suneeta'] },
  'anita': { hindi: 'अनीता', english: ['anita', 'aneeta'] },
  'geeta': { hindi: 'गीता', english: ['geeta', 'gita'] },
  'seema': { hindi: 'सीमा', english: ['seema', 'sima'] },
  'pooja': { hindi: 'पूजा', english: ['pooja', 'puja'] },
  'vikram': { hindi: 'विक्रम', english: ['vikram', 'bikram'] },
  'vikas': { hindi: 'विकास', english: ['vikas', 'bikas', 'vikash'] },
  'rahul': { hindi: 'राहुल', english: ['rahul'] },
  'amit': { hindi: 'अमित', english: ['amit', 'ameet'] },
  'sumit': { hindi: 'सुमित', english: ['sumit', 'sumeet'] },
  'ajay': { hindi: 'अजय', english: ['ajay', 'ajai'] },
  'vijay': { hindi: 'विजय', english: ['vijay', 'bijay'] },
  'sanjay': { hindi: 'संजय', english: ['sanjay'] },
  'sharma': { hindi: 'शर्मा', english: ['sharma', 'sarma'] },
  'verma': { hindi: 'वर्मा', english: ['verma', 'varma', 'barma'] },
  'gupta': { hindi: 'गुप्ता', english: ['gupta'] },
  'singh': { hindi: 'सिंह', english: ['singh', 'sinh', 'sing'] },
  'yadav': { hindi: 'यादव', english: ['yadav', 'jadav', 'yadava'] },
  'kumar': { hindi: 'कुमार', english: ['kumar', 'koomar'] },
  'kumari': { hindi: 'कुमारी', english: ['kumari', 'koomari'] },
  'devi': { hindi: 'देवी', english: ['devi', 'debce', 'deb'] },
  'prasad': { hindi: 'प्रसाद', english: ['prasad', 'parsad'] },
  'choudhary': { hindi: 'चौधरी', english: ['choudhary', 'chaudhary', 'chowdhary', 'choudhari'] },
  'chaudhary': { hindi: 'चौधरी', english: ['chaudhary', 'choudhary', 'chowdhary', 'choudhari'] },
  'mishra': { hindi: 'मिश्रा', english: ['mishra', 'misra'] },
  'jha': { hindi: 'झा', english: ['jha'] },
  'lakshmi': { hindi: 'लक्ष्मी', english: ['lakshmi', 'laxmi'] },
  'laxmi': { hindi: 'लक्ष्मी', english: ['laxmi', 'lakshmi'] },
};

/**
 * Transliterate English Latin text into Hindi Devanagari.
 */
export function transliterateEnglishToHindi(text: string): string[] {
  const norm = normalizeEnglish(text);
  if (!norm) return [];

  const words = norm.split(/\s+/);
  const wordCandidates: string[][] = [];

  for (const word of words) {
    if (!word) continue;

    // 1. Check Dictionary first
    if (COMMON_NAMES_DICTIONARY[word]) {
      wordCandidates.push([COMMON_NAMES_DICTIONARY[word].hindi]);
      continue;
    }

    // 2. Rule-based conversion
    const candidates: string[] = [];
    let hindi = '';
    let i = 0;

    while (i < word.length) {
      // Check 3-char prefix
      const c3 = word.substring(i, i + 3);
      const c2 = word.substring(i, i + 2);
      const c1 = word[i];

      if (CONSONANT_MAP_ENG_TO_HIN[c3]) {
        hindi += CONSONANT_MAP_ENG_TO_HIN[c3];
        i += 3;
      } else if (CONSONANT_MAP_ENG_TO_HIN[c2]) {
        hindi += CONSONANT_MAP_ENG_TO_HIN[c2];
        i += 2;
      } else if (CONSONANT_MAP_ENG_TO_HIN[c1]) {
        hindi += CONSONANT_MAP_ENG_TO_HIN[c1];
        i += 1;
      } else if (i === 0 && (INITIAL_VOWEL_ENG_TO_HIN[c2] || INITIAL_VOWEL_ENG_TO_HIN[c1])) {
        if (INITIAL_VOWEL_ENG_TO_HIN[c2]) {
          hindi += INITIAL_VOWEL_ENG_TO_HIN[c2];
          i += 2;
        } else {
          hindi += INITIAL_VOWEL_ENG_TO_HIN[c1];
          i += 1;
        }
      } else if (VOWEL_MAP_ENG_TO_HIN[c2]) {
        hindi += VOWEL_MAP_ENG_TO_HIN[c2];
        i += 2;
      } else if (VOWEL_MAP_ENG_TO_HIN[c1]) {
        // In Hindi, short 'a' in the middle of words is implicit unless at the end
        if (c1 === 'a' && i < word.length - 1) {
          // implicit
        } else {
          hindi += VOWEL_MAP_ENG_TO_HIN[c1];
        }
        i += 1;
      } else {
        // Unknown or digit
        hindi += c1;
        i += 1;
      }
    }

    if (hindi) {
      candidates.push(hindi);
      // Generate alternate variation without trailing matra if applicable
      if (hindi.endsWith('ा')) {
        candidates.push(hindi.slice(0, -1));
      }
    }

    wordCandidates.push(candidates.length > 0 ? candidates : [word]);
  }

  // Combine multi-word phrases
  let results: string[] = [''];
  for (const group of wordCandidates) {
    const next: string[] = [];
    for (const prefix of results) {
      for (const item of group) {
        next.push(prefix ? `${prefix} ${item}` : item);
      }
    }
    results = next;
  }

  return results.slice(0, 5);
}

/**
 * Transliterate Hindi Devanagari text into English Latin.
 */
export function transliterateHindiToEnglish(text: string): string {
  const norm = normalizeHindi(text);
  if (!norm) return '';

  const words = norm.split(/\s+/);
  const engWords: string[] = [];

  for (const word of words) {
    if (!word) continue;

    // Check inverse dictionary
    let foundInDict = false;
    for (const [key, val] of Object.entries(COMMON_NAMES_DICTIONARY)) {
      if (val.hindi === word) {
        engWords.push(val.english[0].toUpperCase());
        foundInDict = true;
        break;
      }
    }
    if (foundInDict) continue;

    let eng = '';
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const nextChar = word[i + 1];

      // Halant check
      if (char === '्') {
        continue; // suppressed implicit vowel
      }

      if (HIN_TO_ENG_VOWELS[char]) {
        eng += HIN_TO_ENG_VOWELS[char];
      } else if (HIN_TO_ENG_CONSONANTS[char]) {
        eng += HIN_TO_ENG_CONSONANTS[char];
        // If next char is not a matra and not halant, add implicit 'a' (unless last char)
        if (
          nextChar &&
          !HIN_TO_ENG_VOWELS[nextChar] &&
          nextChar !== '्' &&
          i < word.length - 1
        ) {
          eng += 'a';
        }
      } else {
        eng += char;
      }
    }

    if (eng) {
      // Capitalize first letter
      engWords.push(eng.charAt(0).toUpperCase() + eng.slice(1));
    }
  }

  return engWords.join(' ').trim();
}

/**
 * Generate comprehensive search candidates for an input term with transliteration and compound/spaced variants.
 */
export function expandSearchQuery(input: string): {
  original: string;
  detected_script: 'devanagari' | 'latin' | 'mixed';
  candidates: string[];
} {
  const script = detectScript(input);
  const candidates: Set<string> = new Set([input]);

  const clean = input.trim();
  const unspaced = clean.replace(/\s+/g, '');
  if (unspaced && unspaced !== clean) {
    candidates.add(unspaced);
  }

  // Common Hindi compound names decomposition (e.g. रामदयाल -> राम दयाल)
  if (script === 'devanagari') {
    const eng = transliterateHindiToEnglish(clean);
    if (eng) {
      candidates.add(eng);
      candidates.add(eng.toLowerCase());
      candidates.add(eng.replace(/\s+/g, ''));
    }

    // Generate space split for common suffix patterns in Hindi
    const hindiSuffixes = ['कुमार', 'सिंह', 'शर्मा', 'वर्मा', 'प्रसाद', 'लाल', 'दयाल', 'देवी', 'गुप्ता', 'यादव'];
    for (const suffix of hindiSuffixes) {
      if (clean.endsWith(suffix) && clean.length > suffix.length) {
        const prefix = clean.slice(0, -suffix.length);
        candidates.add(`${prefix} ${suffix}`);
      }
    }
  } else if (script === 'latin') {
    const hindiList = transliterateEnglishToHindi(clean);
    for (const h of hindiList) {
      candidates.add(h);
      candidates.add(h.replace(/\s+/g, ''));
    }

    // Also transliterate unspaced variant if spaced
    if (unspaced !== clean) {
      const unspacedHindi = transliterateEnglishToHindi(unspaced);
      for (const uh of unspacedHindi) {
        candidates.add(uh);
      }
    }

    // Check English compound prefixes (e.g., Ramdayal -> Ram Dayal)
    const engSuffixes = ['dayal', 'kumar', 'singh', 'sharma', 'verma', 'prasad', 'lal', 'devi', 'gupta', 'yadav', 'prakash'];
    const lower = clean.toLowerCase();
    for (const suf of engSuffixes) {
      if (lower.endsWith(suf) && lower.length > suf.length && !lower.includes(' ')) {
        const pfx = lower.slice(0, -suf.length);
        const spacedEng = `${pfx} ${suf}`;
        candidates.add(spacedEng);
        const hRes = transliterateEnglishToHindi(spacedEng);
        for (const hr of hRes) candidates.add(hr);
      }
    }
  }

  return {
    original: input,
    detected_script: script === 'numeric' || script === 'unknown' ? 'latin' : script,
    candidates: Array.from(candidates).filter(Boolean),
  };
}
