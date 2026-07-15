# Prisma-backed E2E Testing

## Purpose
These tests run real NestJS HTTP endpoints against a real PostgreSQL database via Prisma, instead of mocked Prisma adapters.

## Required environment
Create a dedicated PostgreSQL database and set:

```env
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dairy_erp_test
PAYMENT_GATEWAY_RAZORPAY_WEBHOOK_SECRET=test-razorpay-secret
```

You can use:
- `backend/.env.test` for CI/local disposable runs
- `backend/.env.test.example` as a reference template

## Commands
Prepare the schema in the test database:

```bash
npm run test:e2e:prisma:prepare
```

Run Prisma-backed payment flow HTTP tests:

```bash
npm run test:e2e:prisma:http-payments
```

Run Prisma-backed credit/operations HTTP tests:

```bash
npm run test:e2e:prisma:http-credit-ops
```

Run Prisma-backed sales invoice revision HTTP tests:

```bash
npm run test:e2e:prisma:http-sales-invoice-revision
```

Run Prisma-backed retailer credit/debit note HTTP tests:

```bash
npm run test:e2e:prisma:http-retailer-notes
```

Run all Prisma-backed HTTP e2e tests:

```bash
npm run test:e2e:prisma:http
```

Run the full backend CI-equivalent local sequence:

```bash
npm run lint
npm run build
npm run test:credit-control
npm run test:payments-integration
npm run test:credit-ops-integration
npm run test:e2e:http
npm run test:e2e:prisma:http
```

## Files
- `backend/README.md`
- `backend/.env.test`
- `backend/.env.test.example`
- `backend/tests/helpers/prisma-e2e.ts`
- `backend/tests/prisma-http-payments.e2e-spec.ts`
- `backend/tests/prisma-http-credit-ops.e2e-spec.ts`
- `backend/tests/prisma-http-sales-invoice-revision.e2e-spec.ts`
- `backend/tests/prisma-http-retailer-notes.e2e-spec.ts`
- `backend/tests/helpers/prisma-e2e.ts`
- `backend/scripts/prepare-prisma-test-db.js`
- `.github/workflows/backend-prisma-e2e.yml`

## Notes
- The prepare step uses `prisma db push --force-reset` against `TEST_DATABASE_URL`.
- Use a dedicated disposable database only.
- Accounting is still stubbed in these tests so ERP finance/payment/credit flows can be tested without full chart-of-accounts setup.
- GitHub Actions workflow uses an ephemeral PostgreSQL service container and loads values from `backend/.env.test`.
