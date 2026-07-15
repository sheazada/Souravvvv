# Database Schema Additions — Retailer Payment & Credit Module

## 1. Purpose
These schema additions extend the existing Dairy Distributor ERP into a **ledger-first retailer payment and credit engine**.

This design supports:
- live retailer running balance
- credit limit and overdue control
- online payment intent tracking
- smart payment allocation
- cash collection by staff
- reminder scheduling and logs
- advance balance / wallet support
- full auditability of retailer finance

This document is designed to fit into the current **PostgreSQL + Prisma ERP schema** already created.

---

## 2. Core Design Rule
The financial source of truth should be:

## **Retailer Ledger**

That means:
- invoice posting creates **debit** entries
- payment posting creates **credit** entries
- credit notes reduce balance
- debit notes increase balance
- every financial event is traceable as a ledger transaction

Invoices remain important, but **retailer financial truth comes from ledger balance**.

---

# 3. New Tables to Add

## 3.1 `retailer_credit_profiles`
Purpose:
Store retailer-specific credit and risk settings separately from basic retailer master.

### Suggested columns
- `id UUID PK`
- `organization_id UUID NOT NULL`
- `retailer_id UUID NOT NULL UNIQUE`
- `credit_limit NUMERIC(14,2) NOT NULL DEFAULT 0`
- `credit_days INT NOT NULL DEFAULT 0`
- `warning_threshold_percent NUMERIC(5,2) NOT NULL DEFAULT 80.00`
- `block_orders_on_limit_exceed BOOLEAN NOT NULL DEFAULT false`
- `manager_approval_required BOOLEAN NOT NULL DEFAULT true`
- `allow_dispatch_with_overdue BOOLEAN NOT NULL DEFAULT false`
- `available_credit NUMERIC(14,2) NOT NULL DEFAULT 0`
- `used_credit NUMERIC(14,2) NOT NULL DEFAULT 0`
- `current_outstanding NUMERIC(14,2) NOT NULL DEFAULT 0`
- `overdue_amount NUMERIC(14,2) NOT NULL DEFAULT 0`
- `risk_level VARCHAR(20) NOT NULL DEFAULT 'low'`
- `average_payment_days NUMERIC(10,2) NULL`
- `last_payment_date DATE NULL`
- `is_credit_active BOOLEAN NOT NULL DEFAULT true`
- `notes TEXT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

### Relationships
- FK `retailer_id -> retailers.id`

### Notes
Some fields like `available_credit`, `used_credit`, and `current_outstanding` may be stored as cached values and recalculated by jobs/services.

---

## 3.2 `retailer_ledger_entries`
Purpose:
This is the main passbook / running account table.

### Suggested columns
- `id UUID PK`
- `organization_id UUID NOT NULL`
- `retailer_id UUID NOT NULL`
- `entry_no VARCHAR(30) NOT NULL`
- `entry_date DATE NOT NULL`
- `entry_time TIMESTAMPTZ NOT NULL DEFAULT now()`
- `transaction_type VARCHAR(40) NOT NULL`
- `reference_type VARCHAR(40) NOT NULL`
- `reference_id UUID NULL`
- `invoice_id UUID NULL`
- `payment_receipt_id UUID NULL`
- `credit_note_id UUID NULL`
- `debit_note_id UUID NULL`
- `payment_method VARCHAR(30) NULL`
- `debit_amount NUMERIC(14,2) NOT NULL DEFAULT 0`
- `credit_amount NUMERIC(14,2) NOT NULL DEFAULT 0`
- `running_balance NUMERIC(14,2) NOT NULL DEFAULT 0`
- `allocation_group_id UUID NULL`
- `remarks TEXT NULL`
- `created_by_user_id UUID NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

### Example transaction types
- `opening_balance`
- `sales_invoice`
- `payment_receipt`
- `advance_payment`
- `credit_note`
- `debit_note`
- `adjustment`
- `refund`
- `writeoff`

### Relationships
- FK `retailer_id -> retailers.id`
- FK `invoice_id -> sales_invoices.id`
- FK `payment_receipt_id -> payment_receipts.id`

### Important rule
This table should be append-only in normal operation. Avoid destructive edits.

---

## 3.3 `retailer_payment_intents`
Purpose:
Track online payment attempts before completion.

### Suggested columns
- `id UUID PK`
- `organization_id UUID NOT NULL`
- `retailer_id UUID NOT NULL`
- `intent_no VARCHAR(30) NOT NULL`
- `payment_context VARCHAR(30) NOT NULL`
  - `single_invoice`
  - `multi_invoice`
  - `full_outstanding`
  - `custom_amount`
  - `advance_payment`
