# Retailer Payment & Credit — NestJS DTOs / Controllers / Services Contract List

## 1. Purpose
This document converts the **Retailer Payment & Credit API Blueprint** into a concrete **NestJS contract plan** for the current codebase.

It is designed to fit the existing project structure and preserve the already-built modules.

Key goals:
- keep the system **ledger-first**
- preserve **admin-assisted retailer workflows**
- avoid breaking current `/payment-receipts`, `/my/dues`, and staff collection routes
- make the next implementation step predictable for backend coding

---

## 2. Architecture Decision for This Codebase

### Keep existing modules and extend them
Do **not** move the whole finance flow into a brand-new module tree.

Use the current structure:
- `backend/src/operations/payments/*`
- `backend/src/operations/delivery/*`
- `backend/src/operations/sales-invoices/*`
- `backend/src/masters/retailers/*`

### Compatibility rule
Existing endpoints should remain available, but the richer finance logic should be delegated into the new payments-domain services.

That means:
- `SalesInvoicesController.getMyDues()` stays, but can delegate to `RetailerFinanceService.getMyDues()`
- `DeliveryController.addCollection()` and `addMyCollection()` stay, but can delegate to `PaymentsService.recordDeliveryStopCollection()`
- `RetailersController.getLedgerSummary()/getOutstanding()/getStatements()` stay, but can delegate to `RetailerFinanceService`

---

## 3. Recommended File Ownership

## 3.1 Existing files to extend
- `backend/src/operations/payments/payments.controller.ts`
- `backend/src/operations/payments/payments.service.ts`
- `backend/src/operations/payments/payments.module.ts`
- `backend/src/operations/payments/dto/create-payment-receipt.dto.ts`
- `backend/src/operations/payments/dto/create-payment-allocation.dto.ts`
- `backend/src/operations/payments/dto/query-payment-receipts.dto.ts`
- `backend/src/operations/delivery/dto/create-collection-entry.dto.ts`
- `backend/src/operations/delivery/delivery.service.ts`
- `backend/src/operations/sales-invoices/sales-invoices.service.ts`
- `backend/src/masters/retailers/retailers.service.ts`

## 3.2 New controller files
Create under `backend/src/operations/payments/`:
- `payment-intents.controller.ts`
- `retailer-finance.controller.ts`
- `credit-control.controller.ts`
- `advance-wallet.controller.ts`
- `payment-reminders.controller.ts`
- `payment-analytics.controller.ts`
- `payment-gateways.controller.ts`
- `retailer-debit-notes.controller.ts`

## 3.3 New service files
Create under `backend/src/operations/payments/`:
- `payment-intents.service.ts`
- `retailer-finance.service.ts`
- `credit-control.service.ts`
- `payment-allocation.service.ts`
- `retailer-ledger.service.ts`
- `advance-wallet.service.ts`
- `payment-reminders.service.ts`
- `payment-analytics.service.ts`
- `payment-webhooks.service.ts`
- `payment-metrics.service.ts`
- `retailer-debit-notes.service.ts`

---

## 4. Recommended DTO File List

All DTOs below should live in:
`backend/src/operations/payments/dto/`

## 4.1 Existing DTOs to extend

### `create-payment-receipt.dto.ts`
**Class:** `CreatePaymentReceiptDto`

Add/expand fields for retailer finance:
- `paymentSource?: 'retailer_portal' | 'delivery_staff' | 'admin_entry' | 'gateway_webhook' | 'system_adjustment'`
- `paymentIntentId?: string`
- `gatewayName?: string`
- `gatewayPaymentId?: string`
- `gatewayOrderId?: string`
- `isAdvancePayment?: boolean`
- `receiptFileUrl?: string`
- `signatureFileUrl?: string`
- `autoConfirm?: boolean`
- `allocationMode?: 'fifo' | 'manual' | 'advance'`
- `salesInvoiceAllocations?: ManualReceiptAllocationItemDto[]`

### `create-payment-allocation.dto.ts`
**Class:** `CreatePaymentAllocationDto`

Add:
- `allocationMode?: 'fifo' | 'manual' | 'advance'`
- `remarks?: string`

### `query-payment-receipts.dto.ts`
**Class:** `QueryPaymentReceiptsDto`

