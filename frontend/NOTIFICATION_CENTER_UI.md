# Notification Center UI

## What was implemented

### Backend support added
Minimal notification APIs were added so the UI can work with live data:
- `GET /notification-logs`
- `GET /notification-logs/:id`
- `POST /notification-logs/:id/retry`
- `GET /notification-templates`
- `GET /notification-templates/:id`

### Frontend notification center
An admin-facing notification center page was added at:
- `/app/notifications`

### UI sections
1. KPI cards
   - total logs
   - sent
   - queued
   - failed
2. Notification logs table
   - event key
   - channel
   - recipient
   - status
   - sent time
   - retry action for failed logs
3. Notification templates panel
   - event key
   - channel
   - language
   - active/inactive state
   - template text preview

## Important note
The retry action is currently a backend simulation for development/demo purposes.
It updates failed notifications to a sent-like state so the UI flow can be tested.

## Files added/updated

### Backend
- `backend/src/integrations/notifications/dto/query-notification-logs.dto.ts`
- `backend/src/integrations/notifications/dto/query-notification-templates.dto.ts`
- `backend/src/integrations/notifications/dto/index.ts`
- `backend/src/integrations/notifications/notifications.service.ts`
- `backend/src/integrations/notifications/notifications.controller.ts`
- `backend/src/integrations/notifications/notifications.module.ts`

### Frontend
- `frontend/src/types/notifications.ts`
- `frontend/src/features/notifications/api.ts`
- `frontend/src/features/notifications/components/notification-center-view.tsx`
- `frontend/src/app/(admin)/app/notifications/page.tsx`
- `frontend/src/config/navigation.ts` updated

## Recommended next step
1. searchable selectors across UUID-based forms
2. offline/PWA enhancements
3. stronger mobile UX polish
4. real notification send/retry provider integration later
