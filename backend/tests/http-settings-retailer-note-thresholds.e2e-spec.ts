// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../src/common/interfaces/authenticated-user.interface';
import { RetailerNoteThresholdCache } from '../src/core/settings/retailer-note-thresholds';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettingsController } from '../src/core/settings/settings.controller';
import { SettingsService } from '../src/core/settings/settings.service';

const IDS = {
  org: '61000000-0000-4000-8000-000000000001',
  user: '61000000-0000-4000-8000-000000000002',
  retailerUser: '61000000-0000-4000-8000-000000000003',
  retailer: '61000000-0000-4000-8000-000000000004',
};

function createActor(): AuthenticatedUser {
  return {
    id: IDS.user,
    organizationId: IDS.org,
    retailerId: null,
    employeeId: null,
    fullName: 'Owner User',
    mobile: '9999999999',
    userType: 'owner',
    roles: ['OWNER'],
    permissions: [],
  };
}

function createRetailerActor(): AuthenticatedUser {
  return {
    id: IDS.retailerUser,
    organizationId: IDS.org,
    retailerId: IDS.retailer,
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

function createHarness() {
  RetailerNoteThresholdCache.invalidate(IDS.org);
  RetailerNoteThresholdCache.resetDebugCounters();
  const state = {
    systemSettings: [] as any[],
  };

  let counter = 100;
  const nextId = () => `61000000-0000-4000-8000-${String(counter++).padStart(12, '0')}`;
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

  const prisma: any = {
    $transaction: async (fn: any) => fn(prisma),
    systemSetting: {
      findFirst: async ({ where, select }: any = {}) => {
        const row =
          state.systemSettings.find(
            (x: any) =>
              (!where?.organizationId || x.organizationId === where.organizationId) &&
              (!where?.settingGroup || x.settingGroup === where.settingGroup) &&
              (!where?.settingKey || x.settingKey === where.settingKey),
          ) ?? null;
        if (!row) return null;
        if (!select) return clone(row);
        const out: any = {};
        for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
        return out;
      },
      findMany: async ({ where }: any = {}) =>
        state.systemSettings
          .filter(
            (x: any) =>
              (!where?.organizationId || x.organizationId === where.organizationId) &&
              (!where?.settingGroup || x.settingGroup === where.settingGroup) &&
              (!where?.settingKey?.in || where.settingKey.in.includes(x.settingKey)),
          )
          .map(clone),
      create: async ({ data }: any) => {
        const row = { id: nextId(), createdAt: new Date(), updatedAt: new Date(), isEncrypted: false, ...data };
        state.systemSettings.push(row);
        return clone(row);
      },
      update: async ({ where, data }: any) => {
        const row = state.systemSettings.find((x: any) => x.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
      deleteMany: async ({ where }: any = {}) => {
        const before = state.systemSettings.length;
        state.systemSettings = state.systemSettings.filter(
          (x: any) =>
            !!(
              (where?.organizationId && x.organizationId !== where.organizationId) ||
              (where?.settingGroup && x.settingGroup !== where.settingGroup) ||
              (where?.settingKey?.in && !where.settingKey.in.includes(x.settingKey))
            ),
        );
        return { count: before - state.systemSettings.length };
      },
    },
  };

  return { actor: createActor(), state, prisma };
}

async function createApp(actor: AuthenticatedUser = createActor()) {
  const harness = createHarness();
  const moduleRef = await Test.createTestingModule({
    controllers: [SettingsController],
    providers: [SettingsService, { provide: PrismaService, useValue: harness.prisma }],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate(context: any) {
        context.switchToHttp().getRequest().user = actor;
        return true;
      },
    })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  return { app, harness };
}

test('HTTP e2e: get retailer note thresholds returns env-backed effective values for admin UI', async (t) => {
  await withEnv(
    {
      RETAILER_CREDIT_NOTE_MAX_AMOUNT: '250',
      RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT: '25',
      RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '120',
      RETAILER_DEBIT_NOTE_MAX_AMOUNT: '300',
    },
    async () => {
      const { app } = await createApp();
      t.after(async () => app.close());

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
      assert.deepEqual(response.body.data.overrides, {
        creditNoteMaxAmount: null,
        creditNoteMaxTaxAmount: null,
        creditNoteMaxTotalAmount: null,
        debitNoteMaxAmount: null,
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

test('HTTP e2e: threshold cache ttl keeps values stable within ttl window', async (t) => {
  await withEnv(
    {
      RETAILER_NOTE_THRESHOLD_CACHE_TTL_MS: '60000',
      RETAILER_CREDIT_NOTE_MAX_AMOUNT: '250',
      RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT: '25',
      RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '120',
      RETAILER_DEBIT_NOTE_MAX_AMOUNT: '300',
    },
    async () => {
      const { app, harness } = await createApp();
      t.after(async () => app.close());

      const first = await request(app.getHttpServer())
        .get('/api/v1/settings/retailer-note-thresholds')
        .expect(200);

      harness.state.systemSettings.push({
        id: '61000000-0000-4000-8000-000000000201',
        organizationId: IDS.org,
        settingGroup: 'retailer_note_limits',
        settingKey: 'credit_note_max_amount',
        valueJson: 500,
        isEncrypted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const second = await request(app.getHttpServer())
        .get('/api/v1/settings/retailer-note-thresholds')
        .expect(200);

      assert.equal(first.body.data.effective.creditNoteMaxAmount, 250);
      assert.equal(second.body.data.effective.creditNoteMaxAmount, 250);
      assert.equal(second.body.data.sources.creditNoteMaxAmount, 'env');
    },
  );
});

test('HTTP e2e: threshold cache ttl zero disables caching and re-reads latest values', async (t) => {
  await withEnv(
    {
      RETAILER_NOTE_THRESHOLD_CACHE_TTL_MS: '0',
      RETAILER_CREDIT_NOTE_MAX_AMOUNT: '250',
      RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT: '25',
      RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '120',
      RETAILER_DEBIT_NOTE_MAX_AMOUNT: '300',
    },
    async () => {
      const { app, harness } = await createApp();
      t.after(async () => app.close());

      const first = await request(app.getHttpServer())
        .get('/api/v1/settings/retailer-note-thresholds')
        .expect(200);

      harness.state.systemSettings.push({
        id: '61000000-0000-4000-8000-000000000202',
        organizationId: IDS.org,
        settingGroup: 'retailer_note_limits',
        settingKey: 'credit_note_max_amount',
        valueJson: 500,
        isEncrypted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const second = await request(app.getHttpServer())
        .get('/api/v1/settings/retailer-note-thresholds')
        .expect(200);

      assert.equal(first.body.data.effective.creditNoteMaxAmount, 250);
      assert.equal(second.body.data.effective.creditNoteMaxAmount, 500);
      assert.equal(second.body.data.sources.creditNoteMaxAmount, 'db');
    },
  );
});

test('HTTP e2e: cache debug counters expose hit and miss totals', async (t) => {
  await withEnv(
    {
      RETAILER_NOTE_THRESHOLD_CACHE_TTL_MS: '60000',
      RETAILER_CREDIT_NOTE_MAX_AMOUNT: '250',
      RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT: '25',
      RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '120',
      RETAILER_DEBIT_NOTE_MAX_AMOUNT: '300',
    },
    async () => {
      const { app } = await createApp();
      t.after(async () => app.close());

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

test('HTTP e2e: cache reset endpoint invalidates org cache and allows fresh threshold read', async (t) => {
  await withEnv(
    {
      RETAILER_NOTE_THRESHOLD_CACHE_TTL_MS: '60000',
      RETAILER_CREDIT_NOTE_MAX_AMOUNT: '250',
      RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT: '25',
      RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '120',
      RETAILER_DEBIT_NOTE_MAX_AMOUNT: '300',
    },
    async () => {
      const { app, harness } = await createApp();
      t.after(async () => app.close());

      const first = await request(app.getHttpServer())
        .get('/api/v1/settings/retailer-note-thresholds')
        .expect(200);
      assert.equal(first.body.data.effective.creditNoteMaxAmount, 250);

      harness.state.systemSettings.push({
        id: '61000000-0000-4000-8000-000000000203',
        organizationId: IDS.org,
        settingGroup: 'retailer_note_limits',
        settingKey: 'credit_note_max_amount',
        valueJson: 500,
        isEncrypted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
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

test('HTTP e2e: patch retailer note thresholds stores org-level overrides for admin UI', async (t) => {
  await withEnv(
    {
      RETAILER_CREDIT_NOTE_MAX_AMOUNT: '1000',
      RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT: '1000',
      RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '1000',
      RETAILER_DEBIT_NOTE_MAX_AMOUNT: '1000',
    },
    async () => {
      const { app, harness } = await createApp();
      t.after(async () => app.close());

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
      assert.equal(harness.state.systemSettings.length, 4);
      assert.deepEqual(response.body.data.effective, {
        creditNoteMaxAmount: 250,
        creditNoteMaxTaxAmount: 25,
        creditNoteMaxTotalAmount: 120,
        debitNoteMaxAmount: 300,
      });
      assert.deepEqual(response.body.data.overrides, {
        creditNoteMaxAmount: 250,
        creditNoteMaxTaxAmount: 25,
        creditNoteMaxTotalAmount: 120,
        debitNoteMaxAmount: 300,
      });
      assert.deepEqual(response.body.data.sources, {
        creditNoteMaxAmount: 'db',
        creditNoteMaxTaxAmount: 'db',
        creditNoteMaxTotalAmount: 'db',
        debitNoteMaxAmount: 'db',
      });
    },
  );
});

test('HTTP e2e: reset retailer note thresholds clears org-level overrides and falls back to env', async (t) => {
  await withEnv(
    {
      RETAILER_CREDIT_NOTE_MAX_AMOUNT: '250',
      RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT: '25',
      RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '120',
      RETAILER_DEBIT_NOTE_MAX_AMOUNT: '300',
    },
    async () => {
      const { app, harness } = await createApp();
      harness.state.systemSettings.push(
        {
          id: '61000000-0000-4000-8000-000000000101',
          organizationId: IDS.org,
          settingGroup: 'retailer_note_limits',
          settingKey: 'credit_note_max_amount',
          valueJson: 500,
          isEncrypted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '61000000-0000-4000-8000-000000000102',
          organizationId: IDS.org,
          settingGroup: 'retailer_note_limits',
          settingKey: 'debit_note_max_amount',
          valueJson: 700,
          isEncrypted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      );
      t.after(async () => app.close());

      const response = await request(app.getHttpServer())
        .delete('/api/v1/settings/retailer-note-thresholds')
        .expect(200);

      assert.equal(response.body.success, true);
      assert.equal(harness.state.systemSettings.length, 0);
      assert.equal(response.body.data.effective.creditNoteMaxAmount, 250);
      assert.equal(response.body.data.effective.debitNoteMaxAmount, 300);
      assert.equal(response.body.data.sources.creditNoteMaxAmount, 'env');
      assert.equal(response.body.data.sources.debitNoteMaxAmount, 'env');
    },
  );
});

test('HTTP e2e: retailer user cannot manage retailer note thresholds', async (t) => {
  const { app } = await createApp(createRetailerActor());
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .get('/api/v1/settings/retailer-note-thresholds')
    .expect(403);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Backoffice access required');
});

test('HTTP e2e: retailer user cannot access threshold cache debug counters', async (t) => {
  const { app } = await createApp(createRetailerActor());
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .get('/api/v1/settings/retailer-note-thresholds/cache-debug')
    .expect(403);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Backoffice access required');
});

test('HTTP e2e: retailer user cannot reset threshold cache', async (t) => {
  const { app } = await createApp(createRetailerActor());
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .post('/api/v1/settings/retailer-note-thresholds/cache-reset')
    .expect(403);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Backoffice access required');
});

test('HTTP e2e: patch retailer note thresholds requires at least one value', async (t) => {
  const { app } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .patch('/api/v1/settings/retailer-note-thresholds')
    .send({})
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'At least one threshold value is required');
});