Add filters:
- `retailerId?: string`
- `status?: string`
- `paymentSource?: string`
- `gatewayName?: string`
- `isAdvancePayment?: boolean`
- `dispatchTripId?: string`
- `search?: string`

---

## 4.2 New nested DTOs

### `payment-intent-invoice-item.dto.ts`
**Class:** `PaymentIntentInvoiceItemDto`
- `invoiceId: string`
- `targetAmount: number`

### `manual-receipt-allocation-item.dto.ts`
**Class:** `ManualReceiptAllocationItemDto`
- `salesInvoiceId: string`
- `allocatedAmount: number`
- `allocationDate?: string`
- `remarks?: string`

### `collection-allocation-item.dto.ts`
**Class:** `CollectionAllocationItemDto`
- `invoiceId: string`
- `allocatedAmount: number`

---

## 4.3 Payment intent DTOs

### `create-payment-intent.dto.ts`
**Class:** `CreatePaymentIntentDto`
- `retailerId: string`
- `paymentContext: 'single_invoice' | 'multi_invoice' | 'full_outstanding' | 'custom_amount' | 'advance_payment'`
- `amount: number`
- `gatewayName?: string`
- `allocationMode?: 'fifo' | 'manual' | 'advance'`
- `selectedInvoices?: PaymentIntentInvoiceItemDto[]`
- `returnUrl?: string`
- `remarks?: string`

### `query-payment-intents.dto.ts`
**Class:** `QueryPaymentIntentsDto`
- extends pagination dto
- `retailerId?: string`
- `status?: string`
- `gatewayName?: string`
- `paymentContext?: string`
- `fromDate?: string`
- `toDate?: string`

### `cancel-payment-intent.dto.ts`
**Class:** `CancelPaymentIntentDto`
- `reason?: string`

---

## 4.4 Allocation workflow DTOs

### `preview-payment-allocation.dto.ts`
**Class:** `PreviewPaymentAllocationDto`
- `retailerId: string`
- `amount: number`
- `paymentContext?: string`
- `allocationMode: 'fifo' | 'manual' | 'advance'`
- `selectedInvoiceIds?: string[]`

### `auto-allocate-payment-receipt.dto.ts`
**Class:** `AutoAllocatePaymentReceiptDto`
- `allocationDate: string`
- `allocationMode?: 'fifo' | 'advance'`
- `selectedInvoiceIds?: string[]`
- `treatRemainingAsAdvance?: boolean`

### `reallocate-payment-receipt.dto.ts`
**Class:** `ReallocatePaymentReceiptDto`
- `allocationDate: string`
- `clearExistingAllocations: boolean`
- `allocations: ManualReceiptAllocationItemDto[]`
- `treatRemainingAsAdvance?: boolean`
- `remarks?: string`

### `cancel-payment-receipt.dto.ts`
**Class:** `CancelPaymentReceiptDto`
- `reason: string`

---

## 4.5 Retailer finance read DTOs

### `query-retailer-ledger.dto.ts`
**Class:** `QueryRetailerLedgerDto`
- extends pagination dto
- `fromDate?: string`
- `toDate?: string`
- `transactionType?: string`
- `referenceType?: string`
- `search?: string`

### `query-retailer-outstanding-invoices.dto.ts`
**Class:** `QueryRetailerOutstandingInvoicesDto`
- extends pagination dto
- `includeOverdueOnly?: boolean`
- `includeCurrentOnly?: boolean`
- `search?: string`
- `sort?: string`

### `query-retailer-statements.dto.ts`
**Class:** `QueryRetailerStatementsDto`
- `fromDate?: string`
- `toDate?: string`
- `format?: 'json' | 'pdf' | 'xlsx' | 'print'`
- `includeZeroBalance?: boolean`
- `includeCancelled?: boolean`

---

## 4.6 Credit control DTOs

### `upsert-retailer-credit-profile.dto.ts`
**Class:** `UpsertRetailerCreditProfileDto`
- `creditLimit: number`
- `creditDays: number`
- `warningThresholdPercent: number`
- `blockOrdersOnLimitExceed: boolean`
- `managerApprovalRequired: boolean`
- `allowDispatchWithOverdue: boolean`
- `isCreditActive: boolean`
- `notes?: string`

