# Retailer Payment & Credit API Blueprint

## 1. Purpose
This document defines the **ledger-first payment, collection, credit-control, reminder, and retailer finance APIs** for the Dairy Distributor ERP.

It is designed specifically for your business reality:
- **Sudha dairy distributor**
- **retailers/shops are the main customers**
- many retailers operate in **assisted mode**
- admin/staff may create orders and invoices on behalf of retailers
- all such transactions must still remain under **one unified retailer financial account**

This blueprint is intentionally **ERP-grade**, not a simple invoice payment screen.

---

## 2. Scope
This blueprint covers:
- retailer financial dashboard
- retailer credit profile and live exposure
- ledger / passbook APIs
- outstanding and aging APIs
- online pay-now flows
- partial, multi-invoice, and full-outstanding payments
- draft and confirmed payment receipt flows
- smart allocation preview and posting
- delivery staff cash collection flow
- advance wallet handling
- credit override workflow
- reminder scheduling and sending
- analytics, statements, exports
- payment gateway webhook processing
- audit and idempotency rules

This blueprint builds on the already existing generic APIs:
- `GET /payment-receipts`
- `POST /payment-receipts`
- `GET /payment-receipts/:id`
- `POST /payment-receipts/:id/confirm`
- `POST /payment-receipts/:id/cancel`
- `GET /payment-receipts/:id/allocations`
- `POST /payment-receipts/:id/allocations`
- `GET /outstanding/retailers`
- `GET /outstanding/suppliers`
- `GET /outstanding/aging`

This document **extends** those endpoints into a full retailer finance engine.

---

## 3. Core Design Rules

### 3.1 Ledger-first rule
Retailer finance source of truth is:

> **Retailer ledger + allocations + posted receipts**, not only invoice status.

### 3.2 Unified retailer account rule
If admin or salesperson creates:
- an order on behalf of retailer
- an invoice on behalf of retailer
- a collection entry on behalf of retailer

then the resulting invoice/payment/ledger entry must still belong to that **same retailer account** and appear in:
- retailer dashboard
- retailer orders
- retailer invoices
- retailer dues
- retailer ledger/passbook
- retailer statements

### 3.3 Append-only finance rule
Normal finance events should create new rows, not silently overwrite old finance history.

Especially append-only:
- `RetailerLedgerEntry`
- `PaymentGatewayWebhook`
- reminder logs/history
- credit override trail

### 3.4 Allocation rule
A payment may:
- settle one invoice
- settle multiple invoices
- partially settle invoices
- remain partly unallocated as advance
- be applied later from wallet/advance balance

### 3.5 Credit policy rule
Order approval, invoice posting, and dispatch release may depend on:
- credit limit
- overdue amount
- blocked status
- temporary override approval

### 3.6 Idempotency rule
The following actions must be idempotent:
- payment intent creation from unstable/mobile networks
- gateway webhook processing
- staff collection submission
- payment receipt confirmation
- reminder generation jobs

---

## 4. Base API Standards

### 4.1 Base URL
```http
/api/v1
```

### 4.2 Authentication
Protected endpoints use JWT:
```http
Authorization: Bearer <access_token>
```

Public gateway callback endpoints must use provider signature verification.

### 4.3 Suggested headers
```http
Idempotency-Key: <uuid>
X-Device-Id: <mobile-device-id>
X-Request-Source: portal|admin|staff|system|webhook
```

### 4.4 Standard response
```json
{
  "success": true,
  "message": "Payment intent created successfully",
  "data": {},
  "meta": {}
}
```

### 4.5 Money convention
All money values should be returned as **numeric values in INR with 2 decimal precision**.

### 4.6 Audit capture
Critical finance endpoints must store:
- acting user
- retailer
- source module
- source device if available
- before/after summary for reversals/overrides
- timestamp
- IP / user-agent for admin and portal requests when available

---

