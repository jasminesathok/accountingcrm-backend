const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

// Runs every migration file's up(queryInterface) automatically, in filename
// order (each file is dated, e.g. 20260803-...), so schema changes like
// migrations/20260803-add-account-code.js land without a manual
// `node migrations/xxx.js up` step. Every migration in this project already
// checks describeTable()/showAllTables() before adding anything, so running
// them again on an already-migrated database is a safe no-op — that's what
// makes it safe to run this on every server start rather than once.
async function runMigrations(queryInterface) {
  if (!fs.existsSync(MIGRATIONS_DIR)) return;

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.js'))
    .sort();

  for (const file of files) {
    try {
      const migration = require(path.join(MIGRATIONS_DIR, file));
      if (typeof migration.up === 'function') {
        await migration.up(queryInterface);
      }
    } catch (error) {
      // Log and continue — one migration failing (e.g. a column added by
      // hand already, or a permissions issue) shouldn't stop the server
      // from starting, since sync() has already created the base tables.
      console.error(`⚠️  Migration ${file} failed:`, error.message);
    }
  }
}

module.exports = runMigrations;