### `check-retailer-credit.dto.ts`
**Class:** `CheckRetailerCreditDto`
- `context: 'order_approval' | 'invoice_posting' | 'dispatch_release' | 'manual_credit_review'`
- `transactionAmount?: number`
- `salesOrderId?: string`
- `salesInvoiceId?: string`
- `dispatchTripId?: string`

### `create-retailer-credit-override.dto.ts`
**Class:** `CreateRetailerCreditOverrideDto`
- `salesOrderId?: string`
- `overrideType: 'credit_limit_exceed' | 'overdue_dispatch' | 'temporary_credit_extension'`
- `requestedAmount?: number`
- `approvedAmount?: number`
- `reason: string`
- `expiresAt?: string`
- `remarks?: string`

### `query-retailer-credit-overrides.dto.ts`
**Class:** `QueryRetailerCreditOverridesDto`
- extends pagination dto
- `status?: string`
- `overrideType?: string`
- `fromDate?: string`
- `toDate?: string`

### `query-retailer-credit-history.dto.ts`
**Class:** `QueryRetailerCreditHistoryDto`
- `fromDate?: string`
- `toDate?: string`
- `includeOverrides?: boolean`
- `includeThresholdAlerts?: boolean`

---

## 4.7 Advance wallet DTOs

### `adjust-advance-wallet.dto.ts`
**Class:** `AdjustAdvanceWalletDto`
- `transactionType: 'advance_credit' | 'advance_use' | 'refund' | 'adjustment'`
- `debitAmount?: number`
- `creditAmount?: number`
- `referenceType?: string`
- `referenceId?: string`
- `remarks?: string`

### `apply-wallet-balance.dto.ts`
**Class:** `ApplyWalletBalanceDto`
- `amount: number`
- `allocationMode: 'fifo' | 'manual' | 'advance'`
- `selectedInvoiceIds?: string[]`

### `query-wallet-transactions.dto.ts`
**Class:** `QueryWalletTransactionsDto`
- extends pagination dto
- `transactionType?: string`
- `fromDate?: string`
- `toDate?: string`

---

## 4.8 Reminder DTOs

### `query-payment-reminders.dto.ts`
**Class:** `QueryPaymentRemindersDto`
- extends pagination dto
- `retailerId?: string`
- `status?: string`
- `channel?: string`
- `reminderStage?: string`
- `fromDate?: string`
- `toDate?: string`

### `generate-payment-reminders.dto.ts`
**Class:** `GeneratePaymentRemindersDto`
- `asOfDate: string`
- `retailerId?: string`
- `channels?: string[]`
- `stages?: string[]`

### `run-payment-reminders.dto.ts`
**Class:** `RunPaymentRemindersDto`
- `runAt?: string`
- `retailerId?: string`
- `channel?: string`
- `limit?: number`

### `send-payment-reminder.dto.ts`
**Class:** `SendPaymentReminderDto`
- `channel?: string`
- `templateId?: string`
- `customMessage?: string`
- `scheduledAt?: string`

### `cancel-payment-reminder.dto.ts`
**Class:** `CancelPaymentReminderDto`
- `reason: string`

---

## 4.9 Analytics DTOs

### `query-payment-analytics.dto.ts`
**Class:** `QueryPaymentAnalyticsDto`
- `fromDate?: string`
- `toDate?: string`
- `routeId?: string`
- `salespersonId?: string`
- `retailerId?: string`

### `query-collections-trend.dto.ts`
**Class:** `QueryCollectionsTrendDto`
- `fromDate?: string`
- `toDate?: string`
- `groupBy: 'day' | 'week' | 'month'`

---

## 4.10 Retailer debit note DTOs

### `create-retailer-debit-note.dto.ts`
**Class:** `CreateRetailerDebitNoteDto`
- `retailerId: string`
- `relatedInvoiceId?: string`
- `noteDate: string`
- `amount: number`
- `affectsLedger?: boolean`
- `affectsInvoiceBalance?: boolean`
- `remarks?: string`

### `query-retailer-debit-notes.dto.ts`
**Class:** `QueryRetailerDebitNotesDto`
- extends pagination dto
- `retailerId?: string`
- `relatedInvoiceId?: string`
- `status?: string`
- `fromDate?: string`
- `toDate?: string`