## 5. Prisma Model Mapping
This blueprint maps directly to the merged schema models:
- `RetailerCreditProfile`
- `RetailerLedgerEntry`
- `RetailerPaymentIntent`
- `RetailerPaymentIntentInvoice`
- `RetailerAdvanceWallet`
- `RetailerWalletTransaction`
- `RetailerCreditOverride`
- `RetailerPaymentReminder`
- `RetailerPaymentMetric`
- `PaymentGatewayWebhook`
- `RetailerDebitNote`
- `PaymentReceipt`
- `PaymentAllocation`
- `SalesInvoice`
- `CreditNote`

---

## 6. Common Status and Type Vocabulary

### 6.1 Payment intent status
- `initiated`
- `pending`
- `success`
- `failed`
- `expired`
- `cancelled`

### 6.2 Payment receipt status
- `draft`
- `confirmed`
- `cancelled`

### 6.3 Payment source
- `retailer_portal`
- `delivery_staff`
- `admin_entry`
- `gateway_webhook`
- `system_adjustment`

### 6.4 Payment context
- `single_invoice`
- `multi_invoice`
- `full_outstanding`
- `custom_amount`
- `advance_payment`

### 6.5 Allocation mode
- `fifo`
- `manual`
- `advance`

### 6.6 Ledger transaction type
- `opening_balance`
- `sales_invoice`
- `payment_receipt`
- `advance_payment`
- `credit_note`
- `debit_note`
- `adjustment`
- `refund`
- `writeoff`

### 6.7 Reminder stage
- `before_due_1d`
- `due_today`
- `overdue_3d`
- `overdue_7d`
- `overdue_15d`

### 6.8 Credit decision result
- `allowed`
- `warning`
- `manager_approval_required`
- `blocked`

---

## 7. Shared Response Shapes

### 7.1 Retailer finance summary
```json
{
  "retailerId": "uuid",
  "currentOutstanding": 18450.00,
  "totalCreditLimit": 50000.00,
  "usedCredit": 18450.00,
  "availableCredit": 31550.00,
  "overdueAmount": 6200.00,
  "pendingInvoiceCount": 5,
  "upcomingDueAmount": 4200.00,
  "lastPaymentDate": "2026-07-08",
  "averagePaymentDays": 11.4,
  "riskLevel": "medium",
  "warningThresholdPercent": 80.00,
  "creditUsagePercent": 36.90,
  "dispatchBlocked": false,
  "orderBlocked": false
}
```

### 7.2 Outstanding invoice row
```json
{
  "invoiceId": "uuid",
  "invoiceNo": "INV-20260710-0012",
  "invoiceDate": "2026-07-10",
  "dueDate": "2026-07-17",
  "grandTotal": 5200.00,
  "outstandingAmount": 2200.00,
  "paymentStatus": "partial_paid",
  "daysOverdue": 0,
  "dueBucket": "current",
  "eligibleForPayNow": true
}
```

### 7.3 Ledger entry row
```json
{
  "id": "uuid",
  "entryNo": "LED-20260710-00045",
  "entryDate": "2026-07-10",
  "entryTime": "2026-07-10T09:14:22.000Z",
  "transactionType": "payment_receipt",
  "referenceType": "payment_receipt",
  "referenceId": "uuid",
  "invoiceId": "uuid",
  "paymentReceiptId": "uuid",
  "paymentMethod": "upi",
  "debitAmount": 0,
  "creditAmount": 5000.00,
  "runningBalance": 13450.00,
  "remarks": "UPI collection"
}
```

### 7.4 Credit check result
```json
{
  "decision": "warning",
  "reasons": ["credit_usage_above_warning_threshold"],
  "creditLimit": 50000.00,
  "currentOutstanding": 39600.00,
  "projectedOutstanding": 42100.00,
  "availableCreditAfterTransaction": 7900.00,
  "overdueAmount": 0,
  "requiresOverride": false,
  "canApproveOrder": true,
  "canDispatch": true
}
```

