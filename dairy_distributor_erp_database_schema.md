# Dairy Distributor ERP — Database Schema (PostgreSQL)

## 1. Purpose
This schema is designed for a **production-ready Dairy Distributor ERP** that covers:

- retailer ordering
- admin-assisted ordering and billing
- automatic daily demand consolidation
- procurement and supplier management
- GRN and batch-wise inventory
- dispatch, vehicle, route, and delivery tracking
- crate and packaging tracking
- returns and claims
- invoicing, collections, and accounting
- reports, notifications, audit, and AI-ready extensions

This schema is intended for a **PostgreSQL-based API-first system**.

---

## 2. Design Principles

### 2.1 Recommended database
- **PostgreSQL 16+**
- Optional: **PostGIS** for GPS/location support
- Optional: **pg_trgm** for search
- Optional: **Timescale/materialized views** for analytics optimization later

### 2.2 Common conventions
Unless otherwise mentioned, most business tables should include these common columns:

- `id UUID PRIMARY KEY`
- `organization_id UUID NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `deleted_at TIMESTAMPTZ NULL` for soft delete where useful
- `created_by_user_id UUID NULL`
- `updated_by_user_id UUID NULL`

### 2.3 Multi-organization readiness
Even if you start with one business, keeping `organization_id` allows:
- multi-branch expansion
- future franchise model
- safer data isolation

### 2.4 Amount fields
Use:
- `NUMERIC(14,2)` for money
- `NUMERIC(14,3)` or `NUMERIC(14,4)` for quantities where needed

### 2.5 Status strategy
Use either:
- PostgreSQL enums for stable statuses, or
- small lookup tables if business users may configure labels later

---

## 3. High-Level Data Flow

```text
Retailer / Admin Order Entry
    -> Sales Orders
    -> Daily Demand Consolidation
    -> Purchase Orders
    -> Goods Receipt Notes (GRN)
    -> Inventory Batches / Stock Movements
    -> Dispatch Trips / Loading Sheets / Challans
    -> Delivery Stops / Delivery Items
    -> Sales Invoices
    -> Payment Receipts / Ledger / Journal Entries
```

For assisted retailers:

```text
Admin creates order/invoice on behalf of retailer
    -> saved under same retailer account
    -> visible in retailer dashboard
    -> visible in retailer ledger / dues / order history