- `currency_code VARCHAR(10) NOT NULL DEFAULT 'INR'`
- `amount NUMERIC(14,2) NOT NULL`
- `gateway_name VARCHAR(50) NULL`
- `gateway_order_id VARCHAR(100) NULL`
- `gateway_payment_id VARCHAR(100) NULL`
- `gateway_signature VARCHAR(255) NULL`
- `payment_link_url TEXT NULL`
- `dynamic_qr_payload TEXT NULL`
- `status VARCHAR(30) NOT NULL DEFAULT 'initiated'`
  - `initiated`
  - `pending`
  - `success`
  - `failed`
  - `expired`
  - `cancelled`
- `failure_reason TEXT NULL`
- `initiated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `completed_at TIMESTAMPTZ NULL`
- `expires_at TIMESTAMPTZ NULL`
- `created_by_user_id UUID NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

### Related mapping table
#### `retailer_payment_intent_invoices`
- `payment_intent_id UUID NOT NULL`
- `sales_invoice_id UUID NOT NULL`
- `target_amount NUMERIC(14,2) NOT NULL`
- PK `(payment_intent_id, sales_invoice_id)`

This supports one payment intent covering many invoices.

---

## 3.4 `retailer_payment_allocations`
Purpose:
A retailer-focused allocation table with allocation metadata beyond the generic payment allocation.

### Option A
Keep existing `payment_allocations` table and add columns.

### Additional suggested columns in existing `payment_allocations`
- `allocation_mode VARCHAR(20) NOT NULL DEFAULT 'manual'`
  - `fifo`
  - `manual`
  - `advance`
- `allocation_sequence INT NULL`
- `remaining_after_allocation NUMERIC(14,2) NULL`
- `remarks TEXT NULL`

### Option B
Create dedicated table
If you want cleaner finance logic:

#### `retailer_payment_allocations`
- `id UUID PK`
- `organization_id UUID NOT NULL`
- `payment_receipt_id UUID NOT NULL`
- `retailer_id UUID NOT NULL`
- `sales_invoice_id UUID NULL`
- `allocation_mode VARCHAR(20) NOT NULL`
- `allocated_amount NUMERIC(14,2) NOT NULL`
- `remaining_amount NUMERIC(14,2) NOT NULL DEFAULT 0`
- `allocation_sequence INT NULL`
- `allocation_date DATE NOT NULL`
- `remarks TEXT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

If current system continues with generic `payment_allocations`, Option A is simpler.

---

## 3.5 `retailer_advance_wallets`
Purpose:
Store retailer advance balance for future allocation.

### Suggested columns
- `id UUID PK`
- `organization_id UUID NOT NULL`
- `retailer_id UUID NOT NULL UNIQUE`
- `available_balance NUMERIC(14,2) NOT NULL DEFAULT 0`
- `locked_balance NUMERIC(14,2) NOT NULL DEFAULT 0`
- `last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

### Related table
#### `retailer_wallet_transactions`
- `id UUID PK`
- `organization_id UUID NOT NULL`
- `retailer_wallet_id UUID NOT NULL`
- `transaction_type VARCHAR(30) NOT NULL`
  - `advance_credit`
  - `advance_use`
  - `refund`
  - `adjustment`
- `reference_type VARCHAR(40) NULL`
- `reference_id UUID NULL`
- `debit_amount NUMERIC(14,2) NOT NULL DEFAULT 0`
- `credit_amount NUMERIC(14,2) NOT NULL DEFAULT 0`
- `running_wallet_balance NUMERIC(14,2) NOT NULL DEFAULT 0`
- `remarks TEXT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

---

## 3.6 `retailer_credit_overrides`
Purpose:
Track admin/manager override actions when retailer exceeds credit policy.

### Suggested columns
- `id UUID PK`
- `organization_id UUID NOT NULL`
- `retailer_id UUID NOT NULL`
- `sales_order_id UUID NULL`
- `override_type VARCHAR(30) NOT NULL`
  - `credit_limit_exceed`
  - `overdue_dispatch`
  - `temporary_credit_extension`
- `requested_amount NUMERIC(14,2) NULL`
- `approved_amount NUMERIC(14,2) NULL`
- `reason TEXT NOT NULL`
- `status VARCHAR(20) NOT NULL DEFAULT 'approved'`
- `approved_by_user_id UUID NOT NULL`
- `approved_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `expires_at TIMESTAMPTZ NULL`
- `remarks TEXT NULL`

This gives a full audit trail for financial overrides.

---

## 3.7 `retailer_payment_reminders`
Purpose:
Track scheduled reminders for unpaid invoices.