---

## 8. Role Access Summary

### Owner / Super Admin
Full access including reversal, override, analytics, exports, and webhook replay.

### Accountant
- full payment receipt management
- allocations
- ledger view
- statements
- reminder run/send
- credit note / debit note posting
- cannot approve high-risk override unless permission granted

### Operations Admin
- read retailer finance summary
- raise override request
- trigger pay-now link
- limited receipt creation if permitted

### Salesperson
- read retailer dues and credit status
- create assisted pay-now request for retailer
- cannot cancel confirmed receipt or reverse ledger

### Driver / Delivery Staff
- only create collection entries for assigned stops or allowed staff collection screen
- can upload proof and signature
- cannot access other retailers’ finance history

### Retailer
- only own `/my/*` finance APIs
- can create payment intent
- can view dues, ledger, invoices, receipts, statements
- cannot see internal override notes or other retailers

---

## 9. Endpoint Groups

# 9.1 Retailer Financial Dashboard APIs

### GET `/retailers/:id/financial-dashboard`
Admin/backoffice financial view for one retailer.

**Returns**
- finance summary
- overdue summary
- pending invoices snapshot
- last 10 ledger entries
- last 5 receipts
- last reminder status
- active credit flags

### GET `/my/financial-dashboard`
Retailer self-service finance dashboard.

### GET `/retailers/:id/financial-summary`
Lightweight summary endpoint for selectors, approval checks, popovers, and order header warnings.

**Use cases**
- sales order approval screen
- assisted billing screen
- collections screen
- dispatch release screen

---

# 9.2 Credit Profile and Credit Control APIs

### GET `/retailers/:id/credit-profile`
Fetch full retailer credit policy and cached exposure.

### PATCH `/retailers/:id/credit-profile`
Create/update operational credit profile.

**Body**
```json
{
  "creditLimit": 50000,
  "creditDays": 7,
  "warningThresholdPercent": 80,
  "blockOrdersOnLimitExceed": true,
  "managerApprovalRequired": true,
  "allowDispatchWithOverdue": false,
  "isCreditActive": true,
  "notes": "Retailer pays mostly every 5 to 7 days"
}
```

### POST `/retailers/:id/credit-check`
Evaluate whether an action is allowed before approving order / invoice / dispatch.

**Body**
```json
{
  "context": "order_approval",
  "transactionAmount": 4200,
  "salesOrderId": "uuid"
}
```

**Supported context values**
- `order_approval`
- `invoice_posting`
- `dispatch_release`
- `manual_credit_review`

### GET `/retailers/:id/credit-overrides`
List historical override approvals.

### POST `/retailers/:id/credit-overrides`
Approve credit breach / overdue dispatch / temporary extension.

**Body**
```json
{
  "salesOrderId": "uuid",
  "overrideType": "credit_limit_exceed",
  "requestedAmount": 4200,
  "approvedAmount": 4200,
  "reason": "Festival demand and retailer has confirmed next-day payment",
  "expiresAt": "2026-07-12T23:59:59.000Z",
  "remarks": "Owner approved on phone"
}
```

### GET `/retailers/:id/credit-history`
Combined view of:
- profile changes
- overrides
- usage threshold alerts
- block/unblock events

---

# 9.3 Retailer Ledger / Passbook APIs

### GET `/retailers/:id/ledger-entries`
Admin/backoffice passbook endpoint.

**Query params**
- `page`
- `limit`
- `fromDate`
- `toDate`
- `transactionType`
- `referenceType`
- `search`

### GET `/retailers/:id/ledger-entries/:entryId`
Entry detail with linked invoice / receipt / note context.

### GET `/my/ledger`
Retailer passbook endpoint.

### GET `/my/ledger/export?format=pdf`
### GET `/my/ledger/export?format=xlsx`
### GET `/retailers/:id/ledger/export?format=pdf`
### GET `/retailers/:id/ledger/export?format=xlsx`

