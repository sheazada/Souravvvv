# Frontend API Wiring — Phase 8 (Staff Portal)

## Implemented staff portal pages

### Staff dashboard
- `GET /dashboard/driver`
- shows:
  - trip count
  - completed trips
  - pending stops
  - delivered stops
  - failed/partial stops
  - collection amount

### Today trips
- `GET /my/trips/today`
- lists staff-assigned trips for the day

### Trip detail
- `GET /my/trips/:id`
- `GET /my/trips/:id/stops`
- shows trip metadata and stop list

### Trip stops page
- `GET /my/trips/:id/stops`
- stop-focused page for faster field operations view

### Staff delivery stop page
- `GET /delivery-stops/:id`
- `POST /my/delivery-stops/:id/status`
- `POST /my/delivery-stops/:id/collections`
- `POST /my/delivery-stops/:id/crates`
- `POST /my/delivery-stops/:id/proof-of-delivery`

### Staff collections page
- `GET /my/collection-summary`
- shows total receipt count, collected amount, and recent payment receipts

## Important business value
This completes the frontline staff experience:
1. staff sees assigned trips
2. staff opens stops
3. staff updates delivery status
4. staff records collections
5. staff records crate movement
6. staff uploads proof of delivery

## Current implementation notes
- staff portal reuses backend staff-specific endpoints where available
- some data-entry fields still use simple text inputs and can later become richer selectors or scan-based workflows
- driver/staff UI is functional-first and can later be optimized further for one-hand mobile usage and offline-first UX

## Recommended next frontend wiring
1. notification center UI
2. searchable selectors for UUID-based fields
3. remaining report/detail pages
4. offline/PWA enhancements