### `cancel-retailer-debit-note.dto.ts`
**Class:** `CancelRetailerDebitNoteDto`
- `reason: string`

---

## 4.11 Webhook DTOs

### `query-payment-gateway-webhooks.dto.ts`
**Class:** `QueryPaymentGatewayWebhooksDto`
- extends pagination dto
- `gatewayName?: string`
- `processedStatus?: string`
- `verificationStatus?: string`
- `externalReference?: string`
- `fromDate?: string`
- `toDate?: string`

### `reprocess-payment-gateway-webhook.dto.ts`
**Class:** `ReprocessPaymentGatewayWebhookDto`
- `remarks?: string`
- `force?: boolean`

> For actual incoming webhook body, keep the controller method flexible and accept provider payload as raw body object.

---

## 4.12 DTO index export
Update:
`backend/src/operations/payments/dto/index.ts`

to export all the above classes.

---

## 5. Controller Contract List

## 5.1 `payments.controller.ts` — extend existing file

### Keep existing methods
- `findAll()` → `GET /payment-receipts`
- `create()` → `POST /payment-receipts`
- `findOne()` → `GET /payment-receipts/:id`
- `confirm()` → `POST /payment-receipts/:id/confirm`
- `cancel()` → `POST /payment-receipts/:id/cancel`
- `getAllocations()` → `GET /payment-receipts/:id/allocations`
- `createAllocation()` → `POST /payment-receipts/:id/allocations`
- `getRetailerOutstanding()` → `GET /outstanding/retailers`
- `getSupplierOutstanding()` → `GET /outstanding/suppliers`
- `getOutstandingAging()` → `GET /outstanding/aging`

### Add methods
- `autoAllocateFifo()` → `POST /payment-receipts/:id/allocations/auto-fifo`
- `reallocate()` → `POST /payment-receipts/:id/reallocate`
- `getReceiptDocument()` → `GET /payment-receipts/:id/receipt-document`
- `getRetailerReceipts()` → `GET /retailers/:id/payment-receipts`
- `getMyReceipts()` → `GET /my/payment-receipts`
- `getMyReceiptById()` → `GET /my/payment-receipts/:id`
- `previewAllocation()` → `POST /payment-allocation/preview`

### Controller-to-service mapping
- `PaymentsService.findAll()`
- `PaymentsService.create()`
- `PaymentsService.findOne()`
- `PaymentsService.confirm()`
- `PaymentsService.cancel()`
- `PaymentsService.getAllocations()`
- `PaymentsService.createAllocation()`
- `PaymentsService.autoAllocateFifo()`
- `PaymentsService.reallocate()`
- `PaymentsService.getReceiptDocument()`
- `PaymentsService.getRetailerOutstanding()`
- `PaymentsService.getSupplierOutstanding()`
- `PaymentsService.getOutstandingAging()`
- `PaymentsService.getRetailerReceipts()`
- `PaymentsService.getMyReceipts()`
- `PaymentsService.getMyReceiptById()`
- `PaymentAllocationService.preview()`

---

## 5.2 `payment-intents.controller.ts`

### Routes
- `POST /payment-intents`
- `POST /my/payment-intents`
- `GET /payment-intents`
- `GET /payment-intents/:id`
- `GET /my/payment-intents/:id`
- `POST /payment-intents/:id/cancel`
- `POST /payment-intents/:id/expire`
- `GET /payment-intents/:id/reconciliation-status`

### Methods
- `create()`
- `createMy()`
- `findAll()`
- `findOne()`
- `findMyOne()`
- `cancel()`
- `expire()`
- `getReconciliationStatus()`

### Service mapping
- `PaymentIntentsService.create()`
- `PaymentIntentsService.createMy()`
- `PaymentIntentsService.findAll()`
- `PaymentIntentsService.findOne()`
- `PaymentIntentsService.findMyOne()`
- `PaymentIntentsService.cancel()`
- `PaymentIntentsService.expire()`
- `PaymentIntentsService.getReconciliationStatus()`

---

## 5.3 `retailer-finance.controller.ts`