```

---

# 4. Core Schema Modules

## 4.1 Platform, Users, Security, Audit

### 4.1.1 `organizations`
Business/legal entity master.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(150) | business display name |
| legal_name | VARCHAR(200) | legal entity name |
| gstin | VARCHAR(20) | GST number |
| pan | VARCHAR(20) | PAN |
| phone | VARCHAR(20) | |
| email | VARCHAR(150) | |
| logo_url | TEXT | |
| timezone | VARCHAR(50) | e.g. Asia/Kolkata |
| currency_code | VARCHAR(10) | default INR |
| address_json | JSONB | registered/business address |
| is_active | BOOLEAN | |

### 4.1.2 `users`
All system logins.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | FK -> organizations.id |
| full_name | VARCHAR(150) | |
| mobile | VARCHAR(20) | unique per org |
| email | VARCHAR(150) | nullable |
| password_hash | TEXT | nullable for OTP-only users |
| user_type | VARCHAR(50) | super_admin, owner, ops_admin, accountant, staff, retailer_user |
| employee_id | UUID | nullable FK -> employees.id |
| retailer_id | UUID | nullable FK -> retailers.id |
| preferred_language | VARCHAR(10) | en, hi |
| is_active | BOOLEAN | |
| last_login_at | TIMESTAMPTZ | |

### 4.1.3 `roles`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| code | VARCHAR(50) | unique per org |
| name | VARCHAR(100) | |
| description | TEXT | |
| is_system_role | BOOLEAN | |

### 4.1.4 `permissions`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| code | VARCHAR(100) | unique |
| module | VARCHAR(50) | orders, inventory, accounting |
| action | VARCHAR(50) | create, read, update, approve |
| description | TEXT | |

### 4.1.5 `role_permissions`

| Column | Type | Notes |
|---|---|---|
| role_id | UUID | FK -> roles.id |
| permission_id | UUID | FK -> permissions.id |

**Primary key:** `(role_id, permission_id)`

### 4.1.6 `user_roles`

| Column | Type | Notes |
|---|---|---|
| user_id | UUID | FK -> users.id |
| role_id | UUID | FK -> roles.id |

**Primary key:** `(user_id, role_id)`

### 4.1.7 `user_sessions`
Optional if you want session tracking / force logout.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | |
| device_id | VARCHAR(100) | |
| ip_address | INET | |
| refresh_token_hash | TEXT | |
| expires_at | TIMESTAMPTZ | |
| revoked_at | TIMESTAMPTZ | |

### 4.1.8 `audit_logs`
Critical for ERP traceability.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| user_id | UUID | FK -> users.id |
| module | VARCHAR(50) | |
| entity_type | VARCHAR(50) | sales_order, invoice, payment |
| entity_id | UUID | |
| action | VARCHAR(50) | create, update, approve, cancel |
| before_json | JSONB | |
| after_json | JSONB | |
| ip_address | INET | nullable |
| user_agent | TEXT | nullable |
| created_at | TIMESTAMPTZ | |

### 4.1.9 `system_settings`
Flexible settings store.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| setting_group | VARCHAR(50) | invoice, gst, whatsapp, business_rules |
| setting_key | VARCHAR(100) | unique within group+org |
| value_json | JSONB | |
| is_encrypted | BOOLEAN | for secrets |

---

## 4.2 Master Data: Areas, Routes, Employees, Vehicles

### 4.2.1 `areas`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| code | VARCHAR(30) | unique per org |
| name | VARCHAR(100) | |
| city | VARCHAR(100) | |
| state | VARCHAR(100) | |
| is_active | BOOLEAN | |

### 4.2.2 `routes`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| area_id | UUID | nullable FK -> areas.id |
| code | VARCHAR(30) | unique per org |
| name | VARCHAR(100) | |
| delivery_shift | VARCHAR(30) | morning, evening |
| default_cutoff_time | TIME | |
| is_active | BOOLEAN | |

### 4.2.3 `route_retailers`
Route mapping and stop sequence.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| route_id | UUID | FK -> routes.id |
| retailer_id | UUID | FK -> retailers.id |
| stop_sequence | INT | |
| preferred_delivery_start | TIME | nullable |
| preferred_delivery_end | TIME | nullable |
| is_active | BOOLEAN | |

### 4.2.4 `employees`
Internal staff, drivers, accountants, helpers, dispatch managers, etc.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| employee_code | VARCHAR(30) | unique per org |
| full_name | VARCHAR(150) | |
| designation | VARCHAR(100) | driver, helper, sales, accountant |
| mobile | VARCHAR(20) | |
| email | VARCHAR(150) | nullable |
| joining_date | DATE | nullable |
| aadhaar_no | VARCHAR(20) | nullable |
| pan | VARCHAR(20) | nullable |
| driving_license_no | VARCHAR(50) | nullable |
| assigned_route_id | UUID | nullable FK -> routes.id |
| is_active | BOOLEAN | |

### 4.2.5 `vehicles`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| vehicle_no | VARCHAR(30) | unique per org |
| vehicle_type | VARCHAR(50) | van, mini truck, bike |
| capacity_crates | INT | nullable |
| capacity_weight_kg | NUMERIC(10,2) | nullable |
| fuel_type | VARCHAR(30) | diesel, CNG, EV |
| ownership_type | VARCHAR(30) | owned, hired |
| driver_employee_id | UUID | nullable FK -> employees.id |
| is_active | BOOLEAN | |

---

## 4.3 Business Partners: Suppliers and Retailers

### 4.3.1 `suppliers`
Dairy companies or upstream vendors.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| supplier_code | VARCHAR(30) | unique per org |
| name | VARCHAR(150) | |
| contact_person | VARCHAR(150) | |
| mobile | VARCHAR(20) | |
| email | VARCHAR(150) | nullable |
| gstin | VARCHAR(20) | nullable |
| pan | VARCHAR(20) | nullable |
| address_json | JSONB | |
| payment_terms_days | INT | default supplier credit days |
| is_active | BOOLEAN | |
| payable_account_id | UUID | nullable FK -> accounts.id |

### 4.3.2 `retailers`
Customer profile master.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| retailer_code | VARCHAR(30) | unique per org |
| shop_name | VARCHAR(150) | |
| owner_name | VARCHAR(150) | |
| mobile | VARCHAR(20) | |
| alternate_mobile | VARCHAR(20) | nullable |
| email | VARCHAR(150) | nullable |
| address_line_1 | VARCHAR(200) | |
| address_line_2 | VARCHAR(200) | nullable |
| locality | VARCHAR(100) | |
| city | VARCHAR(100) | |
| state | VARCHAR(100) | |
| pincode | VARCHAR(10) | |
| latitude | NUMERIC(10,7) | nullable |
| longitude | NUMERIC(10,7) | nullable |
| gstin | VARCHAR(20) | nullable |
| pan | VARCHAR(20) | nullable |
| aadhaar_no | VARCHAR(20) | nullable |
| credit_limit | NUMERIC(14,2) | |
| credit_days | INT | |
| assigned_route_id | UUID | nullable FK -> routes.id |
| assigned_salesperson_id | UUID | nullable FK -> employees.id |
| preferred_delivery_start | TIME | nullable |
| preferred_delivery_end | TIME | nullable |
| retailer_category | VARCHAR(50) | booth, kirana, hotel, sweet_shop |
| business_status | VARCHAR(30) | active, inactive, blocked, seasonal |
| shop_photo_url | TEXT | nullable |
| ordering_mode | VARCHAR(30) | self_service, assisted, hybrid |
| is_ordering_enabled | BOOLEAN | |
| is_billing_enabled | BOOLEAN | |
| receivable_account_id | UUID | nullable FK -> accounts.id |
| opening_balance | NUMERIC(14,2) | |
| notes | TEXT | nullable |

### 4.3.3 `retailer_documents`
For GST, PAN, Aadhaar, shop photos, agreements.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| retailer_id | UUID | FK -> retailers.id |
| document_type | VARCHAR(50) | gst, pan, aadhaar, shop_photo |
| file_url | TEXT | |
| file_name | VARCHAR(255) | |
| verified_at | TIMESTAMPTZ | nullable |
| remarks | TEXT | nullable |

---

## 4.4 Product, Variant, Tax, Packaging

### 4.4.1 `brands`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| name | VARCHAR(100) | unique per org |
| is_active | BOOLEAN | |

### 4.4.2 `product_categories`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| name | VARCHAR(100) | |
| parent_id | UUID | nullable self FK |
| is_active | BOOLEAN | |

### 4.4.3 `units`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| code | VARCHAR(20) | pkt, ltr, kg, gm, pcs |
| name | VARCHAR(50) | |
| decimal_places | SMALLINT | |

### 4.4.4 `tax_codes`
GST configuration master.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| code | VARCHAR(30) | unique per org |
| hsn_code | VARCHAR(20) | |
| gst_rate | NUMERIC(5,2) | e.g. 5.00 |
| cgst_rate | NUMERIC(5,2) | nullable |
| sgst_rate | NUMERIC(5,2) | nullable |
| igst_rate | NUMERIC(5,2) | nullable |
| is_active | BOOLEAN | |

### 4.4.5 `crate_types`
Reusable crates / packaging types.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| code | VARCHAR(30) | unique per org |
| name | VARCHAR(100) | |
| capacity_units | INT | nullable |
| deposit_value | NUMERIC(14,2) | nullable |
| is_active | BOOLEAN | |

### 4.4.6 `products`
Parent product master.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| product_code | VARCHAR(30) | unique per org |
| name | VARCHAR(150) | |
| brand_id | UUID | nullable FK -> brands.id |
| category_id | UUID | nullable FK -> product_categories.id |
| description | TEXT | nullable |
| tax_code_id | UUID | nullable FK -> tax_codes.id |
| is_batch_tracked | BOOLEAN | |
| is_expiry_tracked | BOOLEAN | |
| is_returnable | BOOLEAN | |
| default_crate_type_id | UUID | nullable FK -> crate_types.id |
| status | VARCHAR(20) | active, inactive |

### 4.4.7 `product_variants`
Commercially sellable SKU table.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| product_id | UUID | FK -> products.id |
| sku | VARCHAR(50) | unique per org |
| variant_name | VARCHAR(100) | e.g. 500ml, 1L |
| size_value | NUMERIC(10,3) | nullable |
| unit_id | UUID | FK -> units.id |
| barcode | VARCHAR(100) | nullable |
| mrp | NUMERIC(14,2) | |
| distributor_price | NUMERIC(14,2) | |
| default_retailer_price | NUMERIC(14,2) | |
| offer_price | NUMERIC(14,2) | nullable |
| weight_kg | NUMERIC(10,3) | nullable |
| volume_ltr | NUMERIC(10,3) | nullable |
| status | VARCHAR(20) | active, inactive |

### 4.4.8 `product_images`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| variant_id | UUID | FK -> product_variants.id |
| file_url | TEXT | |
| sort_order | INT | |
| is_primary | BOOLEAN | |

---

## 4.5 Pricing Engine

### 4.5.1 `price_books`
Flexible price structures.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| code | VARCHAR(30) | unique per org |
| name | VARCHAR(100) | |
| scope_type | VARCHAR(30) | default, area, retailer, wholesale, promo |
| priority | INT | lower number = higher priority or vice versa |
| valid_from | DATE | |
| valid_to | DATE | nullable |
| is_active | BOOLEAN | |

### 4.5.2 `price_book_assignments`
Assign a price book to retailers/areas/routes/categories.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| price_book_id | UUID | FK -> price_books.id |
| area_id | UUID | nullable FK -> areas.id |
| route_id | UUID | nullable FK -> routes.id |
| retailer_id | UUID | nullable FK -> retailers.id |
| retailer_category | VARCHAR(50) | nullable |
| valid_from | DATE | |
| valid_to | DATE | nullable |

### 4.5.3 `price_book_items`
Variant price within a price book.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| price_book_id | UUID | FK -> price_books.id |
| variant_id | UUID | FK -> product_variants.id |
| base_price | NUMERIC(14,2) | |
| offer_price | NUMERIC(14,2) | nullable |
| min_qty | NUMERIC(14,3) | nullable |
| max_qty | NUMERIC(14,3) | nullable |
| valid_from | TIMESTAMPTZ | |
| valid_to | TIMESTAMPTZ | nullable |

### 4.5.4 `promotions`
Promotional/festival/quantity discounts.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| code | VARCHAR(30) | unique per org |
| name | VARCHAR(150) | |
| promo_type | VARCHAR(30) | festival, quantity, time_based, offer |
| conditions_json | JSONB | define logic |
| benefits_json | JSONB | discount amount/percent/free item |
| valid_from | TIMESTAMPTZ | |
| valid_to | TIMESTAMPTZ | |
| is_active | BOOLEAN | |

---

## 4.6 Ordering, Cut-Off, Assisted Ordering, Demand Consolidation

### 4.6.1 `delivery_cycles`
Represents a delivery batch/cycle controlled by cut-off rules.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| cycle_code | VARCHAR(30) | unique per org |
| order_date | DATE | date when orders are being collected |
| delivery_date | DATE | planned delivery date |
| delivery_shift | VARCHAR(30) | morning, evening |
| cutoff_at | TIMESTAMPTZ | |
| status | VARCHAR(30) | open, closed, planned, dispatched, completed |

### 4.6.2 `sales_orders`
Retailer orders, whether self-created or admin-assisted.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| order_no | VARCHAR(30) | unique per org |
| retailer_id | UUID | FK -> retailers.id |
| route_id | UUID | nullable FK -> routes.id |
| delivery_cycle_id | UUID | FK -> delivery_cycles.id |
| order_date | TIMESTAMPTZ | |
| requested_delivery_date | DATE | nullable |
| source | VARCHAR(30) | retailer, admin, salesperson, import |
| ordering_mode_snapshot | VARCHAR(30) | self_service, assisted, hybrid |
| entered_by_user_id | UUID | FK -> users.id |
| entered_by_employee_id | UUID | nullable FK -> employees.id |
| status | VARCHAR(30) | draft, pending, approved, packed, dispatched, delivered, partial, cancelled |
| subtotal | NUMERIC(14,2) | |
| discount_total | NUMERIC(14,2) | |
| tax_total | NUMERIC(14,2) | |
| grand_total | NUMERIC(14,2) | |
| notes | TEXT | nullable |
| approved_by_user_id | UUID | nullable |
| approved_at | TIMESTAMPTZ | nullable |

### 4.6.3 `sales_order_items`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| sales_order_id | UUID | FK -> sales_orders.id |
| variant_id | UUID | FK -> product_variants.id |
| ordered_qty | NUMERIC(14,3) | |
| approved_qty | NUMERIC(14,3) | nullable |
| unit_price | NUMERIC(14,2) | |
| discount_amount | NUMERIC(14,2) | |
| tax_rate | NUMERIC(5,2) | |
| tax_amount | NUMERIC(14,2) | |
| line_total | NUMERIC(14,2) | |
| remarks | TEXT | nullable |

### 4.6.4 `sales_order_status_history`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| sales_order_id | UUID | FK -> sales_orders.id |
| old_status | VARCHAR(30) | |
| new_status | VARCHAR(30) | |
| changed_by_user_id | UUID | |
| changed_at | TIMESTAMPTZ | |
| note | TEXT | nullable |

### 4.6.5 `demand_consolidations`
Core daily demand summary run.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| consolidation_no | VARCHAR(30) | unique per org |
| delivery_cycle_id | UUID | FK -> delivery_cycles.id |
| consolidation_date | DATE | |
| status | VARCHAR(30) | draft, reviewed, approved, po_generated |
| notes | TEXT | nullable |
| created_by_user_id | UUID | |
| approved_by_user_id | UUID | nullable |
| approved_at | TIMESTAMPTZ | nullable |

### 4.6.6 `demand_consolidation_items`
Product-wise totals from all retailer orders.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| demand_consolidation_id | UUID | FK -> demand_consolidations.id |
| variant_id | UUID | FK -> product_variants.id |
| total_order_qty | NUMERIC(14,3) | |
| total_approved_qty | NUMERIC(14,3) | |
| buffer_qty | NUMERIC(14,3) | default 0 |
| final_procurement_qty | NUMERIC(14,3) | editable final qty |
| remarks | TEXT | nullable |

### 4.6.7 `demand_source_orders`
Snapshot of which orders were included in the consolidation.

| Column | Type | Notes |
|---|---|---|
| demand_consolidation_id | UUID | FK -> demand_consolidations.id |
| sales_order_id | UUID | FK -> sales_orders.id |

**Primary key:** `(demand_consolidation_id, sales_order_id)`

---

## 4.7 Procurement: PO, GRN, Purchase Invoice, Supplier Returns

### 4.7.1 `purchase_orders`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| po_no | VARCHAR(30) | unique per org |
| supplier_id | UUID | FK -> suppliers.id |
| demand_consolidation_id | UUID | nullable FK -> demand_consolidations.id |
| po_date | DATE | |
| expected_receipt_date | DATE | nullable |
| status | VARCHAR(30) | draft, approved, sent, partial, received, closed, cancelled |
| subtotal | NUMERIC(14,2) | |
| tax_total | NUMERIC(14,2) | |
| grand_total | NUMERIC(14,2) | |
| remarks | TEXT | nullable |
| approved_by_user_id | UUID | nullable |
| approved_at | TIMESTAMPTZ | nullable |

### 4.7.2 `purchase_order_items`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| purchase_order_id | UUID | FK -> purchase_orders.id |
| variant_id | UUID | FK -> product_variants.id |
| ordered_qty | NUMERIC(14,3) | |
| unit_cost | NUMERIC(14,2) | |
| tax_rate | NUMERIC(5,2) | |
| tax_amount | NUMERIC(14,2) | |
| line_total | NUMERIC(14,2) | |

### 4.7.3 `goods_receipts`
GRN header.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| grn_no | VARCHAR(30) | unique per org |
| supplier_id | UUID | FK -> suppliers.id |
| purchase_order_id | UUID | nullable FK -> purchase_orders.id |
| warehouse_id | UUID | FK -> warehouses.id |
| receipt_date | TIMESTAMPTZ | |
| supplier_challan_no | VARCHAR(50) | nullable |
| vehicle_no | VARCHAR(30) | nullable |
| status | VARCHAR(30) | draft, verified, approved, posted, cancelled |
| remarks | TEXT | nullable |
| received_by_employee_id | UUID | nullable FK -> employees.id |
| approved_by_user_id | UUID | nullable |
| approved_at | TIMESTAMPTZ | nullable |

### 4.7.4 `goods_receipt_items`
GRN line items with ordered vs received comparison.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| goods_receipt_id | UUID | FK -> goods_receipts.id |
| purchase_order_item_id | UUID | nullable FK -> purchase_order_items.id |
| variant_id | UUID | FK -> product_variants.id |
| ordered_qty | NUMERIC(14,3) | |
| received_qty | NUMERIC(14,3) | |
| accepted_qty | NUMERIC(14,3) | |
| rejected_qty | NUMERIC(14,3) | |
| excess_qty | NUMERIC(14,3) | |
| short_qty | NUMERIC(14,3) | |
| batch_no | VARCHAR(100) | |
| manufacturing_date | DATE | nullable |
| expiry_date | DATE | nullable |
| unit_cost | NUMERIC(14,2) | |
| remarks | TEXT | nullable |

### 4.7.5 `purchase_invoices`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| invoice_no | VARCHAR(50) | supplier invoice number |
| internal_voucher_no | VARCHAR(30) | unique per org optional |
| supplier_id | UUID | FK -> suppliers.id |
| goods_receipt_id | UUID | nullable FK -> goods_receipts.id |
| invoice_date | DATE | |
| due_date | DATE | nullable |
| taxable_amount | NUMERIC(14,2) | |
| tax_total | NUMERIC(14,2) | |
| grand_total | NUMERIC(14,2) | |
| status | VARCHAR(30) | draft, approved, posted, paid, cancelled |
| remarks | TEXT | nullable |
| journal_entry_id | UUID | nullable FK -> journal_entries.id |

### 4.7.6 `purchase_invoice_items`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| purchase_invoice_id | UUID | FK -> purchase_invoices.id |
| goods_receipt_item_id | UUID | nullable FK -> goods_receipt_items.id |
| variant_id | UUID | FK -> product_variants.id |
| billed_qty | NUMERIC(14,3) | |
| unit_cost | NUMERIC(14,2) | |
| tax_rate | NUMERIC(5,2) | |
| tax_amount | NUMERIC(14,2) | |
| line_total | NUMERIC(14,2) | |

### 4.7.7 `supplier_returns`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| supplier_return_no | VARCHAR(30) | unique per org |
| supplier_id | UUID | FK -> suppliers.id |
| goods_receipt_id | UUID | nullable FK -> goods_receipts.id |
| return_date | DATE | |
| reason | VARCHAR(100) | damaged, expired, wrong_supply, excess |
| status | VARCHAR(30) | draft, approved, dispatched, settled |
| debit_note_no | VARCHAR(30) | nullable |
| remarks | TEXT | nullable |

### 4.7.8 `supplier_return_items`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| supplier_return_id | UUID | FK -> supplier_returns.id |
| inventory_batch_id | UUID | nullable FK -> inventory_batches.id |
| variant_id | UUID | FK -> product_variants.id |
| return_qty | NUMERIC(14,3) | |
| unit_cost | NUMERIC(14,2) | |
| reason | VARCHAR(100) | |

---

## 4.8 Inventory and Batch Control

### 4.8.1 `warehouses`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| code | VARCHAR(30) | unique per org |
| name | VARCHAR(100) | |
| warehouse_type | VARCHAR(30) | main, transit, returns |
| address_json | JSONB | nullable |
| is_active | BOOLEAN | |

### 4.8.2 `inventory_batches`
Main batch-wise stock table.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| variant_id | UUID | FK -> product_variants.id |
| warehouse_id | UUID | FK -> warehouses.id |
| goods_receipt_item_id | UUID | nullable FK -> goods_receipt_items.id |
| batch_no | VARCHAR(100) | |
| manufacturing_date | DATE | nullable |
| expiry_date | DATE | nullable |
| received_qty | NUMERIC(14,3) | |
| available_qty | NUMERIC(14,3) | |
| reserved_qty | NUMERIC(14,3) | |
| damaged_qty | NUMERIC(14,3) | |
| status | VARCHAR(30) | active, blocked, expired, consumed |

### 4.8.3 `stock_movements`
Single source of truth for stock movement.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| movement_no | VARCHAR(30) | unique per org optional |
| warehouse_id | UUID | FK -> warehouses.id |
| variant_id | UUID | FK -> product_variants.id |
| inventory_batch_id | UUID | nullable FK -> inventory_batches.id |
| movement_type | VARCHAR(50) | grn_in, dispatch_out, return_in, damage_out, supplier_return_out, adjustment_in, adjustment_out |
| reference_type | VARCHAR(50) | grn, trip, return, adjustment |
| reference_id | UUID | |
| qty_in | NUMERIC(14,3) | default 0 |
| qty_out | NUMERIC(14,3) | default 0 |
| unit_cost | NUMERIC(14,2) | nullable |
| movement_at | TIMESTAMPTZ | |
| remarks | TEXT | nullable |

### 4.8.4 `stock_adjustments`
Physical/system reconciliation header.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| adjustment_no | VARCHAR(30) | unique per org |
| warehouse_id | UUID | FK -> warehouses.id |
| adjustment_date | DATE | |
| reason | VARCHAR(100) | physical_count, damage, manual_correction |
| status | VARCHAR(30) | draft, approved, posted |
| approved_by_user_id | UUID | nullable |
| remarks | TEXT | nullable |

### 4.8.5 `stock_adjustment_items`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| stock_adjustment_id | UUID | FK -> stock_adjustments.id |
| variant_id | UUID | FK -> product_variants.id |
| inventory_batch_id | UUID | nullable FK -> inventory_batches.id |
| system_qty | NUMERIC(14,3) | |
| physical_qty | NUMERIC(14,3) | |
| diff_qty | NUMERIC(14,3) | |
| unit_cost | NUMERIC(14,2) | nullable |
| remarks | TEXT | nullable |

---

## 4.9 Dispatch, Loading, Challan, Delivery, Reconciliation

### 4.9.1 `dispatch_trips`
Route-wise delivery trip.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| trip_no | VARCHAR(30) | unique per org |
| delivery_cycle_id | UUID | FK -> delivery_cycles.id |
| route_id | UUID | FK -> routes.id |
| vehicle_id | UUID | nullable FK -> vehicles.id |
| driver_employee_id | UUID | nullable FK -> employees.id |
| helper_employee_id | UUID | nullable FK -> employees.id |
| dispatch_date | DATE | |
| planned_start_at | TIMESTAMPTZ | nullable |
| actual_start_at | TIMESTAMPTZ | nullable |
| actual_end_at | TIMESTAMPTZ | nullable |
| status | VARCHAR(30) | planned, loaded, dispatched, in_transit, completed, reconciled, cancelled |
| loading_sheet_no | VARCHAR(30) | nullable |
| challan_no | VARCHAR(30) | nullable |
| total_stops | INT | default 0 |
| total_crates_loaded | INT | default 0 |
| notes | TEXT | nullable |

### 4.9.2 `dispatch_trip_items`
Total product loaded into a trip.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| dispatch_trip_id | UUID | FK -> dispatch_trips.id |
| variant_id | UUID | FK -> product_variants.id |
| planned_qty | NUMERIC(14,3) | |
| loaded_qty | NUMERIC(14,3) | |
| source_warehouse_id | UUID | FK -> warehouses.id |
| inventory_batch_id | UUID | nullable FK -> inventory_batches.id |

### 4.9.3 `delivery_challans`
Delivery/dispatch document header.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| challan_no | VARCHAR(30) | unique per org |
| dispatch_trip_id | UUID | FK -> dispatch_trips.id |
| issue_date | DATE | |
| status | VARCHAR(30) | generated, printed, dispatched, closed |
| pdf_url | TEXT | nullable |

### 4.9.4 `delivery_stops`
Each retailer stop in a trip.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| dispatch_trip_id | UUID | FK -> dispatch_trips.id |
| retailer_id | UUID | FK -> retailers.id |
| sales_order_id | UUID | nullable FK -> sales_orders.id |
| stop_sequence | INT | |
| planned_arrival_at | TIMESTAMPTZ | nullable |
| actual_arrival_at | TIMESTAMPTZ | nullable |
| actual_departure_at | TIMESTAMPTZ | nullable |
| status | VARCHAR(30) | pending, delivered, partial, refused, failed |
| failure_reason | VARCHAR(100) | nullable |
| crates_issued | INT | default 0 |
| empty_crates_received | INT | default 0 |
| notes | TEXT | nullable |

### 4.9.5 `delivery_stop_items`
Actual item-level delivery outcome.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| delivery_stop_id | UUID | FK -> delivery_stops.id |
| sales_order_item_id | UUID | nullable FK -> sales_order_items.id |
| variant_id | UUID | FK -> product_variants.id |
| ordered_qty | NUMERIC(14,3) | |
| loaded_qty | NUMERIC(14,3) | |
| delivered_qty | NUMERIC(14,3) | |
| returned_qty | NUMERIC(14,3) | default 0 |
| damaged_qty | NUMERIC(14,3) | default 0 |
| refused_qty | NUMERIC(14,3) | default 0 |
| unit_price | NUMERIC(14,2) | |
| tax_amount | NUMERIC(14,2) | |
| line_total | NUMERIC(14,2) | |

### 4.9.6 `trip_reconciliations`
Close and reconcile trip quantities, cash, crates.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| dispatch_trip_id | UUID | FK -> dispatch_trips.id |
| reconciled_by_user_id | UUID | FK -> users.id |
| loaded_qty_total | NUMERIC(14,3) | |
| delivered_qty_total | NUMERIC(14,3) | |
| returned_qty_total | NUMERIC(14,3) | |
| damaged_qty_total | NUMERIC(14,3) | |
| missing_qty_total | NUMERIC(14,3) | |
| cash_collected_total | NUMERIC(14,2) | |
| crates_variance | INT | |
| closed_at | TIMESTAMPTZ | |
| notes | TEXT | nullable |

---

## 4.10 Crates and Packaging Tracking

### 4.10.1 `crate_transactions`
Tracks issue, return, missing, damaged crates.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| crate_type_id | UUID | FK -> crate_types.id |
| retailer_id | UUID | nullable FK -> retailers.id |
| dispatch_trip_id | UUID | nullable FK -> dispatch_trips.id |
| delivery_stop_id | UUID | nullable FK -> delivery_stops.id |
| transaction_type | VARCHAR(30) | issue, return, damage, missing, adjustment |
| quantity | INT | |
| transaction_date | TIMESTAMPTZ | |
| reference_type | VARCHAR(50) | stop, trip, manual_adjustment |
| reference_id | UUID | nullable |
| remarks | TEXT | nullable |

### 4.10.2 `crate_balance_snapshots`
Optional but useful for fast reports.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| balance_date | DATE | |
| retailer_id | UUID | FK -> retailers.id |
| crate_type_id | UUID | FK -> crate_types.id |
| opening_qty | INT | |
| issued_qty | INT | |
| returned_qty | INT | |
| damaged_qty | INT | |
| missing_qty | INT | |
| closing_qty | INT | |

---

## 4.11 Sales Billing, Retailer Visibility, Collections

### 4.11.1 `sales_invoices`
Invoice header. Can be generated automatically or by admin on behalf of retailer.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| invoice_no | VARCHAR(30) | unique per org |
| retailer_id | UUID | FK -> retailers.id |
| sales_order_id | UUID | nullable FK -> sales_orders.id |
| dispatch_trip_id | UUID | nullable FK -> dispatch_trips.id |
| invoice_date | DATE | |
| due_date | DATE | nullable |
| source | VARCHAR(30) | auto_delivery, admin_manual, assisted_billing |
| created_by_user_id | UUID | FK -> users.id |
| status | VARCHAR(30) | draft, posted, partial_paid, paid, cancelled |
| subtotal | NUMERIC(14,2) | |
| discount_total | NUMERIC(14,2) | |
| tax_total | NUMERIC(14,2) | |
| grand_total | NUMERIC(14,2) | |
| outstanding_amount | NUMERIC(14,2) | |
| pdf_url | TEXT | nullable |
| remarks | TEXT | nullable |
| journal_entry_id | UUID | nullable FK -> journal_entries.id |

### 4.11.2 `sales_invoice_items`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| sales_invoice_id | UUID | FK -> sales_invoices.id |
| delivery_stop_item_id | UUID | nullable FK -> delivery_stop_items.id |
| variant_id | UUID | FK -> product_variants.id |
| billed_qty | NUMERIC(14,3) | |
| unit_price | NUMERIC(14,2) | |
| discount_amount | NUMERIC(14,2) | |
| tax_rate | NUMERIC(5,2) | |
| tax_amount | NUMERIC(14,2) | |
| line_total | NUMERIC(14,2) | |

### 4.11.3 `payment_receipts`
Collections from retailers or payments to suppliers if you use one payments table.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| receipt_no | VARCHAR(30) | unique per org |
| party_type | VARCHAR(20) | retailer, supplier |
| party_id | UUID | retailer/supplier id |
| payment_direction | VARCHAR(20) | inbound, outbound |
| payment_mode | VARCHAR(20) | cash, upi, bank, cheque |
| payment_date | TIMESTAMPTZ | |
| amount | NUMERIC(14,2) | |
| collected_by_user_id | UUID | nullable |
| collected_by_employee_id | UUID | nullable |
| dispatch_trip_id | UUID | nullable FK -> dispatch_trips.id |
| bank_account_id | UUID | nullable FK -> bank_accounts.id |
| cash_register_id | UUID | nullable FK -> cash_registers.id |
| reference_no | VARCHAR(100) | nullable |
| status | VARCHAR(20) | draft, confirmed, cancelled |
| remarks | TEXT | nullable |
| journal_entry_id | UUID | nullable FK -> journal_entries.id |

### 4.11.4 `payment_allocations`
Links payments to invoices.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| payment_receipt_id | UUID | FK -> payment_receipts.id |
| sales_invoice_id | UUID | nullable FK -> sales_invoices.id |
| purchase_invoice_id | UUID | nullable FK -> purchase_invoices.id |
| allocated_amount | NUMERIC(14,2) | |
| allocation_date | DATE | |

### 4.11.5 `credit_notes`
For sales returns / pricing corrections / adjustments.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| credit_note_no | VARCHAR(30) | unique per org |
| party_type | VARCHAR(20) | retailer, supplier |
| party_id | UUID | |
| related_return_id | UUID | nullable |
| note_date | DATE | |
| amount | NUMERIC(14,2) | |
| tax_amount | NUMERIC(14,2) | |
| status | VARCHAR(20) | draft, posted, cancelled |
| journal_entry_id | UUID | nullable FK -> journal_entries.id |
| remarks | TEXT | nullable |

**Retailer visibility rule:**
Any invoice or order created by admin must still reference the same `retailer_id`, so the retailer dashboard can show:
- order history
- invoice history
- dues
- collections
- statement

---

## 4.12 Returns and Claims

### 4.12.1 `sales_returns`
Retailer-side returns.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| return_no | VARCHAR(30) | unique per org |
| retailer_id | UUID | FK -> retailers.id |
| sales_invoice_id | UUID | nullable FK -> sales_invoices.id |
| dispatch_trip_id | UUID | nullable FK -> dispatch_trips.id |
| return_type | VARCHAR(30) | damaged, expired, wrong_product, leakage, refused |
| return_date | DATE | |
| source | VARCHAR(30) | retailer, staff, admin |
| status | VARCHAR(30) | requested, approved, rejected, received, settled |
| approved_by_user_id | UUID | nullable |
| remarks | TEXT | nullable |

### 4.12.2 `sales_return_items`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| sales_return_id | UUID | FK -> sales_returns.id |
| variant_id | UUID | FK -> product_variants.id |
| inventory_batch_id | UUID | nullable FK -> inventory_batches.id |
| return_qty | NUMERIC(14,3) | |
| reason | VARCHAR(100) | |
| disposition | VARCHAR(30) | restock, damage, supplier_return, discard |
| credit_amount | NUMERIC(14,2) | default 0 |

### 4.12.3 `claims`
Claims against supplier or internal adjustments.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| claim_no | VARCHAR(30) | unique per org |
| party_type | VARCHAR(20) | supplier, retailer, internal |
| party_id | UUID | nullable |
| related_return_id | UUID | nullable FK -> sales_returns.id |
| claim_type | VARCHAR(30) | damage, shortage, expiry, financial |
| claim_amount | NUMERIC(14,2) | |
| status | VARCHAR(30) | open, approved, rejected, settled |
| resolution_notes | TEXT | nullable |

---

## 4.13 Accounting Module

### 4.13.1 `accounts`
Chart of accounts.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| account_code | VARCHAR(30) | unique per org |
| account_name | VARCHAR(150) | |
| account_type | VARCHAR(30) | asset, liability, income, expense, equity |
| parent_account_id | UUID | nullable self FK |
| is_control_account | BOOLEAN | |
| is_active | BOOLEAN | |

### 4.13.2 `journal_entries`
Voucher header.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| voucher_no | VARCHAR(30) | unique per org |
| voucher_type | VARCHAR(30) | sales, purchase, receipt, payment, journal, contra, credit_note |
| entry_date | DATE | |
| posting_date | DATE | |
| reference_type | VARCHAR(50) | sales_invoice, purchase_invoice, payment_receipt |
| reference_id | UUID | nullable |
| narration | TEXT | nullable |
| status | VARCHAR(20) | draft, posted, reversed |
| posted_by_user_id | UUID | nullable |

### 4.13.3 `journal_lines`
Double-entry accounting lines.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| journal_entry_id | UUID | FK -> journal_entries.id |
| account_id | UUID | FK -> accounts.id |
| retailer_id | UUID | nullable FK -> retailers.id |
| supplier_id | UUID | nullable FK -> suppliers.id |
| route_id | UUID | nullable FK -> routes.id |
| debit_amount | NUMERIC(14,2) | |
| credit_amount | NUMERIC(14,2) | |
| line_narration | TEXT | nullable |

### 4.13.4 `bank_accounts`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| bank_name | VARCHAR(100) | |
| branch_name | VARCHAR(100) | nullable |
| account_no_masked | VARCHAR(50) | |
| ifsc_code | VARCHAR(20) | |
| account_id | UUID | FK -> accounts.id |
| is_default | BOOLEAN | |
| is_active | BOOLEAN | |

### 4.13.5 `cash_registers`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| name | VARCHAR(100) | main cash, route cash |
| account_id | UUID | FK -> accounts.id |
| responsible_user_id | UUID | nullable |
| is_active | BOOLEAN | |

### 4.13.6 `expense_categories`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| code | VARCHAR(30) | unique per org |
| name | VARCHAR(100) | |
| account_id | UUID | FK -> accounts.id |
| is_active | BOOLEAN | |

### 4.13.7 `expense_entries`
Operational expense entry table.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| voucher_no | VARCHAR(30) | unique per org |
| expense_date | DATE | |
| expense_category_id | UUID | FK -> expense_categories.id |
| supplier_id | UUID | nullable FK -> suppliers.id |
| amount | NUMERIC(14,2) | |
| tax_amount | NUMERIC(14,2) | default 0 |
| payment_mode | VARCHAR(20) | cash, bank, upi |
| paid_from_account_id | UUID | nullable FK -> accounts.id |
| description | TEXT | nullable |
| journal_entry_id | UUID | nullable FK -> journal_entries.id |

### 4.13.8 `day_closings`
End-of-day reconciliation.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| closing_date | DATE | |
| cash_register_id | UUID | nullable FK -> cash_registers.id |
| opened_by_user_id | UUID | nullable |
| closed_by_user_id | UUID | nullable |
| opening_balance | NUMERIC(14,2) | |
| cash_received | NUMERIC(14,2) | |
| cash_paid | NUMERIC(14,2) | |
| expected_closing | NUMERIC(14,2) | |
| actual_closing | NUMERIC(14,2) | |
| variance_amount | NUMERIC(14,2) | |
| notes | TEXT | nullable |

---

## 4.14 Notifications, Files, Offline Sync, AI Extensions

### 4.14.1 `notification_templates`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| channel | VARCHAR(20) | sms, whatsapp, email, in_app |
| event_key | VARCHAR(50) | order_confirmed, low_stock |
| language_code | VARCHAR(10) | en, hi |
| template_text | TEXT | |
| is_active | BOOLEAN | |

### 4.14.2 `notification_logs`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| template_id | UUID | nullable FK -> notification_templates.id |
| channel | VARCHAR(20) | |
| event_key | VARCHAR(50) | |
| recipient_user_id | UUID | nullable |
| recipient_mobile | VARCHAR(20) | nullable |
| reference_type | VARCHAR(50) | order, invoice, payment |
| reference_id | UUID | nullable |
| payload_json | JSONB | |
| provider_message_id | VARCHAR(100) | nullable |
| status | VARCHAR(20) | queued, sent, failed |
| sent_at | TIMESTAMPTZ | nullable |

### 4.14.3 `file_attachments`
Generic file attachment table.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| entity_type | VARCHAR(50) | retailer, grn, invoice, return |
| entity_id | UUID | |
| file_name | VARCHAR(255) | |
| file_url | TEXT | |
| mime_type | VARCHAR(100) | |
| meta_json | JSONB | nullable |

### 4.14.4 `sync_events`
For offline sync tracking and conflict handling.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| user_id | UUID | FK -> users.id |
| device_id | VARCHAR(100) | |
| entity_type | VARCHAR(50) | order, delivery_stop, payment |
| entity_id | UUID | nullable |
| action | VARCHAR(30) | create, update |
| payload_json | JSONB | |
| client_timestamp | TIMESTAMPTZ | |
| server_timestamp | TIMESTAMPTZ | nullable |
| sync_status | VARCHAR(20) | pending, applied, conflict, failed |
| conflict_notes | TEXT | nullable |

### 4.14.5 `forecast_runs`
AI demand/sales forecast batch.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| forecast_type | VARCHAR(30) | demand, sales, inventory |
| run_date | DATE | |
| model_version | VARCHAR(50) | |
| input_period_from | DATE | |
| input_period_to | DATE | |
| status | VARCHAR(20) | queued, completed, failed |
| output_json | JSONB | summary output |

### 4.14.6 `forecast_items`
Forecast by SKU / route / retailer.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | |
| forecast_run_id | UUID | FK -> forecast_runs.id |
| variant_id | UUID | FK -> product_variants.id |
| route_id | UUID | nullable FK -> routes.id |
| retailer_id | UUID | nullable FK -> retailers.id |
| predicted_qty | NUMERIC(14,3) | |
| confidence_score | NUMERIC(5,2) | nullable |
| recommended_purchase_qty | NUMERIC(14,3) | nullable |

---

# 5. Key Relationships

## 5.1 Retailer-assisted flow
- `retailers.ordering_mode` decides self-service vs assisted vs hybrid.
- `sales_orders.source` stores who created the order.
- `sales_orders.entered_by_user_id` tracks the actual creator.
- `sales_invoices.source` tracks admin-manual or assisted billing.
- retailer dashboard queries by `retailer_id`, not by order creator.

## 5.2 Daily demand consolidation flow
- one `delivery_cycle` has many `sales_orders`
- one `demand_consolidation` belongs to one `delivery_cycle`
- one `demand_consolidation` has many `demand_consolidation_items`
- one `purchase_order` can be generated from one `demand_consolidation`

## 5.3 Procurement to stock flow
- `purchase_orders` -> `goods_receipts`
- `goods_receipt_items` create `inventory_batches`
- `stock_movements` record every stock in/out event

## 5.4 Delivery flow
- one `dispatch_trip` belongs to a route + vehicle + driver
- one `dispatch_trip` has many `delivery_stops`
- one `delivery_stop` can link to one `sales_order`
- one `sales_invoice` can be generated from `sales_order` and/or delivered quantities

## 5.5 Finance flow
- sales invoice posts to `journal_entries`
- purchase invoice posts to `journal_entries`
- payment receipt posts to `journal_entries`
- `payment_allocations` reduce invoice outstanding

---

# 6. Business Rules to Enforce at Database/Service Layer

## 6.1 Order rules
- only active retailers can place or receive orders
- order must belong to a valid `delivery_cycle`
- if order is created by admin, `retailer_id` must still be mandatory
- cut-off enforcement should assign the correct cycle automatically
- once a demand consolidation is approved, included orders should be locked from silent mutation

## 6.2 Procurement rules
- GRN can be created only for approved/open PO unless allowed by override
- inventory must update only after GRN approval/posting
- batch number is mandatory for batch-tracked variants
- expiry date mandatory for expiry-tracked variants

## 6.3 Inventory rules
- no stock out below available quantity unless authorized override exists
- `available_qty` in `inventory_batches` must reconcile with `stock_movements`
- every adjustment must create stock movement rows

## 6.4 Delivery rules
- `loaded_qty >= delivered_qty + returned_qty + damaged_qty + refused_qty`
- trip cannot be reconciled until all stops are closed or marked failed/refused

## 6.5 Crate rules
- crate issue/return should be transaction-based
- retailer crate balance is derived from cumulative crate transactions or daily snapshot

## 6.6 Finance rules
- every posted invoice/payment/credit note should create journal entry rows
- journal entry total debits must equal total credits
- invoice outstanding must equal invoice amount minus allocations and credits

---

# 7. Recommended Indexes

## 7.1 High-priority indexes
Create indexes on at least these columns:

### Orders
- `sales_orders (organization_id, retailer_id, order_date DESC)`
- `sales_orders (organization_id, delivery_cycle_id, status)`
- `sales_orders (organization_id, source)`
- `sales_order_items (sales_order_id, variant_id)`

### Demand consolidation
- `demand_consolidation_items (demand_consolidation_id, variant_id)`

### Procurement
- `purchase_orders (organization_id, supplier_id, po_date DESC)`
- `goods_receipts (organization_id, purchase_order_id)`
- `goods_receipt_items (goods_receipt_id, variant_id)`

### Inventory
- `inventory_batches (organization_id, variant_id, expiry_date)`
- `inventory_batches (organization_id, warehouse_id, batch_no)`
- `stock_movements (organization_id, variant_id, movement_at DESC)`

### Delivery
- `dispatch_trips (organization_id, dispatch_date DESC, route_id)`
- `delivery_stops (dispatch_trip_id, stop_sequence)`
- `delivery_stops (organization_id, retailer_id, status)`

### Billing and collections
- `sales_invoices (organization_id, retailer_id, invoice_date DESC)`
- `payment_receipts (organization_id, party_type, party_id, payment_date DESC)`
- `payment_allocations (payment_receipt_id, sales_invoice_id)`

### Accounting
- `journal_entries (organization_id, posting_date DESC)`
- `journal_lines (organization_id, account_id)`
- `journal_lines (organization_id, retailer_id)`
- `journal_lines (organization_id, supplier_id)`

### Retailer and product search
- `retailers (organization_id, retailer_code)`
- `retailers (organization_id, shop_name)`
- `product_variants (organization_id, sku)`
- `product_variants (organization_id, barcode)`

---

# 8. Recommended Views / Materialized Views

These are not mandatory on day 1, but very useful.

### 8.1 `vw_retailer_outstanding`
Shows:
- invoice total
- paid amount
- credit note amount
- outstanding balance

### 8.2 `vw_stock_on_hand`
Shows:
- variant-wise stock by warehouse
- batch-wise available stock
- near-expiry stock

### 8.3 `vw_daily_demand_summary`
Shows:
- cycle-wise product demand
- area-wise demand
- route-wise demand

### 8.4 `vw_crate_balance`
Shows:
- retailer-wise crate balance
- route-wise crate movement
- damaged/missing crates

### 8.5 `vw_delivery_performance`
Shows:
- planned stops
- delivered stops
- failed stops
- partials
- on-time delivery %

### 8.6 `vw_profit_summary`
Based on:
- sales invoice values
- purchase cost / stock issue cost
- direct expenses

---

# 9. Suggested Entity Implementation Order

To build this safely, create schema in this order:

## Phase 1 — Core identity and masters
1. organizations
2. users / roles / permissions
3. areas / routes / employees / vehicles
4. suppliers / retailers
5. product, variants, units, tax, crate types

## Phase 2 — Ordering and demand engine
6. delivery_cycles
7. sales_orders / sales_order_items / status history
8. demand_consolidations / demand_consolidation_items

## Phase 3 — Procurement and stock
9. purchase_orders / purchase_order_items
10. warehouses
11. goods_receipts / goods_receipt_items
12. inventory_batches / stock_movements / adjustments

## Phase 4 — Dispatch and delivery
13. dispatch_trips / dispatch_trip_items
14. delivery_challans
15. delivery_stops / delivery_stop_items
16. crate_transactions / reconciliation

## Phase 5 — Billing and finance
17. sales_invoices / sales_invoice_items
18. payment_receipts / allocations / credit_notes
19. accounts / journal_entries / journal_lines / expenses / day_closing

## Phase 6 — Extensions
20. notifications / attachments / sync / AI tables

---

# 10. Final Recommended Notes

## 10.1 Best technical choices
For your ERP, I recommend:
- **PostgreSQL** as the main database
- **Prisma ORM** if using Node.js/Next.js/NestJS
- strong foreign keys for transactional integrity
- soft delete only where business-safe
- journal/accounting tables as append-first wherever possible

## 10.2 Important design choice for your business
Because many retailers may not use the software directly:
- the schema must always treat retailer as the core business account
- admin-created orders and invoices must still reference the same retailer record
- dashboards, invoices, outstanding, and history should always be queryable from that single retailer account

## 10.3 Most critical module in schema
The most important operational tables for your business are:
- `sales_orders`
- `sales_order_items`
- `delivery_cycles`
- `demand_consolidations`
- `demand_consolidation_items`
- `purchase_orders`
- `goods_receipts`
- `inventory_batches`
- `dispatch_trips`
- `delivery_stops`
- `sales_invoices`
- `payment_receipts`

These power the daily distributor workflow.

---

# 11. Recommended Next Step
After this schema, the next best deliverable is one of these:

1. **Prisma schema model file**
2. **API endpoint blueprint**
3. **module-wise wireframe/screens**
4. **actual backend project setup**
