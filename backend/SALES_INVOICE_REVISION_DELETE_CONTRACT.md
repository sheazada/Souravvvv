# Sales Invoice Revision + Delete — NestJS DTO / Controller / Service Contract

## Purpose
This document defines the **actual NestJS contract layer** for invoice revision and delete rules in the Dairy Distributor ERP.

It is designed to preserve these business rules:
- draft invoice can be edited/deleted
- posted unpaid invoice can be revised through controlled replacement flow
- partial/paid invoices should move to note-based adjustment later
- retailer portal and retailer finance must remain synchronized
- retailer financial truth must stay ledger-first

---

## DTO files added
Location:
- `backend/src/operations/sales-invoices/dto/`

### Files
- `sales-invoice-revision-item.dto.ts`
- `update-draft-sales-invoice.dto.ts`
- `delete-draft-sales-invoice.dto.ts`
- `preview-sales-invoice-revision.dto.ts`
- `revise-sales-invoice.dto.ts`
- `cancel-and-regenerate-sales-invoice.dto.ts`
- `recompute-sales-invoice-from-delivery.dto.ts`

These are exported from:
- `backend/src/operations/sales-invoices/dto/index.ts`

---

## DTO contract summary

### `SalesInvoiceRevisionItemDto`
Use for manual invoice line correction.

```ts
{
  deliveryStopItemId?: string;
  variantId: string;
  billedQty: number;
  unitPrice: number;
  discountAmount?: number;
  taxRate?: number;
  remarks?: string;
}
```

### `UpdateDraftSalesInvoiceDto`
Use for editing a draft invoice.

```ts
{
  invoiceDate?: string;
  dueDate?: string;
  remarks?: string;
  items: SalesInvoiceRevisionItemDto[];
}
```

### `DeleteDraftSalesInvoiceDto`
```ts
{
  reason: string;
}
```

### `PreviewSalesInvoiceRevisionDto`
```ts
{
  revisionMode: 'manual' | 'from_delivery_actuals';
  reason: string;
  newInvoiceDate?: string;
  newDueDate?: string;
  items?: SalesInvoiceRevisionItemDto[];
}
```

### `ReviseSalesInvoiceDto`
Same contract as preview, but for actual execution.

### `CancelAndRegenerateSalesInvoiceDto`
```ts
{
  reason: string;
  source: 'manual' | 'delivery_actuals';
  items?: SalesInvoiceRevisionItemDto[];
}
```

### `RecomputeSalesInvoiceFromDeliveryDto`
```ts
{
  reason: string;
  applyImmediately?: boolean;
}
```

---

## Controller contract
File to extend:
- `backend/src/operations/sales-invoices/sales-invoices.controller.ts`

### Add imports
```ts
import {
  CancelAndRegenerateSalesInvoiceDto,
  DeleteDraftSalesInvoiceDto,
  PreviewSalesInvoiceRevisionDto,
  RecomputeSalesInvoiceFromDeliveryDto,
  ReviseSalesInvoiceDto,
  UpdateDraftSalesInvoiceDto,
} from './dto';
```

### Add endpoints

#### Update draft invoice
```ts
@Patch('sales-invoices/:id')
updateDraft(
  @CurrentUser() currentUser: AuthenticatedUser,
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: UpdateDraftSalesInvoiceDto,
) {
  return this.salesInvoicesService.updateDraft(currentUser, id, dto);
}
```

#### Delete draft invoice
```ts
@Post('sales-invoices/:id/delete-draft')
deleteDraft(
  @CurrentUser() currentUser: AuthenticatedUser,
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: DeleteDraftSalesInvoiceDto,
) {
  return this.salesInvoicesService.deleteDraft(currentUser, id, dto);
}
```

#### Revision preview
```ts
@Post('sales-invoices/:id/revision-preview')
previewRevision(
  @CurrentUser() currentUser: AuthenticatedUser,
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: PreviewSalesInvoiceRevisionDto,
) {
  return this.salesInvoicesService.previewRevision(currentUser, id, dto);
}
```

#### Revise posted unpaid invoice
```ts
@Post('sales-invoices/:id/revise')
revise(
  @CurrentUser() currentUser: AuthenticatedUser,
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: ReviseSalesInvoiceDto,
) {
  return this.salesInvoicesService.revisePostedUnpaid(currentUser, id, dto);
}
```

#### Cancel + regenerate invoice
```ts
@Post('sales-invoices/:id/cancel-and-regenerate')
cancelAndRegenerate(
  @CurrentUser() currentUser: AuthenticatedUser,
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: CancelAndRegenerateSalesInvoiceDto,
) {
  return this.salesInvoicesService.cancelAndRegenerate(currentUser, id, dto);
}
```

#### Recompute from delivery actuals
```ts
@Post('sales-invoices/:id/recompute-from-delivery')
recomputeFromDelivery(
  @CurrentUser() currentUser: AuthenticatedUser,
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: RecomputeSalesInvoiceFromDeliveryDto,
) {
  return this.salesInvoicesService.recomputeFromDelivery(currentUser, id, dto);
}
```

#### Revision history
```ts
@Get('sales-invoices/:id/revision-history')
getRevisionHistory(
  @CurrentUser() currentUser: AuthenticatedUser,
  @Param('id', ParseUUIDPipe) id: string,
) {
  return this.salesInvoicesService.getRevisionHistory(currentUser, id);
}
```

---