**Important rule**
No public update/delete ledger endpoint should exist for normal users.
Corrections should happen through explicit reversal / note / adjustment APIs.

---

# 9.4 Outstanding, Dues, and Aging APIs

### GET `/retailers/:id/outstanding-invoices`
Return unpaid and partially paid invoices for one retailer.

**Query params**
- `includeOverdueOnly=true|false`
- `includeCurrentOnly=true|false`
- `search`
- `sort=dueDate:asc`

### GET `/retailers/:id/outstanding-aging`
Aging buckets for one retailer.

### GET `/outstanding/retailers`
Existing summary endpoint for all retailers.
Keep and enrich with:
- overdue amount
- risk level
- credit usage percent
- next follow-up date

### GET `/outstanding/aging`
Existing overall aging endpoint.
Keep and enrich with finance metrics.

### GET `/my/dues`
Retailer dues page endpoint.

**Must return**
- finance summary
- unpaid/partial invoices list
- overdue buckets
- suggested payment actions
- pay-all amount
- pay-overdue amount
- wallet/advance available

### GET `/my/outstanding-invoices`
Retailer-friendly lighter list endpoint for payment flows.

---

# 9.5 Payment Intent / Pay-Now APIs

### POST `/payment-intents`
Create a payment intent from admin, staff-assisted, or system flow.

**Body**
```json
{
  "retailerId": "uuid",
  "paymentContext": "multi_invoice",
  "amount": 10000,
  "gatewayName": "razorpay",
  "allocationMode": "fifo",
  "selectedInvoices": [
    { "invoiceId": "uuid", "targetAmount": 5200 },
    { "invoiceId": "uuid", "targetAmount": 4800 }
  ],
  "returnUrl": "/portal/dues",
  "remarks": "Retailer paying two pending invoices"
}
```

### POST `/my/payment-intents`
Retailer self-service pay-now entry point.

### GET `/payment-intents`
Finance/admin list of intents.

**Query params**
- `retailerId`
- `status`
- `gatewayName`
- `paymentContext`
- `fromDate`
- `toDate`

### GET `/payment-intents/:id`
View intent status, invoice links, gateway refs, and generated receipt if successful.

### POST `/payment-intents/:id/cancel`
Cancel still-unpaid intent.

### POST `/payment-intents/:id/expire`
System/admin forced expiry.

### GET `/my/payment-intents/:id`
Retailer safe detail view.

### Business processing rule on success
When a payment intent becomes `success`, system should automatically:
1. verify gateway signature
2. create or update `PaymentGatewayWebhook`
3. create confirmed `PaymentReceipt`
4. create invoice allocations
5. create `RetailerLedgerEntry`
6. update invoice `outstandingAmount` and `paymentStatus`
7. update `RetailerCreditProfile` cached exposure
8. update `RetailerPaymentMetric`
9. generate receipt reference
10. trigger notifications
11. release invoice/order for dispatch if payment hold was active

---

# 9.6 Allocation Preview and Allocation Posting APIs

### POST `/payment-allocation/preview`
Preview how a payment amount would be allocated before creating receipt or intent.

**Body**
```json
{
  "retailerId": "uuid",
  "amount": 10000,
  "paymentContext": "custom_amount",
  "allocationMode": "fifo",
  "selectedInvoiceIds": ["uuid", "uuid"]
}
```

**Returns**
- invoice-wise proposed allocation
- remaining unallocated amount
- projected outstanding after payment
- projected credit usage after payment

### POST `/payment-receipts/:id/allocations/auto-fifo`
Create auto FIFO allocations for remaining amount.

### GET `/payment-receipts/:id/allocations`
Existing endpoint. Keep.

### POST `/payment-receipts/:id/allocations`
Existing manual allocation create endpoint. Keep and enrich.

