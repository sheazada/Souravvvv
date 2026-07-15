# Sales Invoice Credit / Debit Note Workflow Contract

## Purpose
This contract defines the **note-based correction workflow** for invoices that already have payment activity.

Use this flow when a sales invoice is:
- `partial_paid`
- `paid`
- or otherwise not eligible for direct revise / cancel-and-regenerate

This keeps the ERP ledger-first and audit-safe.

---

## Business rule
For invoices with payment activity:
- direct edit ❌
- direct delete ❌
- direct revise ❌
- cancel-and-regenerate ❌

Use:
- **Credit Note** when invoice amount must reduce
- **Debit Note** when invoice amount must increase

Examples:
- retailer refused some delivered qty after partial payment → **credit note**
- extra qty was accepted after billing and should increase receivable → **debit note**

---

## Workflow summary

### Credit Note
Use when invoice amount should go **down**.

Examples:
- short delivery discovered later
- retailer refusal confirmed after billing
- price/discount correction in retailer’s favor
- damaged/leakage allowance to retailer

Financial effect:
- retailer outstanding decreases
- retailer ledger gets credit effect
- accounting gets reversal/reduction effect

### Debit Note
Use when invoice amount should go **up**.

Examples:
- retailer accepted extra qty beyond original billed amount
- shortage in original billing discovered later
- additional recovery / charge to retailer

Financial effect:
- retailer outstanding increases
- retailer ledger gets debit effect
- accounting gets increase effect

---

## API endpoints

## Credit note endpoints

### `GET /api/v1/credit-notes`
List credit notes.

### `POST /api/v1/credit-notes`
Create draft or directly posted retailer credit note.

**Body**
```json
{
  "partyType": "retailer",
  "partyId": "retailer-uuid",
  "retailerId": "retailer-uuid",
  "relatedInvoiceId": "sales-invoice-uuid",
  "noteDate": "2026-07-10",
  "amount": 300,
  "taxAmount": 0,
  "status": "draft",
  "affectsLedger": true,
  "affectsInvoiceBalance": true,
  "remarks": "Retailer refused 3 packets after billing"
}
```

### `GET /api/v1/credit-notes/:id`
Fetch credit note detail.

### `POST /api/v1/credit-notes/:id/post`
Post credit note and apply finance impact.

### `POST /api/v1/credit-notes/:id/cancel`
Cancel un-applied / reversible credit note.

### `GET /api/v1/retailers/:id/credit-notes`
Retailer-specific credit note list.

### `GET /api/v1/my/credit-notes`
Retailer self portal history.

---

## Debit note endpoints

### `GET /api/v1/retailer-debit-notes`
Already scaffolded in current codebase.

### `POST /api/v1/retailer-debit-notes`
Already scaffolded in current codebase.

**Body**
```json
{
  "retailerId": "retailer-uuid",
  "relatedInvoiceId": "sales-invoice-uuid",
  "noteDate": "2026-07-10",
  "amount": 160,
  "affectsLedger": true,
  "affectsInvoiceBalance": true,
  "remarks": "Retailer accepted 2 extra packets after initial billing"
}
```

### `GET /api/v1/retailer-debit-notes/:id`
Already scaffolded.

### `POST /api/v1/retailer-debit-notes/:id/post`
Already scaffolded.

### `POST /api/v1/retailer-debit-notes/:id/cancel`
Already scaffolded.

### `GET /api/v1/my/debit-notes`
Recommended later for retailer portal if needed.

---

## Optional helper endpoint for invoice correction decision

### `POST /api/v1/sales-invoices/:id/correction-decision`
Returns what correction path must be used.

**Response example**
```json
{
  "success": true,
  "message": "Invoice correction path resolved successfully",
  "data": {
    "invoiceId": "uuid",
    "invoiceStatus": "partial_paid",
    "paymentStatus": "partial_paid",
    "allowedAction": "credit_note_required",
    "recommendedEndpoints": [
      "/credit-notes",
      "/credit-notes/:id/post"
    ]
  }
}
```

This is optional but very useful for frontend UX.

---

## DTO contracts

## Credit note DTOs
Suggested location:
- `backend/src/operations/payments/dto/` or a dedicated `credit-notes` module dto folder

### `create-retailer-credit-note.dto.ts`
```ts
{
  partyType: 'retailer';
  partyId: string;
  retailerId: string;
  relatedInvoiceId?: string;
  noteDate: string;
  amount: number;
  taxAmount?: number;
  status?: 'draft' | 'posted';
  affectsLedger?: boolean;
  affectsInvoiceBalance?: boolean;
  remarks?: string;
}
```

### `query-credit-notes.dto.ts`
```ts
{
  partyType?: string;
  retailerId?: string;
  relatedInvoiceId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  search?: string;
}
```

### `cancel-credit-note.dto.ts`
```ts
{
  reason: string;
}
```

---

## Debit note DTOs
Already partly scaffolded:
- `create-retailer-debit-note.dto.ts`
- `query-retailer-debit-notes.dto.ts`
- `cancel-retailer-debit-note.dto.ts`

Recommended to keep and extend if needed.

---

## Service contract

## Credit Note service methods
Suggested service name:
- `RetailerCreditNotesService`

### Public methods
- `findAll(actor, query)`
- `create(actor, dto)`
- `findOne(actor, id)`
- `post(actor, id)`
- `cancel(actor, id, dto)`
- `getRetailerNotes(actor, retailerId, query)`
- `getMyNotes(actor, query)`

