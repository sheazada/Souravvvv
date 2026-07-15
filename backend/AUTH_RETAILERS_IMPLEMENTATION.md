# Auth + Retailers Implementation Notes

## What was implemented

### Auth
- JWT-based login flow
- refresh token rotation using `user_sessions`
- logout / logout-all by revoking active sessions
- current user endpoint
- permissions endpoint
- OTP flow for development/demo use
- forgot/reset password flow for development/demo use
- JWT strategy and guard wiring

### Retailers
- retailer CRUD base implementation
- retailer list with pagination + filters
- assisted ordering mode update endpoint
- credit settings update
- route assignment update
- retailer documents create/list/delete
- retailer ledger summary
- ledger transactions timeline
- outstanding invoices view
- retailer statements
- retailer orders / invoices / payments / returns / crates
- organization-scoped data access
- retailer self-access restriction

## Important business workflow handled
The implementation preserves your main requirement:
- admin can manage assisted retailers
- retailer ordering mode can be `self_service`, `assisted`, or `hybrid`
- retailer financial and historical data remains tied to the same retailer account

## Current assumptions
- OTP and reset token storage are in-memory for now (good for development, not production)
- refresh token sessions are stored in database
- role enforcement is partly done by service-level checks
- `DEV_SEED_PASSWORD` is used when seeded users still have the placeholder password hash

## Suggested next step
1. install backend dependencies
2. generate Prisma client
3. implement sales-orders real logic
4. implement demand-consolidation engine