**Body**
```json
{
  "salesInvoiceId": "uuid",
  "allocatedAmount": 3200,
  "allocationDate": "2026-07-10",
  "allocationMode": "manual",
  "remarks": "Retailer requested invoice-wise settlement"
}
```

### DELETE `/payment-allocations/:id`
Allowed only when:
- receipt is still `draft`
- no journal posted yet
- no immutable ledger posting has been finalized

### POST `/payment-receipts/:id/reallocate`
Optional controlled endpoint for draft receipts if you prefer not to expose allocation deletion directly.

---

# 9.7 Payment Receipt APIs

### GET `/payment-receipts`
Existing list endpoint. Keep and extend filters.

**Recommended new query params**
- `retailerId`
- `status`
- `paymentSource`
- `gatewayName`
- `isAdvancePayment`
- `dispatchTripId`

### POST `/payment-receipts`
Existing create endpoint. Keep as the main backoffice/staff/admin receipt creation API.

**Body**
```json
{
  "partyType": "retailer",
  "partyId": "uuid",
  "paymentDirection": "inbound",
  "paymentMode": "cash",
  "paymentDate": "2026-07-10T11:30:00.000Z",
  "amount": 5000,
  "cashRegisterId": "uuid",
  "referenceNo": "CASH-STOP-14",
  "paymentSource": "delivery_staff",
  "isAdvancePayment": false,
  "remarks": "Collected during route stop"
}
```

### GET `/payment-receipts/:id`
Return receipt header + allocations + retailer party snapshot + finance impact summary.

### POST `/payment-receipts/:id/confirm`
Confirm draft receipt and finalize finance posting.

**On confirm**
- validate duplicate reference risk
- validate allocation totals
- create ledger credits
- post accounting journal
- update retailer metrics
- update invoice payment status

### POST `/payment-receipts/:id/cancel`
Cancel receipt through controlled reversal.

**On cancel**
- reverse allocations
- reverse retailer ledger effect
- reverse accounting journal
- reopen invoice outstanding
- adjust wallet/unallocated balance if required
- append audit entry

### GET `/payment-receipts/:id/receipt-document`
Generate printable receipt JSON/PDF metadata response.

### GET `/retailers/:id/payment-receipts`
Retailer-specific admin view.

### GET `/my/payment-receipts`
Retailer self history.

### GET `/my/payment-receipts/:id`
Retailer self receipt detail.

---

# 9.8 Delivery Staff Collection APIs

These are critical for field collection.

### POST `/delivery-stops/:id/collections`
Backoffice/staff-assisted collection entry.

### POST `/my/delivery-stops/:id/collections`
Driver/staff mobile collection endpoint.

**Body**
```json
{
  "amount": 5000,
  "paymentMode": "cash",
  "referenceNo": "FIELD-CASH-001",
  "allocationMode": "manual",
  "salesInvoiceAllocations": [
    { "invoiceId": "uuid", "allocatedAmount": 3000 },
    { "invoiceId": "uuid", "allocatedAmount": 2000 }
  ],
  "receiptFileAttachmentId": "uuid",
  "signatureFileAttachmentId": "uuid",
  "remarks": "Collected from retailer during delivery"
}
```

### Collection processing rule
The stop-based collection API should internally:
1. resolve retailer from delivery stop
2. create `PaymentReceipt` with `paymentSource=delivery_staff`
3. attach proof/signature
4. create allocations or advance balance
5. confirm receipt if policy allows immediate posting
6. create ledger entries
7. post accounting to cash/bank book
8. update trip reconciliation cash totals
9. return printable receipt payload

### GET `/my/collection-summary`
Existing staff collection summary endpoint.
Keep and enrich with:
- today total
- trip-wise total
- pending sync count
- draft vs confirmed counts

### GET `/staff/collections/:id`
Optional internal detail endpoint if staff collection history UI is expanded later.

---

# 9.9 Advance Wallet APIs