### Suggested columns
- `id UUID PK`
- `organization_id UUID NOT NULL`
- `retailer_id UUID NOT NULL`
- `sales_invoice_id UUID NOT NULL`
- `reminder_stage VARCHAR(30) NOT NULL`
  - `before_due_1d`
  - `due_today`
  - `overdue_3d`
  - `overdue_7d`
  - `overdue_15d`
- `channel VARCHAR(20) NOT NULL`
  - `whatsapp`
  - `sms`
  - `email`
  - `in_app`
- `scheduled_at TIMESTAMPTZ NOT NULL`
- `sent_at TIMESTAMPTZ NULL`
- `status VARCHAR(20) NOT NULL DEFAULT 'pending'`
  - `pending`
  - `sent`
  - `failed`
  - `cancelled`
- `template_id UUID NULL`
- `error_message TEXT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

---

## 3.8 `retailer_payment_metrics`
Purpose:
Cached analytics row per retailer for faster dashboard access.

### Suggested columns
- `id UUID PK`
- `organization_id UUID NOT NULL`
- `retailer_id UUID NOT NULL UNIQUE`
- `current_outstanding NUMERIC(14,2) NOT NULL DEFAULT 0`
- `overdue_amount NUMERIC(14,2) NOT NULL DEFAULT 0`
- `pending_invoice_count INT NOT NULL DEFAULT 0`
- `last_payment_date DATE NULL`
- `average_payment_days NUMERIC(10,2) NULL`
- `collection_success_rate NUMERIC(5,2) NULL`
- `risk_score NUMERIC(10,2) NULL`
- `risk_level VARCHAR(20) NOT NULL DEFAULT 'low'`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

This is optional but highly useful for dashboard speed.

---

## 3.9 `payment_gateway_webhooks`
Purpose:
Store raw payment gateway webhook requests for audit and replay.

### Suggested columns
- `id UUID PK`
- `organization_id UUID NOT NULL`
- `gateway_name VARCHAR(50) NOT NULL`
- `event_type VARCHAR(100) NOT NULL`
- `external_reference VARCHAR(100) NULL`
- `payload_json JSONB NOT NULL`
- `signature VARCHAR(255) NULL`
- `verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'`
- `processed_status VARCHAR(20) NOT NULL DEFAULT 'pending'`
- `processed_at TIMESTAMPTZ NULL`
- `error_message TEXT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

This is important for reliable auto-reconciliation.

---

# 4. Changes to Existing Tables

## 4.1 `sales_invoices` additions
Current table is already good, but should be extended.

### Add columns
- `payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid'`
  - `unpaid`
  - `partial_paid`
  - `paid`
- `paid_at TIMESTAMPTZ NULL`
- `due_bucket VARCHAR(20) NULL`
  - `current`
  - `overdue`
  - `severe_overdue`
- `payment_intent_id UUID NULL`
- `auto_reconciled BOOLEAN NOT NULL DEFAULT false`
- `reminder_enabled BOOLEAN NOT NULL DEFAULT true`

### Important note
Even if outstanding can be derived, explicit payment status improves querying and UI clarity.

---

## 4.2 `payment_receipts` additions
Current table should be extended to support richer finance logic.

### Add columns
- `payment_source VARCHAR(30) NULL`
  - `retailer_portal`
  - `delivery_staff`
  - `admin_entry`
  - `gateway_webhook`
- `payment_intent_id UUID NULL`
- `gateway_name VARCHAR(50) NULL`
- `gateway_payment_id VARCHAR(100) NULL`
- `gateway_order_id VARCHAR(100) NULL`
- `is_advance_payment BOOLEAN NOT NULL DEFAULT false`
- `unallocated_amount NUMERIC(14,2) NOT NULL DEFAULT 0`
- `receipt_file_url TEXT NULL`
- `signature_file_url TEXT NULL`
- `auto_reconciled BOOLEAN NOT NULL DEFAULT false`

---

## 4.3 `retailers` additions or migration notes
Since retailer financial settings are moving into `retailer_credit_profiles`, you can either:

### Option A
Keep existing financial fields in `retailers` as cached/basic fields.

### Option B
Treat them as legacy and move real finance logic into new credit profile table.

### Recommended
Keep these in `retailers` for compatibility:
- `credit_limit`
- `credit_days`
- `opening_balance`

But make `retailer_credit_profiles` the main operational config table.

---

## 4.4 `credit_notes` enhancements
Suggested columns:
- `retailer_id UUID NULL`
- `supplier_id UUID NULL`
- `affects_ledger BOOLEAN NOT NULL DEFAULT true`
- `affects_invoice_balance BOOLEAN NOT NULL DEFAULT true`
- `applied_amount NUMERIC(14,2) NOT NULL DEFAULT 0`
- `remaining_amount NUMERIC(14,2) NOT NULL DEFAULT 0`

