# Offline / PWA Enhancements

## What was implemented

### PWA basics
- Web app manifest added
- app icons added
- service worker added
- offline fallback page added
- service worker registration added to root layout
- install prompt UI added

### Network/offline UI
- global network status bar added
- queued offline action count shown
- automatic sync message shown when queued actions are flushed

### Offline queue support
A lightweight offline mutation queue was added using local storage.

#### Supported queued actions
Currently focused on **field staff workflows**:
- staff delivery stop status update
- staff collection entry
- staff crate transaction entry
- staff proof of delivery upload metadata entry

When offline:
- action is queued locally
- UI receives a success-like response
- queue is flushed automatically when connection returns

### Files added
#### Public / PWA assets
- `frontend/public/manifest.webmanifest`
- `frontend/public/icons/icon-192.svg`
- `frontend/public/icons/icon-512.svg`
- `frontend/public/sw.js`

#### App / PWA UI
- `frontend/src/app/offline/page.tsx`
- `frontend/src/components/pwa/pwa-register.tsx`
- `frontend/src/components/pwa/network-status-bar.tsx`
- `frontend/src/components/pwa/install-prompt.tsx`
- `frontend/src/components/pwa/offline-shell.tsx`

#### Offline queue / hooks
- `frontend/src/lib/offline/queue.ts`
- `frontend/src/hooks/use-network-status.ts`

#### Updated files
- `frontend/src/app/layout.tsx`
- `frontend/src/features/staff/api.ts`

## Important limitations
- this is a practical frontend-first offline queue, not a full conflict-resolution engine yet
- queued actions are stored in local storage, not IndexedDB
- service worker caching is shell/runtime oriented and not a deep domain-specific offline database
- report/admin pages are not the primary offline target; staff field actions are the main priority

## Recommended next step
1. searchable selectors across UUID-based forms
2. upgrade offline queue to IndexedDB
3. add conflict handling UI for failed sync items
4. deeper offline support for retailer/staff data views