### GET `/retailers/:id/advance-wallet`
Get wallet balance and latest transactions.

### GET `/my/advance-wallet`
Retailer self wallet balance.

### GET `/retailers/:id/wallet-transactions`
Paginated wallet transaction history.

### POST `/retailers/:id/advance-wallet/adjustments`
Manual admin adjustment or advance credit entry.

**Body**
```json
{
  "transactionType": "adjustment",
  "creditAmount": 1000,
  "remarks": "Round-off adjustment approved by accountant"
}
```

### POST `/retailers/:id/advance-wallet/apply`
Apply available advance to selected invoices.

**Body**
```json
{
  "allocationMode": "fifo",
  "selectedInvoiceIds": ["uuid", "uuid"],
  "amount": 1800
}
```

---

# 9.10 Reminder and Follow-up APIs

### GET `/payment-reminders`
Finance team reminder list.

**Query params**
- `retailerId`
- `status`
- `channel`
- `reminderStage`
- `fromDate`
- `toDate`

### GET `/retailers/:id/payment-reminders`
Reminder history for one retailer.

### POST `/payment-reminders/generate`
Generate pending reminder rows for unpaid invoices.

**Body**
```json
{
  "asOfDate": "2026-07-10",
  "retailerId": "uuid"
}
```

### POST `/payment-reminders/run-due`
Run sending for reminders due now.

### POST `/payment-reminders/:id/send`
Manual send or resend a specific reminder.

### POST `/payment-reminders/:id/cancel`
Cancel reminder if invoice got settled or follow-up suppressed.

### Reminder business rule
If invoice becomes fully paid, pending reminders for that invoice should be auto-cancelled.

---

# 9.11 Payment Analytics APIs

### GET `/payments/analytics/summary`
Returns KPIs such as:
- total outstanding
- overdue outstanding
- today collections
- week collections
- month collections
- average collection days
- collection success rate
- advance balance held

### GET `/payments/analytics/collections-trend`
Query params:
- `groupBy=day|week|month`
- `fromDate`
- `toDate`

### GET `/payments/analytics/method-distribution`
Cash vs UPI vs bank transfer vs gateway etc.

### GET `/payments/analytics/high-risk-retailers`
Return retailer ranking by risk score / overdue / limit breach.

### GET `/payments/analytics/overdue-buckets`
Bucketed aging summary for dashboard cards.

### GET `/payments/analytics/follow-up-queue`
Suggested prioritized collection list for sales/account staff.

---

# 9.12 Retailer Statements and Exports APIs

### GET `/retailers/:id/statements/account`
Combined account statement data for one retailer.

### GET `/retailers/:id/statements/account?format=pdf`
### GET `/retailers/:id/statements/account?format=xlsx`

### GET `/retailers/:id/statements/outstanding`
### GET `/retailers/:id/statements/outstanding?format=pdf`

### GET `/retailers/:id/statements/payment-history`
### GET `/retailers/:id/statements/passbook`

### GET `/my/statements/account`
### GET `/my/statements/account?format=pdf`
### GET `/my/statements/outstanding`
### GET `/my/statements/passbook`

**Recommended statement filters**
- `fromDate`
- `toDate`
- `includeZeroBalance=false`
- `includeCancelled=false`

---

# 9.13 Credit Note and Debit Note APIs

### GET `/retailers/:id/credit-notes`
Retailer-specific credit note list.

### GET `/retailer-debit-notes`
Admin list endpoint.

### POST `/retailer-debit-notes`
Create retailer debit note.

**Body**
```json
{
  "retailerId": "uuid",
  "relatedInvoiceId": "uuid",
  "noteDate": "2026-07-10",
  "amount": 250,
  "affectsLedger": true,
  "affectsInvoiceBalance": true,
  "remarks": "Short crate settlement / transport recovery"
}
```