### Routes
- `GET /retailers/:id/financial-dashboard`
- `GET /my/financial-dashboard`
- `GET /retailers/:id/financial-summary`
- `GET /retailers/:id/ledger-entries`
- `GET /retailers/:id/ledger-entries/:entryId`
- `GET /my/ledger`
- `GET /retailers/:id/ledger/export`
- `GET /my/ledger/export`
- `GET /retailers/:id/outstanding-invoices`
- `GET /retailers/:id/outstanding-aging`
- `GET /my/outstanding-invoices`
- `GET /retailers/:id/statements/account`
- `GET /retailers/:id/statements/outstanding`
- `GET /retailers/:id/statements/payment-history`
- `GET /retailers/:id/statements/passbook`
- `GET /my/statements/account`
- `GET /my/statements/outstanding`
- `GET /my/statements/passbook`

### Methods
- `getRetailerFinancialDashboard()`
- `getMyFinancialDashboard()`
- `getRetailerFinancialSummary()`
- `getRetailerLedgerEntries()`
- `getRetailerLedgerEntryById()`
- `getMyLedger()`
- `exportRetailerLedger()`
- `exportMyLedger()`
- `getRetailerOutstandingInvoices()`
- `getRetailerOutstandingAging()`
- `getMyOutstandingInvoices()`
- `getRetailerAccountStatement()`
- `getRetailerOutstandingStatement()`
- `getRetailerPaymentHistoryStatement()`
- `getRetailerPassbookStatement()`
- `getMyAccountStatement()`
- `getMyOutstandingStatement()`
- `getMyPassbookStatement()`

### Service mapping
All map to `RetailerFinanceService`.

---

## 5.4 `credit-control.controller.ts`

### Routes
- `GET /retailers/:id/credit-profile`
- `PATCH /retailers/:id/credit-profile`
- `POST /retailers/:id/credit-check`
- `GET /retailers/:id/credit-overrides`
- `POST /retailers/:id/credit-overrides`
- `GET /retailers/:id/credit-history`

### Methods
- `getCreditProfile()`
- `upsertCreditProfile()`
- `checkCredit()`
- `getCreditOverrides()`
- `createCreditOverride()`
- `getCreditHistory()`

### Service mapping
All map to `CreditControlService`.

---

## 5.5 `advance-wallet.controller.ts`

### Routes
- `GET /retailers/:id/advance-wallet`
- `GET /my/advance-wallet`
- `GET /retailers/:id/wallet-transactions`
- `POST /retailers/:id/advance-wallet/adjustments`
- `POST /retailers/:id/advance-wallet/apply`

### Methods
- `getWallet()`
- `getMyWallet()`
- `getWalletTransactions()`
- `adjustWallet()`
- `applyWalletBalance()`

### Service mapping
All map to `AdvanceWalletService`.

---

## 5.6 `payment-reminders.controller.ts`

### Routes
- `GET /payment-reminders`
- `GET /retailers/:id/payment-reminders`
- `POST /payment-reminders/generate`
- `POST /payment-reminders/run-due`
- `POST /payment-reminders/:id/send`
- `POST /payment-reminders/:id/cancel`

### Methods
- `findAll()`
- `findByRetailer()`
- `generate()`
- `runDue()`
- `sendOne()`
- `cancel()`

### Service mapping
All map to `PaymentRemindersService`.

---

## 5.7 `payment-analytics.controller.ts`

### Routes
- `GET /payments/analytics/summary`
- `GET /payments/analytics/collections-trend`
- `GET /payments/analytics/method-distribution`
- `GET /payments/analytics/high-risk-retailers`
- `GET /payments/analytics/overdue-buckets`
- `GET /payments/analytics/follow-up-queue`

### Methods
- `getSummary()`
- `getCollectionsTrend()`
- `getMethodDistribution()`
- `getHighRiskRetailers()`
- `getOverdueBuckets()`
- `getFollowUpQueue()`

### Service mapping
All map to `PaymentAnalyticsService`.

---

## 5.8 `payment-gateways.controller.ts`

### Routes
- `POST /payment-gateways/:gateway/webhook`
- `GET /payment-gateway-webhooks`
- `GET /payment-gateway-webhooks/:id`
- `POST /payment-gateway-webhooks/:id/reprocess`

### Methods
- `handleWebhook()`
- `findAllWebhooks()`
- `findWebhookById()`
- `reprocessWebhook()`

