import { parse as parseCsv } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import {
  Gender,
  RelationType,
  ValidationStatus,
  ColumnMappingConfig,
  CsvPreviewResponse,
} from '@/types';
import {
  detectScript,
  normalizeEnglish,
  normalizeEpic,
  normalizeHindi,
  normalizeHouseNumber,
} from '../nlp/normalization';
import {
  transliterateEnglishToHindi,
  transliterateHindiToEnglish,
} from '../nlp/transliteration';

export interface ParsedRecordDraft {
  serial_number: number;
  source_page_number: number;
  source_serial_number: number;
  epic_number: string | null;
  name_hi: string;
  name_en: string;
  normalized_name_hi: string;
  normalized_name_en: string;
  relation_type: RelationType;
  relation_name_hi: string | null;
  relation_name_en: string | null;
  normalized_relation_name_hi: string | null;
  normalized_relation_name_en: string | null;
  gender: Gender;
  age: number | null;
  house_number: string | null;
  normalized_house_number: string | null;
  ward_number: string | null;
  part_number: string | null;
  area: string | null;
  section_name: string | null;
  polling_station_name: string | null;
  assembly_constituency: string | null;
  district: string | null;
  state: string;
  photo_available: boolean;
  extraction_confidence: number;
  validation_status: ValidationStatus;
  raw_extracted_data: Record<string, any>;

  // Aliases
  name_hindi: string;
  name_english: string;
  normalized_name: string;
  relation_name_hindi: string | null;
  relation_name_english: string | null;
}