### GET `/retailer-debit-notes/:id`
### POST `/retailer-debit-notes/:id/post`
### POST `/retailer-debit-notes/:id/cancel`

### Posting rule
Debit notes and credit notes must create matching retailer ledger impact when `affectsLedger=true`.

---

# 9.14 Payment Gateway Webhook and Reconciliation APIs

### POST `/payment-gateways/:gateway/webhook`
Public provider callback endpoint.

**Responsibilities**
- persist raw payload into `PaymentGatewayWebhook`
- verify signature
- ensure idempotent event handling
- map external reference to `RetailerPaymentIntent`
- mark intent success/failed
- create receipt and allocations only once
- store processing outcome

### GET `/payment-gateway-webhooks`
Admin audit list.

### GET `/payment-gateway-webhooks/:id`
Full stored payload + processing result.

### POST `/payment-gateway-webhooks/:id/reprocess`
Replay failed/pending webhook after investigation.

### GET `/payment-intents/:id/reconciliation-status`
Optional helper endpoint for admin troubleshooting.

---

# 9.15 Retailer Portal Finance Convenience APIs

These are portal-specific wrappers for better mobile UX.

### GET `/my/financial-dashboard`
### GET `/my/outstanding-invoices`
### GET `/my/ledger`
### GET `/my/payment-receipts`
### GET `/my/payment-receipts/:id`
### GET `/my/advance-wallet`
### POST `/my/payment-intents`
### GET `/my/payment-intents/:id`
### GET `/my/statements/account`
### GET `/my/statements/passbook`

**Portal UX rule**
Retailer should never need to enter raw UUIDs. Invoice selection must come from returned invoice rows.

---

## 10. Searchable Selector Support
Backoffice and staff forms should use lookup APIs instead of raw UUID entry.

### Existing reusable lookups already available
- `/lookups/retailers`
- `/lookups/sales-invoices`
- `/lookups/bank-accounts`
- `/lookups/cash-registers`
- `/lookups/dispatch-trips`

### Recommended new finance-friendly lookup helpers
- `GET /lookups/retailer-outstanding-invoices?retailerId=uuid&search=`
- `GET /lookups/retailer-payment-receipts?retailerId=uuid&search=`
- `GET /lookups/payment-intents?retailerId=uuid&status=`

These will make admin collection and allocation screens practical on mobile.

---

## 11. Key Workflow Sequences

### 11.1 Retailer pays one invoice online
1. `GET /my/dues`
2. `POST /my/payment-intents`
3. gateway opens / QR shown
4. `POST /payment-gateways/:gateway/webhook`
5. `GET /my/payment-intents/:id`
6. `GET /my/payment-receipts/:id`
7. invoice becomes `paid`
8. ledger shows credit entry

### 11.2 Retailer pays custom amount against many invoices
1. `GET /my/outstanding-invoices`
2. `POST /payment-allocation/preview`
3. `POST /my/payment-intents`
4. success webhook posts receipt + allocations
5. `GET /my/ledger`
6. `GET /my/dues`

### 11.3 Delivery staff cash collection on route
1. `GET /my/trips/:id/stops`
2. open stop
3. fetch outstanding invoices for retailer context
4. `POST /my/delivery-stops/:id/collections`
5. receipt created/confirmed
6. trip reconciliation cash total updated
7. retailer outstanding updates immediately

### 11.4 Admin-assisted billing on credit
1. admin creates invoice on behalf of retailer
2. invoice post creates retailer ledger debit
3. `POST /retailers/:id/credit-check`
4. if allowed, dispatch proceeds
5. invoice appears in `GET /my/invoices` and `GET /my/dues`
6. reminders scheduled automatically

### 11.5 Credit breach with override
1. credit check returns `manager_approval_required`
2. manager calls `POST /retailers/:id/credit-overrides`
3. order/dispatch re-check passes using active override
4. audit trail preserved

---

## 12. Validation Rules

