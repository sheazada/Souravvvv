# Retailer Payment & Credit Management Module

## 1. Module Goal
Build a **professional, ledger-first Retailer Payment & Credit Management Module** for the Dairy Distributor ERP.

This module should:
- eliminate manual payment reconciliation
- support both **Pay Now** and **Buy on Credit** retailers
- maintain a **live running retailer ledger**
- give full financial transparency to both distributor and retailer
- automate reminders, allocations, receipts, and outstanding tracking

This should behave like a **real ERP finance sub-system**, not just a simple invoice payment screen.

---

## 2. Core Design Principle
The system must be built around a:

# **Retailer Ledger (Running Account / Digital Passbook)**

That means:
- invoices **increase** balance
- payments **decrease** balance
- credit notes **decrease** balance
- debit notes **increase** balance
- adjustments are always ledger entries

## Important rule
The source of truth for retailer finance is:

> **Retailer ledger balance, not just invoice status**

Invoices remain important, but the ledger is the main financial engine.

---

## 3. Main Outcomes Expected
After implementation, the ERP should allow:
- retailer to see real-time dues and available credit
- admin to monitor risk and collections
- staff to record field cash collections instantly
- online payments to auto-reconcile without manual marking
- partial/custom payments to allocate intelligently
- all stakeholders to see the same ledger history

---

# 4. Functional Scope

## 4.1 Retailer Financial Dashboard
Each retailer gets a dedicated financial dashboard.

### Must show
- current outstanding balance
- available credit limit
- total credit limit
- used credit
- overdue amount
- upcoming due payments
- last payment date
- average payment time
- risk level (low / medium / high)
- payment history summary
- number of pending invoices

### UX goal
Before placing a new order, the retailer must clearly see:
- what is already due
- whether they can still buy on credit
- whether overdue invoices exist

---

## 4.2 Order Placement & Payment Flow
When retailer places order, system must show:
- order total
- previous outstanding balance
- available credit
- total amount payable
- whether retailer is within credit limit

### Two modes

## Option A — Pay Now
Supported methods:
- UPI
- dynamic QR code
- credit card
- debit card
- net banking
- payment gateway

### After successful payment
System must automatically:
- mark invoice as paid
- save payment transaction ID
- update retailer ledger
- update outstanding balance
- generate payment receipt
- send payment confirmation
- move order to dispatch
- notify admin

### Principle
No manual payment approval should be needed.

---

## Option B — Buy on Credit
If retailer chooses pay later:
- mark invoice as unpaid
- increase retailer outstanding balance
- assign due date using credit terms
- allow dispatch only if credit policy permits
- trigger reminder schedule automatically

---

## 4.3 Outstanding Payment Portal
Retailer must have a dedicated dues page showing:
- unpaid invoices
- invoice numbers
- invoice dates
- due dates
- overdue invoices
- total outstanding amount
- current ledger balance

### Actions retailer can do
- pay single invoice
- pay multiple invoices
- pay all outstanding invoices
- enter custom payment amount

---

## 4.4 Smart Payment Allocation
When retailer pays custom amount, ERP must allocate intelligently.

### Example
Outstanding = ₹18,450
Payment = ₹10,000

### Modes

## A. Automatic FIFO
- settle oldest invoices first

## B. Manual Allocation
- retailer chooses which invoices to settle

### Must support
- partial payments
- multiple invoice settlement
- advance payments
- balance carry-forward

---

## 4.5 Automatic Payment Reconciliation
Whenever online payment is received, ERP must automatically:
- identify retailer
- match payment with invoice(s)
- mark affected invoices appropriately
- update ledger
- update outstanding balance
- save payment reference number
- generate receipt
- notify distributor
- notify retailer

### Principle
This process should be automatic, not operator-driven.

---

## 4.6 Retailer Ledger / Digital Passbook
Every retailer gets a live passbook similar to a bank ledger.

### Each entry must show
- date
- time
- transaction type
- invoice number / reference
- payment method
- debit
- credit
- running balance
- remarks

### Entry types
- opening balance
- new invoice
- payment received
- cash payment
- UPI payment
- bank transfer
- credit note
- debit note
- adjustment entry
- advance settlement
- refund

### Visibility
- distributor and retailer must see same ledger in real time
- this prevents payment disputes

---

## 4.7 Supported Payment Methods
Must support:
- cash
- UPI
- dynamic UPI QR
- credit card
- debit card
- net banking
- bank transfer
- advance payments
- partial payments