export class TabularVoterParser {
  /**
   * Preview a CSV or XLSX file and suggest automatic column mappings
   */
  public preview(buffer: Buffer, fileType: 'CSV' | 'XLSX'): CsvPreviewResponse {
    let rawRows: Record<string, any>[] = [];

    if (fileType === 'CSV') {
      const content = buffer.toString('utf-8');
      rawRows = parseCsv(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } else {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
    }

    if (rawRows.length === 0) {
      return {
        headers: [],
        sample_rows: [],
        total_rows_estimate: 0,
        suggested_mapping: {},
      };
    }

    const headers = Object.keys(rawRows[0]);
    const suggestedMapping = this.detectSuggestedMapping(headers);

    return {
      headers,
      sample_rows: rawRows.slice(0, 5),
      total_rows_estimate: rawRows.length,
      suggested_mapping: suggestedMapping,
    };
  }

  /**
   * Parse CSV, TSV, or XLSX file buffer into voter record drafts with custom mapping
   */
  public async parseBuffer(
    buffer: Buffer,
    fileType: 'CSV' | 'XLSX',
    metadata?: Record<string, any>,
    columnMapping?: ColumnMappingConfig
  ): Promise<ParsedRecordDraft[]> {
    let rawRows: Record<string, any>[] = [];

    if (fileType === 'CSV') {
      const content = buffer.toString('utf-8');
      rawRows = parseCsv(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } else if (fileType === 'XLSX') {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
    }

    const records: ParsedRecordDraft[] = [];

    for (let index = 0; index < rawRows.length; index++) {
      const row = rawRows[index];
      const parsed = this.mapRowToVoterRecord(row, index + 1, metadata, columnMapping);
      if (parsed) {
        records.push(parsed);
      }
    }

    return records;
  }

  /**
   * Header mapping & normalization with custom mapping support
   */
  public mapRowToVoterRecord(
    row: Record<string, any>,
    fallbackSerial: number,
    batchMeta?: Record<string, any>,
    mapping?: ColumnMappingConfig
  ): ParsedRecordDraft | null {
    // 1. If custom mapping is supplied, resolve fields directly
    const getVal = (mapKey?: string, fallbackKeys: string[] = []) => {
      if (mapKey && row[mapKey] !== undefined && row[mapKey] !== null && String(row[mapKey]).trim() !== '') {
        return row[mapKey];
      }
      for (const k of fallbackKeys) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
          return row[k];
        }
      }
      // Check case-insensitive key
      for (const [k, v] of Object.entries(row)) {
        const clean = k.toLowerCase().replace(/[\s_\-.]/g, '');
        for (const fk of fallbackKeys) {
          if (clean === fk.toLowerCase().replace(/[\s_\-.]/g, '')) {
            return v;
          }
        }
      }
      return undefined;
    };

    // Serial
    const rawSerial = getVal(mapping?.serial_number, ['serial_number', 'serial_no', 'slno', 'srno', 'क्रमांक']);
    const serialNo = parseInt(String(rawSerial), 10) || fallbackSerial;

    // EPIC
    const rawEpic = getVal(mapping?.epic_number, ['epic_number', 'epic_no', 'epic', 'voter_id', 'voterid', 'पहचानपत्रक्र']);
    const epic = normalizeEpic(rawEpic ? String(rawEpic) : null);

    // Name Resolution
    const rawNameAuto = getVal(mapping?.name_auto, ['name', 'voter_name', 'fullname', 'मतदाताकानाम', 'निर्वाचककानाम']);
    const rawNameHi = getVal(mapping?.name_hi, ['name_hi', 'voter_name_hindi', 'name_hindi', 'नाम_हिंदी']);
    const rawNameEn = getVal(mapping?.name_en, ['name_en', 'voter_name_english', 'name_english', 'name_eng']);

    let nameHindi = '';
    let nameEnglish = '';

    if (rawNameHi && rawNameEn) {
      nameHindi = normalizeHindi(String(rawNameHi));
      nameEnglish = normalizeEnglish(String(rawNameEn));
    } else if (rawNameHi) {
      nameHindi = normalizeHindi(String(rawNameHi));
      nameEnglish = transliterateHindiToEnglish(nameHindi);
    } else if (rawNameEn) {
      nameEnglish = normalizeEnglish(String(rawNameEn));
      const cand = transliterateEnglishToHindi(nameEnglish);
      nameHindi = cand[0] || nameEnglish;
    } else if (rawNameAuto) {
      const nameStr = String(rawNameAuto).trim();
      if (detectScript(nameStr) === 'devanagari') {
        nameHindi = normalizeHindi(nameStr);
        nameEnglish = transliterateHindiToEnglish(nameHindi);
      } else {
        nameEnglish = normalizeEnglish(nameStr);
        const cand = transliterateEnglishToHindi(nameEnglish);
        nameHindi = cand[0] || nameEnglish;
      }
    }

    if (!nameHindi && !nameEnglish) {
      return null;
    }

    // Relation Resolution
    const rawRelType = getVal(mapping?.relation_type, ['relation_type', 'relation', 'संबंध', 'रिश्ता']);
    const rawRelNameAuto = getVal(mapping?.relation_name, ['relation_name', 'father_name', 'husband_name', 'mother_name', 'पिताकानाम', 'संबंधीकानाम']);
    const rawRelNameHi = getVal(mapping?.relation_name_hi, ['relation_name_hi', 'father_name_hi']);
    const rawRelNameEn = getVal(mapping?.relation_name_en, ['relation_name_en', 'father_name_en']);

    let relationType: RelationType = 'UNKNOWN';
    if (rawRelType) {
      const relLower = String(rawRelType).toLowerCase();
      if (relLower.includes('fat') || relLower.includes('पित') || relLower === 'f') relationType = 'FATHER';
      else if (relLower.includes('hus') || relLower.includes('पत') || relLower === 'h') relationType = 'HUSBAND';
      else if (relLower.includes('mot') || relLower.includes('मात') || relLower === 'm') relationType = 'MOTHER';
      else if (relLower.includes('oth') || relLower.includes('अन्य')) relationType = 'OTHER';
    } else if (getVal(undefined, ['father_name', 'fathername', 'पिताकानाम'])) {
      relationType = 'FATHER';
    } else if (getVal(undefined, ['husband_name', 'husbandname', 'पतिककानाम'])) {
      relationType = 'HUSBAND';
    } else if (getVal(undefined, ['mother_name', 'mothername', 'माताकानाम'])) {
      relationType = 'MOTHER';
    }

    let relNameHindi = '';
    let relNameEnglish = '';
    const rawRelVal = rawRelNameAuto || rawRelNameHi || rawRelNameEn;

    if (rawRelNameHi && rawRelNameEn) {
      relNameHindi = normalizeHindi(String(rawRelNameHi));
      relNameEnglish = normalizeEnglish(String(rawRelNameEn));
    } else if (rawRelVal) {
      const relStr = String(rawRelVal).trim();
      if (detectScript(relStr) === 'devanagari') {
        relNameHindi = normalizeHindi(relStr);
        relNameEnglish = transliterateHindiToEnglish(relNameHindi);
      } else {
        relNameEnglish = normalizeEnglish(relStr);
        const transl = transliterateEnglishToHindi(relNameEnglish);
        relNameHindi = transl[0] || relNameEnglish;
      }
    }

    // Gender
    const rawGender = getVal(mapping?.gender, ['gender', 'sex', 'लिंग']);
    let gender: Gender = 'UNKNOWN';
    if (rawGender) {
      const gStr = String(rawGender).toLowerCase();
      if (gStr.startsWith('m') || gStr.includes('पुरुष') || gStr.includes('मेल') || gStr === '1') gender = 'MALE';
      else if (gStr.startsWith('f') || gStr.includes('महिला') || gStr.includes('स्त्री') || gStr.includes('फीमेल') || gStr === '2') gender = 'FEMALE';
      else if (gStr.includes('other') || gStr.includes('third') || gStr.includes('अन्य') || gStr.includes('तृतीय')) gender = 'OTHER';
    }

    // Age
    const rawAge = getVal(mapping?.age, ['age', 'voter_age', 'उम्र', 'आयु']);
    const ageNum = rawAge ? parseInt(String(rawAge), 10) : null;
    const age = typeof ageNum === 'number' && !isNaN(ageNum) ? ageNum : null;

    // Location
    const rawHouse = getVal(mapping?.house_number, ['house_number', 'house_no', 'hno', 'मकाननंबर', 'गृहसंख्या']);
    const houseNo = rawHouse ? normalizeHouseNumber(String(rawHouse)) : null;

    const ward = getVal(mapping?.ward_number, ['ward_number', 'ward_no', 'ward', 'वार्ड']) || batchMeta?.ward_number || null;
    const partNo = getVal(mapping?.part_number, ['part_number', 'part_no', 'part', 'भागसंख्या']) || batchMeta?.part_number || null;
    const area = getVal(mapping?.area, ['area', 'section_name', 'section', 'अनुभाग']) || batchMeta?.section_name || null;
    const assembly = getVal(mapping?.assembly_constituency, ['assembly_constituency', 'assembly', 'विधानसभा']) || batchMeta?.assembly_constituency || null;
    const district = getVal(mapping?.district, ['district', 'जिला']) || batchMeta?.district || null;

    const normNameHi = normalizeHindi(nameHindi);
    const normNameEn = normalizeEnglish(nameEnglish || transliterateHindiToEnglish(nameHindi));
    const normRelHi = relNameHindi ? normalizeHindi(relNameHindi) : null;
    const normRelEn = relNameEnglish ? normalizeEnglish(relNameEnglish) : null;
    const normHouse = houseNo ? normalizeHouseNumber(houseNo) : null;

    let validationStatus: ValidationStatus = 'VALID';
    if (!epic) validationStatus = 'WARNING';
    if (!age || age < 18) validationStatus = 'WARNING';

    return {
      serial_number: serialNo,
      source_page_number: 1,
      source_serial_number: serialNo,
      epic_number: epic || null,
      name_hi: nameHindi,
      name_en: nameEnglish || transliterateHindiToEnglish(nameHindi),
      normalized_name_hi: normNameHi,
      normalized_name_en: normNameEn,
      relation_type: relationType,
      relation_name_hi: relNameHindi || null,
      relation_name_en: relNameEnglish || null,
      normalized_relation_name_hi: normRelHi,
      normalized_relation_name_en: normRelEn,
      gender,
      age,
      house_number: houseNo || null,
      normalized_house_number: normHouse,
      ward_number: ward ? String(ward) : null,
      part_number: partNo ? String(partNo) : null,
      area: area ? String(area) : null,
      section_name: area ? String(area) : null,
      polling_station_name: batchMeta?.polling_station_name || null,
      assembly_constituency: assembly ? String(assembly) : null,
      district: district ? String(district) : null,
      state: batchMeta?.state || 'INDIA',
      photo_available: false,
      extraction_confidence: 0.98,
      validation_status: validationStatus,
      raw_extracted_data: row,

      // Aliases
      name_hindi: nameHindi,
      name_english: nameEnglish || transliterateHindiToEnglish(nameHindi),
      normalized_name: normNameEn,
      relation_name_hindi: relNameHindi || null,
      relation_name_english: relNameEnglish || null,
    };
  }