---

# 5. Recommended Relationships

## Retailer finance graph
- `retailers` 1:1 `retailer_credit_profiles`
- `retailers` 1:N `retailer_ledger_entries`
- `retailers` 1:1 `retailer_advance_wallets`
- `retailers` 1:N `retailer_wallet_transactions`
- `retailers` 1:N `retailer_payment_intents`
- `retailers` 1:N `retailer_credit_overrides`
- `retailers` 1:N `retailer_payment_reminders`
- `retailers` 1:1 `retailer_payment_metrics`

## Invoice/payment graph
- `sales_invoices` 1:N `payment_allocations`
- `payment_receipts` 1:N `payment_allocations`
- `retailer_payment_intents` N:M `sales_invoices` through `retailer_payment_intent_invoices`
- `sales_invoices` 1:N `retailer_payment_reminders`

## Ledger graph
- each posted invoice/payment/note creates ledger entries
- `reference_type + reference_id` identify source document

---

# 6. Example Ledger Flow

## Example 1 — Credit sale
1. invoice generated = ₹5,000
2. ledger entry:
   - debit = 5,000
   - credit = 0
   - running balance increases

## Example 2 — Payment ₹3,000
1. payment receipt created
2. allocation applied to invoice(s)
3. ledger entry:
   - debit = 0
   - credit = 3,000
   - running balance decreases

## Example 3 — Advance ₹2,000
1. payment received without invoice settlement
2. wallet/advance balance increases
3. ledger credit entry created
4. future invoice can consume advance

---

# 7. Constraints and Validation Rules

## Ledger rules
- `debit_amount >= 0`
- `credit_amount >= 0`
- not both zero
- running balance should be computed in posting sequence

## Allocation rules
- allocation cannot exceed receipt remaining amount
- allocation cannot exceed invoice outstanding amount
- invoice status updates after allocation

## Credit rules
- used credit should equal unpaid outstanding or be derived from it
- overdue amount should be computed from due dates
- order placement service must check active credit profile before approval/dispatch

## Payment intent rules
- successful gateway payment should not reconcile twice
- webhook processing should be idempotent

---

# 8. Recommended Indexes

Create indexes on:

## Credit profiles
- `retailer_credit_profiles (organization_id, retailer_id)`
- `retailer_credit_profiles (organization_id, risk_level)`

## Ledger
- `retailer_ledger_entries (organization_id, retailer_id, entry_date DESC, entry_time DESC)`
- `retailer_ledger_entries (organization_id, transaction_type)`
- `retailer_ledger_entries (organization_id, reference_type, reference_id)`

## Payment intents
- `retailer_payment_intents (organization_id, retailer_id, status)`
- `retailer_payment_intents (organization_id, gateway_order_id)`
- `retailer_payment_intents (organization_id, gateway_payment_id)`

## Reminders
- `retailer_payment_reminders (organization_id, scheduled_at, status)`
- `retailer_payment_reminders (organization_id, retailer_id, sales_invoice_id)`

## Metrics
- `retailer_payment_metrics (organization_id, risk_level)`
- `retailer_payment_metrics (organization_id, overdue_amount DESC)`

## Webhooks
- `payment_gateway_webhooks (gateway_name, external_reference)`
- `payment_gateway_webhooks (processed_status, created_at DESC)`

---

# 9. Suggested Prisma Model Names
If converted to Prisma, recommended model names:
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

---

# 10. Suggested Migration Order

## Phase 1 — Ledger foundation
1. `retailer_credit_profiles`
2. `retailer_ledger_entries`
3. `sales_invoices` column additions
4. `payment_receipts` column additions

## Phase 2 — Payment orchestration
5. `retailer_payment_intents`
6. `retailer_payment_intent_invoices`
7. `payment_allocations` enhancements

## Phase 3 — Credit and automation
8. `retailer_credit_overrides`
9. `retailer_payment_reminders`
10. `retailer_payment_metrics`

## Phase 4 — Future-ready finance layer
11. `retailer_advance_wallets`
12. `retailer_wallet_transactions`
13. `payment_gateway_webhooks`
14. `credit_notes` enhancements

---

# 11. Important Recommendation
For this module, do not rely only on invoice status updates.

The correct architecture is:

> **Invoice + Receipt + Allocation + Ledger + Credit Profile + Metrics**

That gives you:
- accurate outstanding balance
- finance transparency
- automatic reconciliation
- audit trail
- strong dashboard/report support

---

# 12. Recommended Next Step
After this schema addition design, the next best deliverable is one of these:

1. **Prisma schema additions for these models**
2. **API blueprint for payment + credit workflows**
3. **UI wireframe for retailer finance screens**
4. **implementation roadmap inside current codebase**