### Payment intent validation
- amount must be greater than zero
- selected invoice total must not exceed current outstanding unless intent is advance payment
- gateway success must not create duplicate receipt for same gateway payment id

### Receipt validation
- retailer party must match allocated invoice retailer
- allocated total must not exceed receipt amount
- non-cash receipt should not have both bank and cash register together unless explicitly supported
- cancelled receipt cannot be confirmed again

### Ledger validation
- debit and credit cannot both be zero
- running balance should be produced by posting service, not client input
- no direct public update/delete of ledger rows

### Credit validation
- projected outstanding should include current transaction
- overdue rules should consider due date and active override
- warning threshold alert should trigger when usage crosses configured percent

### Reminder validation
- do not generate duplicate pending reminder for same invoice + stage + channel unless previous one failed/cancelled under allowed rule

---

## 13. Recommended Backend Controller / Service Breakdown
To fit current architecture under `backend/src/operations/payments`, recommended additions are:

### Controllers
- `payments.controller.ts` for receipts + allocations
- `payment-intents.controller.ts`
- `retailer-finance.controller.ts`
- `payment-reminders.controller.ts`
- `payment-gateways.controller.ts`
- optional `retailer-debit-notes.controller.ts`

### Services
- `payments.service.ts`
- `payment-intents.service.ts`
- `retailer-ledger.service.ts`
- `credit-control.service.ts`
- `payment-allocation.service.ts`
- `payment-reminders.service.ts`
- `payment-metrics.service.ts`
- `payment-webhooks.service.ts`
- `advance-wallet.service.ts`

### Important note
Existing `PaymentsService` already covers draft receipts, confirmations, cancellations, and allocations.
The next implementation should extend it rather than replace it.

---

## 14. Frontend Page Mapping

### Admin
- `/app/payments`
  - `/payment-receipts`
  - `/outstanding/retailers`
  - `/outstanding/aging`
  - `/payments/analytics/*`
- retailer detail finance tab
  - `/retailers/:id/financial-dashboard`
  - `/retailers/:id/ledger-entries`
  - `/retailers/:id/credit-profile`

### Retailer portal
- `/portal/dues`
  - `/my/dues`
  - `/my/outstanding-invoices`
  - `/my/payment-intents`
- `/portal/invoices/[id]`
  - invoice detail + pay-now affordance
- future `/portal/passbook`
  - `/my/ledger`

### Staff
- `/staff/collections`
  - `/my/delivery-stops/:id/collections`
  - `/my/collection-summary`

---

## 15. Implementation Priority

### P0 — must build first
1. retailer finance summary
2. retailer ledger APIs
3. credit profile + credit check
4. payment intent creation
5. gateway webhook processing
6. receipt confirmation with ledger posting
7. allocation preview + FIFO posting
8. enriched `/my/dues`
9. staff collection flow

### P1 — build next
10. advance wallet APIs
11. reminder scheduler + manual resend
12. analytics endpoints
13. statement/export endpoints
14. credit override history UI/API polish

### P2 — advanced layer
15. automated payment links
16. QR regeneration
17. bank reconciliation helpers
18. late payment risk scoring refinements
19. smarter collection prioritization

---

## 16. Final Recommendation
The clean business implementation is:

> **Invoice posting creates debit ledger entries. Receipt confirmation creates credit ledger entries. Allocation decides which invoices are settled. Credit profile decides whether more business can proceed. Portal, admin, and staff all read the same retailer finance truth.**

That architecture will support:
- assisted ordering and billing
- live dues visibility
- route collections
- credit discipline
- automated reconciliation
- retailer trust through shared passbook visibility

---

## 17. Best Next Step
After this API blueprint, the strongest next deliverable is:

1. **NestJS DTO + controller/service contract generation for this module**, or
2. **ledger-first backend implementation inside `backend/src/operations/payments`**, or
3. **frontend retailer dues / passbook / pay-now wiring against these APIs**
