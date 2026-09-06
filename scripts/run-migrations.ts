import { migrationRunner } from '../src/lib/db/migrate';

async function main() {
  console.log('🚀 Running PostgreSQL schema migrations...');
  try {
    const result = await migrationRunner.runMigrations();
    console.log(`✨ Migration finished.`);
    console.log(`Applied (${result.applied.length}):`, result.applied);
    console.log(`Skipped / Info:`, result.skipped);
  } catch (err) {
    console.error('❌ Migration execution error:', err);
    process.exit(1);
  }
}

main();
