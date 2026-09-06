import { describe, it, expect } from 'vitest';
import {
  HindiOcrNormalizer,
} from '../lib/ocr/hindi-normalizer';
import {
  FieldDetector,
  VoterBlockDetector,
  PdfPageExtractor,
  masterHindiPdfExtractor,
} from '../lib/parsers/pdf-extractor';

describe('Phase 5: Hindi Electoral-Roll PDF Extraction & OCR Pipeline', () => {
  describe('1. Hindi OCR Normalization & Safe Error Correction', () => {
    it('should normalize Devanagari numerals, Unicode NFC, Nuktas, and strip zero-width characters', () => {
      const noisyHindi = 'क़ासिम\u200B ख़ान\u200C | क्रमांक: १०५ | उम्र: ३८';
      const normalized = HindiOcrNormalizer.normalizeHindiText(noisyHindi);

      expect(normalized).not.toContain('\u200B');
      expect(normalized).not.toContain('\u200C');
      expect(normalized).not.toContain('|');
      expect(normalized).toContain('कासिम खान');
      expect(normalized).toContain('105');
      expect(normalized).toContain('38');
    });

    it('should safely correct common OCR alphanumeric confusion in standard 10-char EPICs', () => {
      // In prefix: '0' -> 'O', in suffix: 'O' -> '0', 'I' -> '1', 'S' -> '5'
      const noisyEpic = 'BR0123456O';
      const result = HindiOcrNormalizer.normalizeEpicOcr(noisyEpic);

      expect(result.raw_value).toBe('BR0123456O');
      expect(result.normalized_value).toBe('BRO1234560');
      expect(result.substitutions_applied.length).toBeGreaterThanOrEqual(1);
      expect(result.confidence).toBeGreaterThan(0.90);
    });

    it('should normalize age from Devanagari digits and calculate confidence', () => {
      const res1 = HindiOcrNormalizer.normalizeAge('४२');
      expect(res1.parsed_age).toBe(42);
      expect(res1.confidence).toBe(0.98);

      const res2 = HindiOcrNormalizer.normalizeAge('15'); // Underage
      expect(res2.parsed_age).toBe(15);
      expect(res2.confidence).toBe(0.60); // Low confidence due to legal threshold violation
    });
  });

  describe('2. Multi-Relation Field Detection (Father, Husband, Mother, Other)', () => {
    it('should extract Father relation (पिता का नाम)', () => {
      const block = `101 ABC1234567
निर्वाचक का नाम: अमित कुमार
पिता का नाम: रामेश्वर प्रसाद
गृह संख्या: 45-B
उम्र: 34 लिंग: पुरुष
फोटो उपलब्ध`;

      const card = FieldDetector.parseVoterCard(block, 1, 1);
      expect(card).not.toBeNull();
      expect(card?.serial_number).toBe(101);
      expect(card?.epic_number).toBe('ABC1234567');
      expect(card?.name_hi).toBe('अमित कुमार');
      expect(card?.relation_type).toBe('FATHER');
      expect(card?.relation_name_hi).toBe('रामेश्वर प्रसाद');
      expect(card?.gender).toBe('MALE');
      expect(card?.age).toBe(34);
      expect(card?.photo_available).toBe(true);
      expect(card?.extraction_confidence).toBeGreaterThanOrEqual(0.90);
      expect(card?.validation_status).toBe('VALID');
    });

    it('should extract Husband relation (पति का नाम)', () => {
      const block = `102 XYZ9876543
मतदाता का नाम: सुनीता देवी
पति का नाम: राजेश कुमार
मकान संख्या: 12-A
उम्र: 29 लिंग: महिला
फोटो उपलब्ध`;

      const card = FieldDetector.parseVoterCard(block, 2, 1);
      expect(card).not.toBeNull();
      expect(card?.name_hi).toBe('सुनीता देवी');
      expect(card?.relation_type).toBe('HUSBAND');
      expect(card?.relation_name_hi).toBe('राजेश कुमार');
      expect(card?.gender).toBe('FEMALE');
      expect(card?.age).toBe(29);
      expect(card?.validation_status).toBe('VALID');
    });

    it('should extract Mother relation (माता का नाम)', () => {
      const block = `103 MTR4567890
निर्वाचक का नाम: विकास सिंह
माता का नाम: कौशल्या देवी
गृह संख्या: 88
आयु: 22 लिंग: पुरुष
फोटो उपलब्ध`;

      const card = FieldDetector.parseVoterCard(block, 3, 1);
      expect(card).not.toBeNull();
      expect(card?.name_hi).toBe('विकास सिंह');
      expect(card?.relation_type).toBe('MOTHER');
      expect(card?.relation_name_hi).toBe('कौशल्या देवी');
      expect(card?.validation_status).toBe('VALID');
    });

    it('should extract Other relation (अन्य संबंधी)', () => {
      const block = `104 OTH1122334
निर्वाचक का नाम: रोहन वर्मा
अन्य संबंधी: दयाराम वर्मा
मकान नं: 99/2
आयु: 45 लिंग: पुरुष`;

      const card = FieldDetector.parseVoterCard(block, 4, 1);
      expect(card).not.toBeNull();
      expect(card?.name_hi).toBe('रोहन वर्मा');
      expect(card?.relation_type).toBe('OTHER');
      expect(card?.relation_name_hi).toBe('दयाराम वर्मा');
    });
  });

  describe('3. Confidence Scoring & Validation Queue Routing', () => {
    it('should flag incomplete/low-confidence voter cards for review without discarding them', () => {
      const lowConfidenceBlock = `105
मतदाता का नाम: 
पिता का नाम: अज्ञात
गृह संख्या: 
उम्र: 14 लिंग: अज्ञात`;

      // If voter card has missing EPIC and name is blank, FieldDetector rejects non-voter garbage
      const rejected = FieldDetector.parseVoterCard(lowConfidenceBlock, 5, 1);
      expect(rejected).toBeNull();

      // Card with valid name but missing EPIC and illegal age
      const flaggedBlock = `106
निर्वाचक का नाम: दीपक कुमार
पिता का नाम: सुरेश कुमार
उम्र: 16 लिंग: पुरुष`;

      const flaggedCard = FieldDetector.parseVoterCard(flaggedBlock, 6, 1);
      expect(flaggedCard).not.toBeNull();
      expect(flaggedCard?.requires_review).toBe(true);
      expect(flaggedCard?.validation_status).toBe('WARNING');
      expect(flaggedCard?.review_reasons.length).toBeGreaterThanOrEqual(1);
      expect(flaggedCard?.field_confidences.epic_confidence).toBe(0.0);
    });
  });

  describe('4. Multi-Page Layout & Extraction Report Generation', () => {
    it('should parse multi-page electoral roll text, segment blocks, and produce extraction report', () => {
      const page1Text = `विधानसभा निर्वाचन क्षेत्र: 182-बांकीपुर
भाग संख्या: 45
अनुभाग संख्या व नाम: 1 - कंकड़बाग

101 ABC1234567
निर्वाचक का नाम: राजेश कुमार
पिता का नाम: महेश कुमार
मकान संख्या: 10
उम्र: 40 लिंग: पुरुष
फोटो उपलब्ध

102 ABC1234568
निर्वाचक का नाम: रेखा देवी
पति का नाम: राजेश कुमार
मकान संख्या: 10
उम्र: 36 लिंग: महिला
फोटो उपलब्ध`;

      const page2Text = `103 ABC1234569
निर्वाचक का नाम: आनंद प्रकाश
माता का नाम: शान्ति देवी
मकान संख्या: 12
उम्र: 24 लिंग: पुरुष
फोटो उपलब्ध

104 ABC1234570
निर्वाचक का नाम: प्रिया शर्मा
पति का नाम: आनंद प्रकाश
मकान संख्या: 12
उम्र: 22 लिंग: महिला
फोटो उपलब्ध`;

      const blocksP1 = VoterBlockDetector.detectBlocksOnPage(page1Text);
      const blocksP2 = VoterBlockDetector.detectBlocksOnPage(page2Text);

      expect(blocksP1.length).toBe(2);
      expect(blocksP2.length).toBe(2);

      const metadata = PdfPageExtractor.extractMetadata(page1Text);
      expect(metadata.assembly_constituency).toContain('182-बांकीपुर');
      expect(metadata.part_number).toBe('45');
      expect(metadata.section_name).toContain('1 - कंकड़बाग');

      const parsedP1 = blocksP1.map((b, i) => FieldDetector.parseVoterCard(b, i + 1, 1, metadata));
      const parsedP2 = blocksP2.map((b, i) => FieldDetector.parseVoterCard(b, i + 3, 2, metadata));

      expect(parsedP1.length).toBe(2);
      expect(parsedP2.length).toBe(2);
      expect(parsedP1[0]?.source_page_number).toBe(1);
      expect(parsedP2[0]?.source_page_number).toBe(2);
      expect(parsedP2[0]?.relation_type).toBe('MOTHER');
    });
  });
});