### Service mapping
All map to `PaymentWebhooksService`.

---

## 5.9 `retailer-debit-notes.controller.ts`

### Routes
- `GET /retailer-debit-notes`
- `POST /retailer-debit-notes`
- `GET /retailer-debit-notes/:id`
- `POST /retailer-debit-notes/:id/post`
- `POST /retailer-debit-notes/:id/cancel`

### Methods
- `findAll()`
- `create()`
- `findOne()`
- `post()`
- `cancel()`

### Service mapping
All map to `RetailerDebitNotesService`.

---

## 6. Service Contract List

## 6.1 `payments.service.ts` — extend existing service

### Keep and retain signatures already in use
- `findAll(actor, query)`
- `create(actor, dto)`
- `findOne(actor, id)`
- `confirm(actor, id)`
- `cancel(actor, id)`
- `getAllocations(actor, id)`
- `createAllocation(actor, paymentReceiptId, dto)`
- `getRetailerOutstanding(actor)`
- `getSupplierOutstanding(actor)`
- `getOutstandingAging(actor)`

### Add methods
- `autoAllocateFifo(actor, paymentReceiptId, dto)`
- `reallocate(actor, paymentReceiptId, dto)`
- `getReceiptDocument(actor, id)`
- `getRetailerReceipts(actor, retailerId, query)`
- `getMyReceipts(actor, query)`
- `getMyReceiptById(actor, id)`
- `recordDeliveryStopCollection(actor, deliveryStopId, dto)`
- `createConfirmedGatewayReceipt(actorOrSystemContext, dto)`

### Responsibility boundaries
`PaymentsService` should remain the main receipt lifecycle facade.
It should delegate actual sub-tasks to:
- `PaymentAllocationService`
- `RetailerLedgerService`
- `AdvanceWalletService`
- `PaymentMetricsService`
- `AccountingService`

---

## 6.2 `payment-intents.service.ts`

### Public methods
- `create(actor, dto)`
- `createMy(actor, dto)`
- `findAll(actor, query)`
- `findOne(actor, id)`
- `findMyOne(actor, id)`
- `cancel(actor, id, dto)`
- `expire(actor, id)`
- `getReconciliationStatus(actor, id)`

### Internal/orchestration methods
- `validateIntentRequest(organizationId, dto)`
- `createGatewayOrderPayload(intent)`
- `attachInvoiceLinks(intentId, items)`
- `markSuccessFromWebhook(intentId, gatewayPayload)`
- `markFailureFromWebhook(intentId, reason)`
- `buildPortalPayNowResponse(intent)`

---

## 6.3 `payment-allocation.service.ts`

### Public methods
- `preview(actor, dto)`
- `createManualAllocation(actor, paymentReceiptId, dto)`
- `autoAllocateFifo(actor, paymentReceiptId, dto)`
- `reallocate(actor, paymentReceiptId, dto)`

### Internal methods
- `validateAllocationTargets(organizationId, retailerId, allocations)`
- `getRetailerOutstandingInvoices(organizationId, retailerId)`
- `buildFifoPlan(invoices, amount)`
- `applyReceiptAllocations(tx, receipt, plan)`
- `reverseReceiptAllocations(tx, receiptId)`
- `updateInvoicePaymentStatus(tx, salesInvoiceId)`

---

## 6.4 `retailer-ledger.service.ts`

### Public methods
- `postInvoiceDebit(txOrActorContext, payload)`
- `postReceiptCredit(txOrActorContext, payload)`
- `postCreditNote(txOrActorContext, payload)`
- `postDebitNote(txOrActorContext, payload)`
- `postAdvanceCredit(txOrActorContext, payload)`
- `reverseReceiptPosting(txOrActorContext, payload)`
- `getLedgerEntries(actor, retailerId, query)`
- `getLedgerEntryById(actor, retailerId, entryId)`

### Internal methods
- `generateEntryNo(organizationId)`
- `getLatestRunningBalance(tx, organizationId, retailerId)`
- `appendEntry(tx, data)`

> This service is the most important posting layer for the ledger-first design.

---

## 6.5 `retailer-finance.service.ts`

