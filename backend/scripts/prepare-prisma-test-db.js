const { execFileSync } = require('node:child_process');
const path = require('node:path');

const testDatabaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

if (!testDatabaseUrl) {
  console.error(
    'TEST_DATABASE_URL is required for Prisma-backed e2e tests. Example: postgresql://postgres:postgres@localhost:5432/dairy_erp_test',
  );
  process.exit(1);
}

const cwd = path.resolve(__dirname, '..');
const schemaPath = path.resolve(cwd, '../prisma/schema.prisma');

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['prisma', 'db', 'push', '--force-reset', '--schema', schemaPath],
  {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
    },
  },
);
