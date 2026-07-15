// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import request = require('supertest');
import { SettingsController } from '../src/core/settings/settings.controller';
import { SettingsService } from '../src/core/settings/settings.service';
import {
  IDS,
  createPrismaBackedApp,
  disconnectPrisma,
  ensureTestDatabaseUrl,
  getPrisma,
  resetPrismaTestDb,
  seedBaseFixture,
} from './helpers/prisma-e2e';

function createRetailerActor(retailerId = IDS.retailer) {
  return {
    id: '20000000-0000-4000-8000-000000000199',
    organizationId: IDS.org,
    retailerId,
    employeeId: null,
    fullName: 'Retailer User',
    mobile: '8888800000',
    userType: 'retailer_user',
    roles: ['RETAILER'],
    permissions: [],
  };
}

async function withEnv(overrides: Record<string, string | undefined>, fn: () => Promise<void>) {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    await fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function buildApp(actor?: any) {
  ensureTestDatabaseUrl();
  const prisma = await getPrisma();
  await resetPrismaTestDb(prisma);
  await seedBaseFixture(prisma);

  return createPrismaBackedApp({
    controllers: [SettingsController],
    providers: [SettingsService],
    actor,
  });
}

test('Prisma-backed HTTP e2e: get retailer note thresholds returns env-backed effective values', async (t) => {
  await withEnv(
    {
      RETAILER_NOTE_THRESHOLD_CACHE_TTL_MS: '60000',
      RETAILER_CREDIT_NOTE_MAX_AMOUNT: '250',
      RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT: '25',
      RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '120',
      RETAILER_DEBIT_NOTE_MAX_AMOUNT: '300',
    },
    async () => {
      const { app } = await buildApp();
      t.after(async () => {
        await app.close();
        await disconnectPrisma();
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/settings/retailer-note-thresholds')
        .expect(200);

      assert.equal(response.body.success, true);
      assert.deepEqual(response.body.data.effective, {
        creditNoteMaxAmount: 250,
        creditNoteMaxTaxAmount: 25,
        creditNoteMaxTotalAmount: 120,
        debitNoteMaxAmount: 300,
      });
      assert.deepEqual(response.body.data.sources, {
        creditNoteMaxAmount: 'env',
        creditNoteMaxTaxAmount: 'env',
        creditNoteMaxTotalAmount: 'env',
        debitNoteMaxAmount: 'env',
      });
    },
  );
});

test('Prisma-backed HTTP e2e: threshold cache debug counters expose hit and miss totals', async (t) => {
  await withEnv(
    {
      RETAILER_NOTE_THRESHOLD_CACHE_TTL_MS: '60000',
      RETAILER_CREDIT_NOTE_MAX_AMOUNT: '250',
      RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT: '25',
      RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '120',
      RETAILER_DEBIT_NOTE_MAX_AMOUNT: '300',
    },
    async () => {
      const { app } = await buildApp();
      t.after(async () => {
        await app.close();
        await disconnectPrisma();
      });

      await request(app.getHttpServer()).get('/api/v1/settings/retailer-note-thresholds').expect(200);
      await request(app.getHttpServer()).get('/api/v1/settings/retailer-note-thresholds').expect(200);

      const debug = await request(app.getHttpServer())
        .get('/api/v1/settings/retailer-note-thresholds/cache-debug')
        .expect(200);

      assert.equal(debug.body.success, true);
      assert.equal(debug.body.data.ttlMs, 60000);
      assert.equal(debug.body.data.totals.misses, 1);
      assert.equal(debug.body.data.totals.hits, 1);
      assert.equal(debug.body.data.organizations[IDS.org].misses, 1);
      assert.equal(debug.body.data.organizations[IDS.org].hits, 1);
      assert.equal(debug.body.data.organizations[IDS.org].cached, true);
    },
  );
});

test('Prisma-backed HTTP e2e: cache reset endpoint invalidates org cache and allows fresh threshold read', async (t) => {
  await withEnv(
    {
      RETAILER_NOTE_THRESHOLD_CACHE_TTL_MS: '60000',
      RETAILER_CREDIT_NOTE_MAX_AMOUNT: '250',
      RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT: '25',
      RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '120',
      RETAILER_DEBIT_NOTE_MAX_AMOUNT: '300',
    },
    async () => {
      const { app, prisma } = await buildApp();
      t.after(async () => {
        await app.close();
        await disconnectPrisma();
      });

      const first = await request(app.getHttpServer())
        .get('/api/v1/settings/retailer-note-thresholds')
        .expect(200);
      assert.equal(first.body.data.effective.creditNoteMaxAmount, 250);

      await prisma.systemSetting.create({
        data: {
          organizationId: IDS.org,
          settingGroup: 'retailer_note_limits',
          settingKey: 'credit_note_max_amount',
          valueJson: 500,
        },
      });

      const reset = await request(app.getHttpServer())
        .post('/api/v1/settings/retailer-note-thresholds/cache-reset')
        .expect(201);
      assert.equal(reset.body.success, true);
      assert.equal(reset.body.message, 'Retailer note threshold cache reset successfully');
      assert.equal(reset.body.data.totals.invalidations >= 1, true);

      const second = await request(app.getHttpServer())
        .get('/api/v1/settings/retailer-note-thresholds')
        .expect(200);
      assert.equal(second.body.data.effective.creditNoteMaxAmount, 500);
      assert.equal(second.body.data.sources.creditNoteMaxAmount, 'db');
    },
  );
});

test('Prisma-backed HTTP e2e: patch retailer note thresholds persists org-level overrides', async (t) => {
  await withEnv(
    {
      RETAILER_CREDIT_NOTE_MAX_AMOUNT: '1000',
      RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT: '1000',
      RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '1000',
      RETAILER_DEBIT_NOTE_MAX_AMOUNT: '1000',
    },
    async () => {
      const { app, prisma } = await buildApp();
      t.after(async () => {
        await app.close();
        await disconnectPrisma();
      });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/settings/retailer-note-thresholds')
        .send({
          creditNoteMaxAmount: 250,
          creditNoteMaxTaxAmount: 25,
          creditNoteMaxTotalAmount: 120,
          debitNoteMaxAmount: 300,
        })
        .expect(200);

      assert.equal(response.body.success, true);
      assert.deepEqual(response.body.data.sources, {
        creditNoteMaxAmount: 'db',
        creditNoteMaxTaxAmount: 'db',
        creditNoteMaxTotalAmount: 'db',
        debitNoteMaxAmount: 'db',
      });

      const rows = await prisma.systemSetting.findMany({
        where: { organizationId: IDS.org, settingGroup: 'retailer_note_limits' },
      });
      assert.equal(rows.length, 4);
    },
  );
});

test('Prisma-backed HTTP e2e: reset retailer note thresholds clears org-level overrides and falls back to env', async (t) => {
  await withEnv(
    {
      RETAILER_CREDIT_NOTE_MAX_AMOUNT: '250',
      RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT: '25',
      RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '120',
      RETAILER_DEBIT_NOTE_MAX_AMOUNT: '300',
    },
    async () => {
      const { app, prisma } = await buildApp();
      await prisma.systemSetting.createMany({
        data: [
          {
            organizationId: IDS.org,
            settingGroup: 'retailer_note_limits',
            settingKey: 'credit_note_max_amount',
            valueJson: 500,
          },
          {
            organizationId: IDS.org,
            settingGroup: 'retailer_note_limits',
            settingKey: 'debit_note_max_amount',
            valueJson: 700,
          },
        ],
      });
      t.after(async () => {
        await app.close();
        await disconnectPrisma();
      });

      const response = await request(app.getHttpServer())
        .delete('/api/v1/settings/retailer-note-thresholds')
        .expect(200);

      assert.equal(response.body.success, true);
      assert.equal(response.body.data.effective.creditNoteMaxAmount, 250);
      assert.equal(response.body.data.effective.debitNoteMaxAmount, 300);

      const rows = await prisma.systemSetting.findMany({
        where: { organizationId: IDS.org, settingGroup: 'retailer_note_limits' },
      });
      assert.equal(rows.length, 0);
    },
  );
});

test('Prisma-backed HTTP e2e: retailer user cannot manage retailer note thresholds', async (t) => {
  const { app } = await buildApp(createRetailerActor());
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/settings/retailer-note-thresholds')
    .expect(403);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Backoffice access required');
});

test('Prisma-backed HTTP e2e: retailer user cannot access threshold cache debug counters', async (t) => {
  const { app } = await buildApp(createRetailerActor());
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/settings/retailer-note-thresholds/cache-debug')
    .expect(403);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Backoffice access required');
});

test('Prisma-backed HTTP e2e: retailer user cannot reset threshold cache', async (t) => {
  const { app } = await buildApp(createRetailerActor());
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post('/api/v1/settings/retailer-note-thresholds/cache-reset')
    .expect(403);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Backoffice access required');
});

test('Prisma-backed HTTP e2e: patch retailer note thresholds requires at least one value', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .patch('/api/v1/settings/retailer-note-thresholds')
    .send({})
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'At least one threshold value is required');
});