### Public methods
- `getRetailerFinancialDashboard(actor, retailerId)`
- `getMyFinancialDashboard(actor)`
- `getRetailerFinancialSummary(actor, retailerId)`
- `getRetailerOutstandingInvoices(actor, retailerId, query)`
- `getRetailerOutstandingAging(actor, retailerId)`
- `getMyOutstandingInvoices(actor, query)`
- `getMyDues(actor)`
- `getRetailerAccountStatement(actor, retailerId, query)`
- `getRetailerOutstandingStatement(actor, retailerId, query)`
- `getRetailerPaymentHistoryStatement(actor, retailerId, query)`
- `getRetailerPassbookStatement(actor, retailerId, query)`
- `getMyAccountStatement(actor, query)`
- `getMyOutstandingStatement(actor, query)`
- `getMyPassbookStatement(actor, query)`

### Backward-compatibility delegation targets
- `RetailersService.getLedgerSummary()`
- `RetailersService.getLedgerTransactions()`
- `RetailersService.getOutstanding()`
- `RetailersService.getStatements()`
- `SalesInvoicesService.getMyDues()`

---

## 6.6 `credit-control.service.ts`

### Public methods
- `getCreditProfile(actor, retailerId)`
- `upsertCreditProfile(actor, retailerId, dto)`
- `checkCredit(actor, retailerId, dto)`
- `getCreditOverrides(actor, retailerId, query)`
- `createCreditOverride(actor, retailerId, dto)`
- `getCreditHistory(actor, retailerId, query)`

### Internal methods
- `calculateProjectedExposure(organizationId, retailerId, transactionAmount)`
- `evaluateDecision(profile, exposure, context)`
- `hasActiveOverride(organizationId, retailerId, context)`
- `recalculateCachedCreditFigures(tx, retailerId)`

---

## 6.7 `advance-wallet.service.ts`

### Public methods
- `getWallet(actor, retailerId)`
- `getMyWallet(actor)`
- `getWalletTransactions(actor, retailerId, query)`
- `adjustWallet(actor, retailerId, dto)`
- `applyWalletBalance(actor, retailerId, dto)`

### Internal methods
- `ensureWallet(tx, organizationId, retailerId)`
- `postWalletTransaction(tx, walletId, payload)`
- `creditFromAdvanceReceipt(tx, retailerId, amount, reference)`
- `consumeWalletForInvoices(tx, retailerId, amount, allocationPlan)`

---

## 6.8 `payment-reminders.service.ts`

### Public methods
- `findAll(actor, query)`
- `findByRetailer(actor, retailerId, query)`
- `generate(actor, dto)`
- `runDue(actor, dto)`
- `sendOne(actor, id, dto)`
- `cancel(actor, id, dto)`

### Internal methods
- `buildReminderCandidates(asOfDate, retailerId?)`
- `avoidDuplicateReminder(tx, invoiceId, stage, channel)`
- `renderReminderMessage(reminderId)`
- `dispatchReminder(reminder)`
- `cancelPendingForInvoice(tx, salesInvoiceId)`

---

## 6.9 `payment-analytics.service.ts`

### Public methods
- `getSummary(actor, query)`
- `getCollectionsTrend(actor, query)`
- `getMethodDistribution(actor, query)`
- `getHighRiskRetailers(actor, query)`
- `getOverdueBuckets(actor, query)`
- `getFollowUpQueue(actor, query)`

---

## 6.10 `payment-webhooks.service.ts`

### Public methods
- `handleWebhook(gateway, headers, rawBody, parsedBody)`
- `findAllWebhooks(actor, query)`
- `findWebhookById(actor, id)`
- `reprocessWebhook(actor, id, dto)`

### Internal methods
- `storeWebhookEvent(gateway, rawPayload, signature)`
- `verifySignature(gateway, headers, rawBody)`
- `resolveIntentFromWebhook(gateway, parsedBody)`
- `processSuccessEvent(tx, intent, webhook)`
- `processFailureEvent(tx, intent, webhook)`

---

## 6.11 `payment-metrics.service.ts`

