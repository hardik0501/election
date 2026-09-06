import { ParsedRecordDraft } from '../parsers/csv-parser';
import { normalizeEnglish, normalizeEpic, normalizeHindi, normalizeHouseNumber } from '../nlp/normalization';
import { transliterateHindiToEnglish } from '../nlp/transliteration';
import { Gender, RelationType } from '@/types';
import fs from 'fs';
import path from 'path';

export interface GeminiExtractionResult {
  records: ParsedRecordDraft[];
  rawText?: string;
  modelUsed: string;
  success: boolean;
  error?: string;
}

export class GeminiElectoralExtractor {
  private customApiKey: string | null = null;

  public setApiKey(key: string) {
    this.customApiKey = key.trim();
  }

  public getApiKey(): string | null {
    if (this.customApiKey) return this.customApiKey;
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
      return process.env.GEMINI_API_KEY.trim();
    }
    // Check if stored in settings file
    try {
      const configPath = path.join(process.cwd(), 'data', 'gemini_config.json');
      if (fs.existsSync(configPath)) {
        const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (data.gemini_api_key) return data.gemini_api_key.trim();
      }
    } catch {
      // Ignore
    }
    return null;
  }

  public isConfigured(): boolean {
    const key = this.getApiKey();
    return !!(key && key.length > 10 && !key.includes('your_gemini'));
  }

  /**
   * Extract electoral roll records from text content of a page/chunk using Google Gemini
   */
  public async extractFromTextChunk(
    pageText: string,
    pageNum: number,
    metadata?: Record<string, any>
  ): Promise<GeminiExtractionResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        records: [],
        modelUsed: 'none',
        success: false,
        error: 'Gemini API Key is not configured.',
      };
    }

    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-pro'];
    let lastError = '';

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const prompt = `You are an AI specialized in parsing Indian Electoral Rolls (मतदाता सूची / Voter Lists).
Analyze the following raw text from Page #${pageNum} of the electoral roll and extract all voter cards into structured JSON format.

Page Text Content:
"""
${pageText}
"""

Instructions:
1. Extract every single voter card on this page.
2. Structure each voter into the following JSON keys:
   - "serial_number": (integer, e.g. 1, 2, 24, 1142)
   - "epic_number": (string, Voter ID code like TZV0606103, BLS2746162, RJ/06/044/240583, etc.)
   - "name_hi": (string, Voter name in Hindi / Devanagari)
   - "name_en": (string, Voter name in English / Transliteration)
   - "relation_type": ("FATHER" | "HUSBAND" | "MOTHER" | "OTHER")
   - "relation_name_hi": (string, Relative name in Hindi)
   - "relation_name_en": (string, Relative name in English)
   - "house_number": (string, House number like 12, 32 ए, 43/एफ़-2, C56, 436 sushilpura)
   - "age": (integer, Age in years)
   - "gender": ("MALE" | "FEMALE" | "OTHER")
   - "section_name": (string, Section/Area like मेहरा बस्ती, सुशीलपुरा, गुलाबी नगर if mentioned)
   - "is_deleted": (boolean, true if marked with O or DELETED or विलोपन सूची, false otherwise)

Output MUST be a pure JSON array:
[
  {
    "serial_number": 1,
    "epic_number": "TZV0606103",
    "name_hi": "रामप्रसाद",
    "name_en": "Ramprasad",
    "relation_type": "FATHER",
    "relation_name_hi": "बालदास",
    "relation_name_en": "Baldas",
    "house_number": "12",
    "age": 63,
    "gender": "MALE",
    "section_name": "मेहरा बस्ती, सुशीलपुरा, सोडाला",
    "is_deleted": false
  }
]
Return ONLY pure JSON. Do not omit any voter cards.`;

        const requestBody = {
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            response_mime_type: 'application/json',
          },
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errText = await response.text();
          lastError = `Gemini API HTTP ${response.status}: ${errText}`;
          continue;
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const contentText = candidate?.content?.parts?.[0]?.text;

        if (!contentText) {
          lastError = 'Gemini returned empty response';
          continue;
        }

        let cleanedJson = contentText.trim();
        if (cleanedJson.startsWith('```json')) {
          cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedJson.startsWith('```')) {
          cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        let parsedItems: any[] = [];
        try {
          const parsed = JSON.parse(cleanedJson);
          parsedItems = Array.isArray(parsed) ? parsed : parsed.voters || parsed.records || [parsed];
        } catch {
          const match = cleanedJson.match(/\[\s*\{.*\}\s*\]/s);
          if (match) {
            parsedItems = JSON.parse(match[0]);
          } else {
            continue;
          }
        }

        const drafts = this.normalizeExtractedItems(parsedItems, pageNum, metadata);
        return {
          records: drafts,
          rawText: contentText,
          modelUsed: model,
          success: true,
        };
      } catch (err: any) {
        lastError = err.message || String(err);
      }
    }

    return {
      records: [],
      modelUsed: 'failed',
      success: false,
      error: lastError,
    };
  }

  /**
   * Extract electoral roll records from Media Buffer (e.g. Scanned PNG/JPG/WebP/PDF) using Gemini
   */
  public async extractFromMediaBuffer(
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, any>
  ): Promise<GeminiExtractionResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        records: [],
        modelUsed: 'none',
        success: false,
        error: 'Gemini API Key is not configured. Please set GEMINI_API_KEY in .env.local or UI settings.',
      };
    }

    const base64Data = buffer.toString('base64');
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-pro'];
    let lastError = '';

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const prompt = `You are an expert OCR and data extraction system specialized in Indian Electoral Rolls (मतदाता सूची / Voter Lists).
Analyze this uploaded document/image carefully and extract all voter record cards / boxes.

For each voter card, extract:
- serial_number: (integer)
- epic_number: (string, e.g. TZV0606103, BLS2746162, RJ/06/044/240583, etc.)
- name_hi: (string in Devanagari Hindi)
- name_en: (string in English)
- relation_type: ("FATHER" | "HUSBAND" | "MOTHER" | "OTHER")
- relation_name_hi: (string in Devanagari Hindi)
- relation_name_en: (string in English)
- house_number: (string)
- age: (integer)
- gender: ("MALE" | "FEMALE" | "OTHER")
- section_name: (string)
- is_deleted: (boolean)

Return pure JSON array of voter objects without markdown fences:
[
  {
    "serial_number": 1,
    "epic_number": "TZV0606103",
    "name_hi": "रामप्रसाद",
    "name_en": "Ramprasad",
    "relation_type": "FATHER",
    "relation_name_hi": "बालदास",
    "relation_name_en": "Baldas",
    "house_number": "12",
    "age": 63,
    "gender": "MALE",
    "section_name": "मेहरा बस्ती, सुशीलपुरा, सोडाला",
    "is_deleted": false
  }
]`;

        const requestBody = {
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            response_mime_type: 'application/json',
          },
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errText = await response.text();
          lastError = `Gemini API HTTP ${response.status}: ${errText}`;
          continue;
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const contentText = candidate?.content?.parts?.[0]?.text;

        if (!contentText) {
          lastError = 'Gemini returned empty response';
          continue;
        }

        let cleanedJson = contentText.trim();
        if (cleanedJson.startsWith('```json')) {
          cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedJson.startsWith('```')) {
          cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        let parsedItems: any[] = [];
        try {
          const parsed = JSON.parse(cleanedJson);
          parsedItems = Array.isArray(parsed) ? parsed : parsed.voters || parsed.records || [parsed];
        } catch {
          const match = cleanedJson.match(/\[\s*\{.*\}\s*\]/s);
          if (match) {
            parsedItems = JSON.parse(match[0]);
          } else {
            continue;
          }
        }

        const drafts = this.normalizeExtractedItems(parsedItems, 1, metadata);
        return {
          records: drafts,
          rawText: contentText,
          modelUsed: model,
          success: true,
        };
      } catch (err: any) {
        lastError = err.message || String(err);
      }
    }

    return {
      records: [],
      modelUsed: 'failed',
      success: false,
      error: lastError || 'Gemini Vision extraction failed across all models',
    };
  }

  private normalizeExtractedItems(
    items: any[],
    pageNum: number,
    metadata?: Record<string, any>
  ): ParsedRecordDraft[] {
    return items.map((item, idx) => {
      const nameHi = normalizeHindi(item.name_hi || item.name || '');
      let nameEn = normalizeEnglish(item.name_en || '');
      if (!nameEn && nameHi) {
        nameEn = transliterateHindiToEnglish(nameHi);
      }

      const relHi = normalizeHindi(item.relation_name_hi || item.relation_name || '');
      let relEn = normalizeEnglish(item.relation_name_en || '');
      if (!relEn && relHi) {
        relEn = transliterateHindiToEnglish(relHi);
      }

      let relType: RelationType = 'OTHER';
      const rawRel = String(item.relation_type || '').toUpperCase();
      if (rawRel.includes('FATHER') || rawRel.includes('पिता')) relType = 'FATHER';
      else if (rawRel.includes('HUSBAND') || rawRel.includes('पति')) relType = 'HUSBAND';
      else if (rawRel.includes('MOTHER') || rawRel.includes('माता')) relType = 'MOTHER';
      else if (rawRel.includes('WIFE') || rawRel.includes('पत्नी')) relType = 'OTHER';

      let gender: Gender = 'UNKNOWN';
      const rawGen = String(item.gender || '').toUpperCase();
      if (rawGen.includes('MALE') || rawGen.includes('पुरुष') || rawGen === 'M') gender = 'MALE';
      else if (rawGen.includes('FEMALE') || rawGen.includes('महिला') || rawGen.includes('स्त्री') || rawGen === 'F') gender = 'FEMALE';
      else if (rawGen.includes('OTHER') || rawGen.includes('THIRD') || rawGen.includes('अन्य')) gender = 'OTHER';

      const epic = normalizeEpic(item.epic_number || item.epic || item.voter_id || '');
      const ageNum = typeof item.age === 'number' ? item.age : parseInt(item.age, 10);
      const validAge = !isNaN(ageNum) && ageNum > 0 && ageNum <= 125 ? ageNum : null;

      const rawSerial = item.serial_number ? parseInt(item.serial_number, 10) : idx + 1;
      const cleanSerial = !isNaN(rawSerial) && rawSerial > 0 ? rawSerial : idx + 1;
      const pageNo = item.page_number || pageNum || 1;

      const isDeleted = Boolean(item.is_deleted);

      return {
        serial_number: cleanSerial,
        source_page_number: pageNo,
        source_serial_number: cleanSerial,
        epic_number: epic || null,
        name_hi: nameHi,
        name_en: nameEn,
        name_hindi: nameHi,
        name_english: nameEn,
        normalized_name: nameEn || nameHi,
        normalized_name_hi: nameHi,
        normalized_name_en: nameEn,
        relation_name_hi: relHi || null,
        relation_name_en: relEn || null,
        relation_name_hindi: relHi || null,
        relation_name_english: relEn || null,
        normalized_relation_name_hi: relHi || null,
        normalized_relation_name_en: relEn || null,
        relation_type: relType,
        gender,
        age: validAge,
        house_number: normalizeHouseNumber(item.house_number || '') || null,
        normalized_house_number: normalizeHouseNumber(item.house_number || '') || null,
        area: item.section_name || item.area || metadata?.area || null,
        section_name: item.section_name || metadata?.area || null,
        ward_number: item.ward_number || metadata?.ward_number || null,
        part_number: item.part_number || metadata?.part_number || null,
        polling_station_name: metadata?.polling_station_name || null,
        assembly_constituency: metadata?.assembly_constituency || null,
        district: metadata?.district || null,
        state: metadata?.state || 'RAJASTHAN',
        photo_available: true,
        extraction_confidence: 0.98,
        validation_status: isDeleted ? 'REJECTED' : (epic && (nameHi || nameEn) ? 'VALID' : 'WARNING'),
        raw_extracted_data: item,
      };
    });
  }
}

export const geminiElectoralExtractor = new GeminiElectoralExtractor();