  private detectSuggestedMapping(headers: string[]): ColumnMappingConfig {
    const mapping: ColumnMappingConfig = {};
    for (const h of headers) {
      const clean = h.toLowerCase().replace(/[\s_\-.]/g, '');
      if (clean.includes('epic') || clean.includes('voterid') || clean.includes('पहचान')) {
        mapping.epic_number = h;
      } else if (clean.includes('namehi') || clean.includes('नामहिंदी')) {
        mapping.name_hi = h;
      } else if (clean.includes('nameen') || clean.includes('nameeng')) {
        mapping.name_en = h;
      } else if (clean.includes('name') || clean.includes('नाम') || clean.includes('voter')) {
        if (!mapping.name_auto && !mapping.name_hi) mapping.name_auto = h;
      } else if (clean.includes('father') || clean.includes('पिता') || clean.includes('relation') || clean.includes('संबंध')) {
        mapping.relation_name = h;
      } else if (clean.includes('reltype') || clean.includes('रिश्ता')) {
        mapping.relation_type = h;
      } else if (clean.includes('gender') || clean.includes('sex') || clean.includes('लिंग')) {
        mapping.gender = h;
      } else if (clean.includes('age') || clean.includes('उम्र') || clean.includes('आयु')) {
        mapping.age = h;
      } else if (clean.includes('house') || clean.includes('hno') || clean.includes('मकान') || clean.includes('गृह')) {
        mapping.house_number = h;
      } else if (clean.includes('ward') || clean.includes('वार्ड')) {
        mapping.ward_number = h;
      } else if (clean.includes('part') || clean.includes('भाग')) {
        mapping.part_number = h;
      } else if (clean.includes('serial') || clean.includes('slno') || clean.includes('क्रमांक')) {
        mapping.serial_number = h;
      } else if (clean.includes('area') || clean.includes('section') || clean.includes('अनुभाग')) {
        mapping.area = h;
      }
    }
    return mapping;
  }
}

export const tabularParser = new TabularVoterParser();
