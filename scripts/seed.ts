import fs from 'fs';
import path from 'path';
import { ingestionProcessor } from '../src/lib/ingestion/processor';

async function seed() {
  const filePath = path.join(process.cwd(), 'data', 'sample_bihar_electoral_roll.csv');
  if (!fs.existsSync(filePath)) {
    console.log('Sample data not found.');
    return;
  }

  const csvBuffer = fs.readFileSync(filePath);
  console.log('Seeding sample electoral roll dataset...');

  const result = await ingestionProcessor.processBatch({
    batchName: '182-Patna Sahib Ward 14 Sample Electoral Roll',
    metadata: {
      assembly_constituency: '182-Patna Sahib',
      ward_number: 'Ward-14',
      part_number: 'Part-102',
      district: 'Patna',
      state: 'BIHAR',
    },
    files: [
      {
        filename: 'sample_bihar_electoral_roll.csv',
        buffer: csvBuffer,
        fileType: 'CSV',
      },
    ],
  });

  console.log(`✅ Seed completed: Ingested ${result.totalRecordsProcessed} records into local repository.`);
}

seed().catch(console.error);
