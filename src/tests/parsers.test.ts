import { describe, it, expect } from 'vitest';
import { tabularParser } from '../lib/parsers/csv-parser';
import { pdfElectoralRollParser } from '../lib/parsers/pdf-parser';

describe('Tabular Voter Parser Suite', () => {
  it('should parse Hindi electoral CSV data with auto-transliteration and field mapping', async () => {
    const sampleCsv = `serial_no,epic_number,voter_name,father_name,gender,age,house_no,ward_no,part_no
1,WB1234567,रमेश कुमार,सुरेश कुमार,MALE,35,42-B,14,102
2,WB1234568,सुनीता देवी,रमेश कुमार,FEMALE,32,42-B,14,102`;

    const records = await tabularParser.parseBuffer(Buffer.from(sampleCsv, 'utf-8'), 'CSV');

    expect(records.length).toBe(2);
    expect(records[0].source_serial_number).toBe(1);
    expect(records[0].epic_number).toBe('WB1234567');
    expect(records[0].name_hindi).toBe('रमेश कुमार');
    expect(records[0].name_english.toLowerCase()).toContain('ramesh');
    expect(records[0].relation_type).toBe('FATHER');
    expect(records[0].gender).toBe('MALE');
    expect(records[0].age).toBe(35);
    expect(records[0].house_number).toBe('42-B');
    expect(records[0].ward_number).toBe('14');

    expect(records[1].source_serial_number).toBe(2);
    expect(records[1].name_hindi).toBe('सुनीता देवी');
    expect(records[1].gender).toBe('FEMALE');
  });

  it('should parse standard electoral text box', () => {
    const rawBox = `142 WB/12/34567
निर्वाचक का नाम: राजेश शर्मा
पिता का नाम: महेश शर्मा
गृह संख्या: 15
उम्र: 40 लिंग: पुरुष फोटो उपलब्ध`;

    const parsed = pdfElectoralRollParser.parseVoterTextBlock(rawBox, 142);
    expect(parsed).not.toBeNull();
    expect(parsed?.source_serial_number).toBe(142);
    expect(parsed?.epic_number).toBe('WB/12/34567');
    expect(parsed?.name_hindi).toBe('राजेश शर्मा');
    expect(parsed?.name_english.toLowerCase()).toContain('rajesh');
    expect(parsed?.relation_type).toBe('FATHER');
    expect(parsed?.relation_name_hindi).toBe('महेश शर्मा');
    expect(parsed?.gender).toBe('MALE');
    expect(parsed?.age).toBe(40);
    expect(parsed?.house_number).toBe('15');
    expect(parsed?.photo_available).toBe(true);
  });
});