---

## 4.8 Cash Collection Module
Delivery staff mobile screen should support:
- select retailer
- enter collected cash amount
- select invoice(s) being paid
- upload receipt photo optional
- capture retailer signature optional

### System should instantly
- update ledger
- update invoice allocation
- update outstanding balance
- update cash book
- generate receipt

---

## 4.9 Credit Management System
Each retailer should have credit settings:
- credit limit
- used credit
- available credit
- outstanding balance
- overdue amount
- credit days
- due date logic
- payment history

### Business rules
- warn when credit exceeds 80%
- manager approval if limit exceeded
- optionally block new orders beyond limit
- allow admin override with permission and audit trail

---

## 4.10 Automatic Reminder System
Reminders should trigger:
- 1 day before due date
- on due date
- 3 days overdue
- 7 days overdue
- 15 days overdue

### Channels
- WhatsApp
- SMS
- email
- in-app notification

---

## 4.11 Payment Analytics Dashboard
Must include:
- total outstanding
- today’s collections
- weekly collections
- monthly collections
- overdue amount
- collection success rate
- average collection period
- highest outstanding retailers
- payment method distribution
- collection trend charts

---

## 4.12 Receipts & Statements
Auto-generate:
- payment receipt
- outstanding statement
- account statement
- retailer ledger report
- customer passbook
- daily collection report
- monthly collection report
- payment history report

### Output formats
- PDF
- Excel
- print layout

---

## 4.13 Future-Ready Extensions
Architecture must support future additions:
- bank statement reconciliation
- account aggregator / open banking
- invoice-linked dynamic UPI QR
- payment links
- retailer advance wallet
- credit note management
- refund management
- scheduled recurring payments
- accounting software integration
- AI late-payment prediction
- smart allocation suggestions
- credit risk scoring

---

# 5. Required Screens

## 5.1 Admin / Backoffice Screens
- retailer financial overview page
- retailer ledger / passbook page
- outstanding invoice page
- payment receipt list
- payment receipt detail
- allocation screen
- credit control screen
- overdue follow-up screen
- collection dashboard
- payment analytics dashboard
- receipt / statement export screen

## 5.2 Retailer Screens
- financial dashboard
- dues page
- invoice payment page
- passbook / ledger page
- payment history page
- pay now flow
- pay selected invoices flow
- pay custom amount flow

## 5.3 Staff / Delivery Screens
- collection entry page
- invoice selection for collected payment
- crate + payment combined stop screen
- collection summary page
- receipt photo and signature capture screen

---

# 6. Data Model Additions / Enhancements
This module should extend the existing ERP schema with a more explicit finance layer.

## 6.1 Core Financial Entities

### Retailer Credit Profile
Purpose:
- one place for retailer credit settings and risk calculation

Suggested fields:
- retailer_id
- credit_limit
- credit_days
- warning_threshold_percent
- block_on_exceed_limit
- manager_approval_required
- risk_level
- average_payment_days
- last_payment_date
- is_credit_active

---

### Retailer Ledger Entry
This is the most important table.

Suggested fields:
- id
- organization_id
- retailer_id
- transaction_date
- transaction_time
- transaction_type
- reference_type
- reference_id
- invoice_id nullable
- receipt_id nullable
- payment_method nullable
- debit_amount
- credit_amount
- running_balance
- remarks
- created_by

### Transaction types
- opening_balance
- sales_invoice
- payment_receipt
- credit_note
- debit_note
- adjustment
- advance_payment
- refund

---

### Payment Intent / Online Payment Attempt
Purpose:
- track online payment session before confirmation

Fields:
- id
- retailer_id
- invoice_ids json/relational mapping
- amount
- payment_gateway
- gateway_reference
- status
- initiated_at
- completed_at
- failure_reason

---

### Payment Allocation
Already present in current architecture, but should be treated as critical.

Enhancements:
- allocation_mode (fifo/manual/advance)
- allocation_reference
- partial_allocation_flag

---

### Credit Notes / Debit Notes
Should be integrated with retailer ledger and invoice outstanding logic.

---

### Reminder Schedule / Reminder Log
Suggested fields:
- retailer_id
- invoice_id
- reminder_stage
- due_category
- channel
- sent_status
- scheduled_at
- sent_at

---

### Advance Wallet / Advance Balance (future-ready)
Suggested fields:
- retailer_id
- available_advance_amount
- last_updated_at

---

# 7. Ledger and Accounting Rules