### Internal methods
- `assertInvoiceEligibleForCreditNote(invoice)`
- `applyCreditNoteToInvoice(tx, creditNote, invoice)`
- `postCreditNoteFinancialImpact(actor, creditNote)`
- `reverseCreditNoteFinancialImpact(actor, creditNote)`

---

## Debit Note service methods
Current scaffold exists:
- `RetailerDebitNotesService`

Recommended real methods:
- `findAll(actor, query)`
- `create(actor, dto)`
- `findOne(actor, id)`
- `post(actor, id)`
- `cancel(actor, id, dto)`

Internal methods:
- `assertInvoiceEligibleForDebitNote(invoice)`
- `applyDebitNoteToInvoice(tx, debitNote, invoice)`
- `postDebitNoteFinancialImpact(actor, debitNote)`
- `reverseDebitNoteFinancialImpact(actor, debitNote)`

---

## Posting rules

## Credit note posting
When `POST /credit-notes/:id/post` runs:

### Validate
- retailer exists
- related invoice belongs to same retailer if provided
- invoice status is not `cancelled`
- amount > 0
- note not already posted

### Transaction steps
1. update credit note status to `posted`
2. if `affectsInvoiceBalance=true` and linked invoice exists:
   - reduce invoice outstanding
   - if outstanding <= 0, set invoice payment status accordingly
3. if `affectsLedger=true`:
   - create ledger entry of type `credit_note`
4. post accounting reversal/reduction entry
5. refresh retailer metrics / credit profile cache

### Invoice impact example
- invoice outstanding = ₹1,200
- credit note = ₹300
- new outstanding = ₹900

---

## Debit note posting
When `POST /retailer-debit-notes/:id/post` runs:

### Validate
- retailer exists
- related invoice belongs to same retailer if provided
- amount > 0
- note not already posted

### Transaction steps
1. update debit note status to `posted`
2. if `affectsInvoiceBalance=true` and linked invoice exists:
   - increase invoice outstanding
3. if `affectsLedger=true`:
   - create ledger entry of type `debit_note`
4. post accounting increase entry
5. refresh retailer metrics / credit profile cache

### Invoice impact example
- invoice outstanding = ₹0
- debit note = ₹160
- new outstanding = ₹160
- invoice payment status may move from `paid` to `partial_paid` or remain `paid` with separate due, depending on implementation policy

### Recommended policy
For simplicity and clarity:
- if debit note affects invoice balance on a fully paid invoice,
  set invoice `paymentStatus = partial_paid`
  and increase `outstandingAmount`

---

## Cancellation rules

## Credit note cancel
Allowed when:
- note is reversible under policy
- no incompatible later adjustments exist
- actor has permission

On cancel:
- reverse invoice outstanding effect if applied
- reverse ledger entry if posted
- reverse accounting impact
- refresh metrics

## Debit note cancel
Same pattern:
- reverse outstanding increase
- reverse ledger debit entry
- reverse accounting impact
- refresh metrics

---

## Invoice state behavior

### Partial-paid invoice
Allowed correction path:
- credit note ✅
- debit note ✅
- direct revise ❌
- cancel-and-regenerate ❌

### Paid invoice
Allowed correction path:
- credit note ✅
- debit note ✅
- direct revise ❌
- cancel-and-regenerate ❌

This matches the protection you already added for revise/recompute flows.

---

## Portal + finance sync expectations
After posting credit/debit note, update all of these views automatically:
- retailer invoice detail
- retailer invoice list
- retailer dues page
- retailer financial dashboard
- retailer ledger/passbook
- admin outstanding report
- retailer credit usage / available credit

### Shared financial truth rule
Retailer should see the result of the correction under the same account history.

---

## Recommended controller additions

### Credit notes controller
Suggested file:
- `backend/src/operations/payments/retailer-credit-notes.controller.ts`

Routes:
- `GET /credit-notes`
- `POST /credit-notes`
- `GET /credit-notes/:id`
- `POST /credit-notes/:id/post`
- `POST /credit-notes/:id/cancel`
- `GET /retailers/:id/credit-notes`
- `GET /my/credit-notes`

### Debit notes controller
Current file exists:
- `retailer-debit-notes.controller.ts`

Recommended future addition:
- `GET /my/debit-notes`

---

## Module recommendation
You can keep both in the current payments domain for now:
- `backend/src/operations/payments/`

Recommended providers:
- `RetailerCreditNotesService`
- `RetailerDebitNotesService`
- `RetailerLedgerService`
- `PaymentMetricsService`
- `AccountingService`

---

## Implementation order

### Phase 1
- implement real `RetailerDebitNotesService`
- add `RetailerCreditNotesService`
- basic post/cancel behavior

### Phase 2
- link note posting to invoice outstanding
- link to ledger posting
- refresh metrics/credit cache

### Phase 3
- portal list/detail endpoints for notes
- invoice correction-decision helper endpoint

---

## Final recommendation
For paid/partial-paid invoice corrections in your ERP:
- **Credit Note** = reduce dues / refund-like adjustment
- **Debit Note** = increase dues / additional accepted qty / recovery
- direct invoice revise/delete should remain blocked once money activity exists

This keeps:
- retailer portal consistent
- dues accurate
- ledger audit-safe
- credit exposure trustworthy