### Public methods
- `refreshRetailerMetrics(txOrActorContext, retailerId)`
- `refreshRetailerCreditCache(txOrActorContext, retailerId)`
- `refreshAfterReceipt(txOrActorContext, retailerId)`
- `refreshAfterInvoice(txOrActorContext, retailerId)`
- `refreshAfterCreditNote(txOrActorContext, retailerId)`
- `refreshAfterDebitNote(txOrActorContext, retailerId)`

> This service keeps `RetailerCreditProfile` and `RetailerPaymentMetric` cached values aligned.

---

## 6.12 `retailer-debit-notes.service.ts`

### Public methods
- `findAll(actor, query)`
- `create(actor, dto)`
- `findOne(actor, id)`
- `post(actor, id)`
- `cancel(actor, id, dto)`

### Internal methods
- `validateAgainstInvoice(organizationId, dto)`
- `applyLedgerImpact(tx, debitNote)`
- `updateInvoiceOutstandingIfApplicable(tx, debitNote)`

---

## 7. Cross-Module Contracts

## 7.1 Delivery module delegation
Extend existing `CreateCollectionEntryDto` in:
- `backend/src/operations/delivery/dto/create-collection-entry.dto.ts`

Add:
- `allocationMode?: 'fifo' | 'manual' | 'advance'`
- `salesInvoiceAllocations?: CollectionAllocationItemDto[]`
- `receiptFileAttachmentId?: string`
- `signatureFileAttachmentId?: string`
- `markAsAdvanceIfUnallocated?: boolean`

Then wire:
- `DeliveryService.addCollection()`
- `DeliveryService.addMyCollection()`

to call:
- `PaymentsService.recordDeliveryStopCollection(actor, stopId, dto)`

## 7.2 Sales invoice posting integration
When retailer sales invoice is posted/cancelled:
- `SalesInvoicesService.post()` should call `RetailerLedgerService.postInvoiceDebit()`
- cancellation/reversal should call matching ledger and metrics refresh logic

## 7.3 Retailer master compatibility
Current retailer finance reads in `RetailersService` should delegate to `RetailerFinanceService` so old routes still work.

---

## 8. Payments Module Update Contract

Update `backend/src/operations/payments/payments.module.ts` to register:
- all new controllers
- all new services

Recommended imports:
- `PrismaModule`
- `AccountingModule`
- `NotificationsModule`

Recommended providers:
- `PaymentsService`
- `PaymentIntentsService`
- `RetailerFinanceService`
- `CreditControlService`
- `PaymentAllocationService`
- `RetailerLedgerService`
- `AdvanceWalletService`
- `PaymentRemindersService`
- `PaymentAnalyticsService`
- `PaymentWebhooksService`
- `PaymentMetricsService`
- `RetailerDebitNotesService`

---

## 9. Suggested Build Order

### Phase 1 — contracts + read APIs
1. extend receipt DTOs
2. create finance read DTOs
3. add `retailer-finance.controller.ts`
4. add `retailer-finance.service.ts`
5. add `retailer-ledger.service.ts`

### Phase 2 — payment orchestration
6. add `payment-intents.controller.ts`
7. add `payment-intents.service.ts`
8. add `payment-allocation.service.ts`
9. enrich `payments.service.ts`
10. wire receipt confirm/cancel to ledger + metrics

### Phase 3 — credit and staff collection
11. add `credit-control.controller.ts`
12. add `credit-control.service.ts`
13. extend delivery collection DTO + delegation
14. add `advance-wallet.service.ts`

### Phase 4 — automation and controls
15. add reminders controller/service
16. add webhook controller/service
17. add analytics controller/service
18. add retailer debit notes service/controller

---

## 10. Final Recommendation
The cleanest implementation for this ERP is:
- keep **payment receipt lifecycle** in `PaymentsService`
- move **allocation logic** into `PaymentAllocationService`
- move **ledger posting** into `RetailerLedgerService`
- move **credit decisions** into `CreditControlService`
- move **portal/dashboard/statement reads** into `RetailerFinanceService`
- keep **staff collection route shape** in `DeliveryController`, but delegate payment posting to payments services

This gives you a production-friendly separation without breaking the current API surface.

---

## 11. Best Next Step
After this contract list, the best next backend deliverable is:

1. **generate actual NestJS file skeletons for these controllers/services/DTOs**, or
2. **implement Phase 1 + Phase 2 directly inside `backend/src/operations/payments`**.