## 7.1 Retailer ledger rules
- every invoice creates a debit entry
- every payment creates a credit entry
- every adjustment must update running balance
- running balance should be immutable history, not overwritten silently

## 7.2 Invoice rules
- invoice status should derive from allocation/outstanding where possible
- statuses:
  - unpaid
  - partial_paid
  - paid
  - cancelled

## 7.3 Payment rules
- one receipt can allocate to many invoices
- one invoice can receive many receipts
- custom payments must support partial allocation
- advance receipt may remain unallocated and sit as credit balance

## 7.4 Credit rules
- available credit = credit limit - used credit
- used credit should reflect outstanding unpaid balance
- overdue amount should be tracked separately from total outstanding

## 7.5 Accounting rules
- payment confirmation should post accounting entry automatically
- retailer ledger and accounting journal should stay aligned
- cash collection must update cash book
- bank/UPI receipts must update bank book or mapped account

---

# 8. API Blueprint for this Module

## Retailer financial dashboard
- `GET /retailers/:id/financial-dashboard`
- `GET /my/financial-dashboard`

## Ledger / passbook
- `GET /retailers/:id/ledger-passbook`
- `GET /my/ledger-passbook`

## Outstanding portal
- `GET /retailers/:id/outstanding-invoices`
- `GET /my/outstanding-invoices`

## Payments
- `POST /payments/pay-now`
- `POST /payments/create-intent`
- `POST /payments/webhook/gateway`
- `POST /payment-receipts`
- `POST /payment-receipts/:id/confirm`
- `POST /payment-receipts/:id/allocate`

## Smart allocation
- `POST /payment-allocation/preview`
- `POST /payment-allocation/apply`

## Credit controls
- `PATCH /retailers/:id/credit-profile`
- `POST /retailers/:id/credit-override`

## Reminder system
- `GET /payment-reminders`
- `POST /payment-reminders/run`
- `GET /payment-reminders/logs`

## Statements
- `GET /retailers/:id/statements/export?format=pdf`
- `GET /retailers/:id/statements/export?format=xlsx`
- `GET /my/statements/export?format=pdf`

## Analytics
- `GET /payments/analytics/summary`
- `GET /payments/analytics/collections-trend`
- `GET /payments/analytics/method-distribution`
- `GET /payments/analytics/high-risk-retailers`

---

# 9. Frontend Page to API Mapping

## Admin payment dashboard
Uses:
- payment analytics APIs
- outstanding APIs
- collection APIs

## Retailer dues page
Uses:
- my outstanding invoices
- my ledger passbook
- pay-now endpoints
- allocation preview

## Retailer passbook page
Uses:
- my ledger passbook

## Staff collection page
Uses:
- payment receipt create
- invoice selection lookup
- proof upload

---

# 10. UX Design Rules
- show balance summary before actions
- minimize clicks for paying due invoices
- show clear debit/credit colors in passbook
- make collection flow one-handed and mobile-friendly
- show warnings before credit breach
- always show remaining outstanding after payment preview
- give receipt instantly after successful payment

---

# 11. Security & Audit Requirements
- every override must be permission-based
- every payment action must be audited
- every auto-allocation decision should be traceable
- payment gateway callbacks must be verified
- duplicate payment protection required
- refund and reversal actions must require elevated permission

---

# 12. Suggested Implementation Order

## Phase 1 — Ledger-first foundation
- retailer credit profile
- ledger entry engine
- payment allocation engine
- outstanding calculation rules

## Phase 2 — Operational payment flow
- pay now flow
- credit order flow
- auto reconciliation
- collection entry
- receipt generation

## Phase 3 — Visibility and control
- retailer financial dashboard
- overdue portal
- passbook
- analytics
- reports/statements

## Phase 4 — Automation and intelligence
- reminders
- QR / payment links
- bank reconciliation
- AI late payment prediction

---

# 13. Final Scope Statement
This module should act as a:

> **professional ERP-grade retailer finance engine**

where:
- invoices and payments flow automatically into a live retailer ledger
- credit exposure is always visible
- outstanding balances are always accurate
- payment reconciliation is automatic wherever possible
- retailers and distributor both see one shared financial truth

---

# 14. Recommended Next Step
After this, the best next deliverables are:

1. **database schema additions for ledger-first payment engine**
2. **API blueprint for payment + credit workflows**
3. **UI wireframes for retailer finance screens**
4. **implementation roadmap for this module inside the current ERP codebase**
