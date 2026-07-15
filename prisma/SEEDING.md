# Prisma Seed Structure

This folder now contains:

- `schema.prisma` — Prisma data model for the Dairy Distributor ERP
- `seed-data.ts` — fixed IDs, permission map, and shared seed constants
- `seed.ts` — executable seed runner that inserts demo master data and sample transactional flow

## What the seed covers

### Master data
- organization
- roles and permissions
- users
- accounts, bank, cash register, expense category
- areas and routes
- employees and vehicle
- supplier
- retailers
- product catalog
- variants, tax, crates, pricing, promotion
- warehouses
- notification templates

### Demo business flow
- delivery cycle
- retailer orders
  - self-service retailer order
  - admin-assisted retailer order
  - salesperson-assisted retailer order
- demand consolidation
- purchase order
- GRN
- purchase invoice
- inventory batches and stock movements
- dispatch trip and challan
- delivery stops and delivery items
- assisted invoice generation for retailer
- payment receipt and allocation
- crate transactions
- journal entries
- day closing
- notification log
- sync event
- AI forecast demo rows

## Important note about password hashes
The seed uses:

- `SEED_PASSWORD_HASH` environment variable, or
- fallback placeholder string: `replace-with-real-password-hash`

Before using this in a real app, replace it with a valid hash created by your authentication system.

## Typical Prisma setup later
When your backend project is created, add something like this to `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

Or with tsx:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

## Typical run commands later

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

## Customization suggestions
Adjust these first:
- organization legal details
- GST and PAN values
- product list and pricing
- route names
- retailer list
- cutoff times
- invoice series
- seed password hash

## Suggested next step
After this, the best next step is to generate:
- NestJS modules and Prisma services, or
- API endpoint blueprint, or
- actual backend project scaffold
