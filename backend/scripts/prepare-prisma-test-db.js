const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const cwd = path.resolve(__dirname, '..');

// If neither environment variable is set, try loading from .env.test or .env automatically
if (!process.env.TEST_DATABASE_URL && !process.env.DATABASE_URL) {
  for (const envFile of ['.env.test', '.env']) {
    const envPath = path.join(cwd, envFile);
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const match = line.match(/^(TEST_DATABASE_URL|DATABASE_URL)=(.+)$/);
        if (match && match[2] && !process.env[match[1]]) {
          process.env[match[1]] = match[2].trim();
        }
      }
    }
  }
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

if (!testDatabaseUrl) {
  console.error(
    'TEST_DATABASE_URL is required for Prisma-backed e2e tests. Example: postgresql://postgres:postgres@localhost:5432/dairy_erp_test',
  );
  process.exit(1);
}

const schemaPath = path.resolve(cwd, '../prisma/schema.prisma');
const clientPath = path.resolve(cwd, 'node_modules/.prisma/client/index.js');
const hasClient = fs.existsSync(clientPath);

const pushArgs = ['prisma', 'db', 'push', '--force-reset', '--schema', schemaPath];
if (hasClient) {
  pushArgs.push('--skip-generate');
}

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  pushArgs,
  {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
    },
  },
);