## Service contract
File to extend:
- `backend/src/operations/sales-invoices/sales-invoices.service.ts`

### Public methods to add

```ts
async updateDraft(
  actor: AuthenticatedUser,
  id: string,
  dto: UpdateDraftSalesInvoiceDto,
)
```

```ts
async deleteDraft(
  actor: AuthenticatedUser,
  id: string,
  dto: DeleteDraftSalesInvoiceDto,
)
```

```ts
async previewRevision(
  actor: AuthenticatedUser,
  id: string,
  dto: PreviewSalesInvoiceRevisionDto,
)
```

```ts
async revisePostedUnpaid(
  actor: AuthenticatedUser,
  id: string,
  dto: ReviseSalesInvoiceDto,
)
```

```ts
async cancelAndRegenerate(
  actor: AuthenticatedUser,
  id: string,
  dto: CancelAndRegenerateSalesInvoiceDto,
)
```

```ts
async recomputeFromDelivery(
  actor: AuthenticatedUser,
  id: string,
  dto: RecomputeSalesInvoiceFromDeliveryDto,
)
```

```ts
async getRevisionHistory(
  actor: AuthenticatedUser,
  id: string,
)
```

---

## Internal service helpers recommended

```ts
private assertDraftEditable(invoice: SalesInvoice)
```

```ts
private async assertPostedUnpaidRevisable(
  organizationId: string,
  invoice: SalesInvoice,
)
```

```ts
private async buildRevisionLinesFromManualInput(
  organizationId: string,
  retailerId: string,
  items: SalesInvoiceRevisionItemDto[],
)
```

```ts
private async buildRevisionLinesFromDeliveryActuals(
  organizationId: string,
  retailerId: string,
  salesOrderId?: string | null,
  dispatchTripId?: string | null,
)
```

```ts
private recalculateRevisionTotals(lines: InvoiceLine[])
```

```ts
private async cancelInvoiceFinancially(
  actor: AuthenticatedUser,
  invoice: SalesInvoice,
)
```

```ts
private async postReplacementInvoiceFinancially(
  actor: AuthenticatedUser,
  invoice: SalesInvoice,
)
```

```ts
private async generateReplacementInvoiceNo(
  organizationId: string,
  originalInvoiceNo: string,
)
```

---

## Recommended service behavior by method

### `updateDraft(...)`
Use when:
- invoice status is `draft`

Must:
- validate invoice is editable
- replace invoice items
- recalculate totals
- set outstanding equal to grand total
- not post ledger/accounting

### `deleteDraft(...)`
Use when:
- invoice status is `draft`
- no allocations
- no journal/ledger posting

Must:
- remove items
- delete invoice row
- create audit log later if/when audit service is wired

### `previewRevision(...)`
Must:
- inspect current invoice state
- determine whether action is:
  - draft update
  - cancel + replacement
  - note-based adjustment required
- compute revised totals and delta
- return preview-only response

### `revisePostedUnpaid(...)`
Use when:
- invoice is `posted`
- invoice is unpaid
- allocation sum is zero

Recommended implementation:
- cancel old invoice
- create replacement posted invoice
- reverse old ledger/accounting
- post new ledger/accounting
- refresh retailer metrics/credit cache

### `cancelAndRegenerate(...)`
Same finance result as revise, but explicit for major rebuilds.

### `recomputeFromDelivery(...)`
Use actual delivered stop quantities.

Behavior:
- draft invoice → update in place
- posted unpaid → preview or revise depending on `applyImmediately`
- partial/paid → reject and instruct note-based adjustment path

### `getRevisionHistory(...)`
Initial implementation can return:
- current invoice
- invoices with same retailer + salesOrderId + dispatchTripId + related remarks pattern

Later improvement can add explicit schema fields like:
- `revisedFromInvoiceId`
- `revisionNo`

---

## Validation rules

### Draft update/delete
- `status === 'draft'`
- no allocations
- no journal posting
- no ledger posting

### Posted unpaid revise/cancel-regenerate
- `status === 'posted'`
- `paymentStatus === 'unpaid'`
- allocation sum = 0
- actor is backoffice finance/ops role
- reason required

### Partial/paid protection
If invoice is:
- `partial_paid`
- `paid`

then these methods should reject and return a conflict telling caller to use:
- credit note
- debit note

---

## Portal + finance sync requirements
Whenever revision succeeds, system must update:
- retailer portal invoice list
- retailer portal invoice detail
- retailer dues
- retailer financial dashboard
- retailer ledger/passbook
- retailer payment metrics
- retailer credit usage/cache

### Finance posting expectation
For posted unpaid revision:
- original invoice financial effect reversed
- replacement invoice financial effect posted

This preserves:
- one retailer account
- correct dues
- correct passbook
- correct credit exposure

---

## Recommended implementation order

### Phase 1
- `updateDraft(...)`
- `deleteDraft(...)`

### Phase 2
- `previewRevision(...)`
- `revisePostedUnpaid(...)`
- `cancelAndRegenerate(...)`

### Phase 3
- `recomputeFromDelivery(...)`
- `getRevisionHistory(...)`

---

## Deliverables already prepared
### DTOs now created
- actual DTO files under `backend/src/operations/sales-invoices/dto/`
- exported via `dto/index.ts`

### Next coding step
Implement controller + service methods in:
- `backend/src/operations/sales-invoices/sales-invoices.controller.ts`
- `backend/src/operations/sales-invoices/sales-invoices.service.ts`
