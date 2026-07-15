# Sudha Dairy Distributor App — Detailed Features List

## 1. Product Goal
Build a **mobile-first full-stack B2B web application** for your Sudha dairy distribution business so that:
- **retailers** can place and track orders
- **staff** can manage deliveries and collections
- **admin** can control products, pricing, stock, payments, and reports

This document expands the plan into a **detailed features list** for product design and development.

---

## 2. User Roles

### 2.1 Admin / Owner
Main business controller.

**Responsibilities**
- manage retailers
- manage staff
- manage products and pricing
- approve/monitor orders
- assign deliveries
- track inventory
- manage collections and dues
- review reports and performance

### 2.2 Staff / Delivery Agent / Sales Staff
Field operations user.

**Responsibilities**
- view assigned route
- view retailer orders
- deliver products
- mark delivery status
- record collections
- report returns, shortages, and issues

### 2.3 Retailer / Shop User
Customer-facing business user.

**Responsibilities**
- place daily order
- reorder previous items
- view invoices
- check outstanding dues
- view order history
- report delivery/payment issues

---

## 3. Feature Prioritization Labels
To make planning easier, features are grouped by priority.

- **P0 = Must-have for launch**
- **P1 = Strong V1 feature**
- **P2 = Future enhancement**

---

# 4. Detailed Features by Module

## 4.1 Authentication & Access Control

### 4.1.1 Login system — P0
**Users:** admin, staff, retailer

**Features**
- login with mobile number + password or OTP
- separate roles under same system
- secure session handling
- logout from device
- forgot password / reset password
- optional device/session timeout

**Important fields**
- mobile number
- password / OTP
- role

**Business rules**
- only active users can log in
- role decides dashboard and permissions
- first login may require password change

### 4.1.2 Role-based access control — P0
**Features**
- admin sees all modules
- staff sees only assigned route/delivery and collection tools
- retailer sees only own orders, invoices, dues, profile
- optional sub-admin roles later

### 4.1.3 User management — P1
**Features**
- admin can create user accounts
- activate/deactivate user
- reset user password
- link staff to delivery zones
- link retailer login to retailer profile

---

## 4.2 Retailer App / Portal

## 4.2.1 Retailer dashboard — P0
**Purpose:** quick overview for the shop owner.

**Widgets**
- today’s order status
- next delivery summary
- current outstanding balance
- recent invoices
- quick reorder button
- support/contact info

**Actions**
- place new order
- repeat last order
- view dues
- contact distributor

## 4.2.2 Product catalog — P0
**Purpose:** browse available items.

**Features**
- product list with image/name/pack size
- show item category
- show current price
- show available / unavailable status
- search product by name
- filter by category

**Product examples**
- milk packet variants
- curd
- paneer
- lassi
- ghee
- sweets / seasonal items

## 4.2.3 Place order — P0
**Purpose:** retailer can place order for next dispatch cycle.

**Features**
- add quantity for multiple items
- update quantities before submit
- see running order total
- choose required delivery date/slot if allowed
- add order notes
- submit order
- receive order confirmation

**Fields**
- retailer name auto-filled
- delivery date
- item name
- quantity
- special notes

**Business rules**
- order allowed only before cutoff time
- unavailable products cannot be ordered
- quantity must be positive whole number
- credit-blocked retailers may be restricted if dues exceed limit

## 4.2.4 Quick reorder / repeat previous order — P0
**Features**
- repeat yesterday’s order
- repeat last successful order
- edit quantity before confirmation
- save common order template later

## 4.2.5 Order history — P0
**Features**
- list all previous orders
- filter by date/status
- view order details
- see delivered quantity vs ordered quantity
- show invoice/payment linkage

**Statuses**
- pending
- confirmed
- packed
- dispatched
- delivered
- partially delivered
- cancelled

## 4.2.6 Order detail page — P1
**Features**
- item-wise quantity ordered
- item-wise quantity delivered
- invoice number
- delivery date/time
- delivery notes
- staff/route details if needed

## 4.2.7 Invoices & dues — P0
**Features**
- retailer can view invoice list
- see paid/unpaid/partially paid status
- view total outstanding amount
- see payment history
- downloadable invoice PDF later

## 4.2.8 Ledger / account statement — P1
**Features**
- running balance view
- debit/credit entries
- invoice entries
- payment entries
- opening balance
- date-wise statement view

## 4.2.9 Notifications — P1
**Retailer receives**
- order submitted
- order confirmed
- dispatched
- delivered
- payment received
- outstanding reminder

**Channels**
- in-app
- SMS
- WhatsApp later

## 4.2.10 Support / issue reporting — P1
**Features**
- report shortage
- report damaged product
- report wrong invoice
- report missed delivery
- submit support message
- track issue status

## 4.2.11 Profile & shop information — P1
**Features**
- view business name
- view shop address
- view area/route
- contact number
- GST/business details if applicable
- request profile update

---

## 4.3 Staff App / Delivery Module

## 4.3.1 Staff dashboard — P0
**Widgets**
- today’s assigned route
- total delivery stops
- pending stops
- completed stops
- cash collected today
- issue alerts

## 4.3.2 Route / trip list — P0
**Features**
- view assigned route(s)
- route date
- number of retailers on route
- total product quantity on route
- trip status
- sort by stop order

## 4.3.3 Delivery stop details — P0
**Features**
- retailer name
- address
- phone number
- ordered items
- expected quantity
- previous balance summary
- remarks from admin

**Actions**
- call retailer
- open map location later
- mark delivery status

## 4.3.4 Delivery status update — P0
**Features**
- mark delivered
- mark partial delivery
- mark failed delivery
- capture reason
- save delivery notes

**Reason options**
- shop closed
- stock unavailable
- partial stock supplied
- retailer unavailable
- payment issue
- other

## 4.3.5 Quantity delivered entry — P0
**Features**
- enter actual delivered quantity item-wise
- auto-calculate short supply
- compare with order quantity

## 4.3.6 Cash / payment collection entry — P0
**Features**
- record amount collected during delivery
- select payment mode
- tag against invoice or running ledger
- add receipt/reference number
- record partial payment

**Payment modes**
- cash
- UPI
- bank transfer
- other

## 4.3.7 Returns / damage / shortage reporting — P0
**Features**
- mark returned quantity
- mark damaged quantity
- mark leakage/spoilage
- enter reason and notes
- send report to admin

## 4.3.8 Collection summary — P1
**Features**
- show today’s total cash collected
- pending collection by shop
- mismatch alerts
- end-of-day submission summary

## 4.3.9 Proof of delivery — P1
**Features**
- capture signature
- capture photo proof
- capture retailer name confirming receipt

## 4.3.10 Offline-friendly delivery update — P2
**Features**
- save updates when network is poor
- auto-sync when internet returns

---

## 4.4 Admin Dashboard

## 4.4.1 Admin home dashboard — P0
**Widgets**
- today’s order count
- today’s dispatch quantity
- pending deliveries
- total collections today
- outstanding dues
- low stock alerts
- top retailers by order value
- route performance summary

## 4.4.2 Retailer management — P0
**Features**
- add retailer profile
- edit retailer details
- activate/deactivate retailer
- assign route/area
- assign pricing category
- set credit limit
- set payment terms
- set order cutoff rules if needed
- enable self-order mode or assisted order/invoice mode per retailer

**Retailer master fields**
- retailer code
- shop name
- owner name
- mobile number
- alternate phone
- address
- locality/route
- GST number if required
- payment type
- credit limit
- opening balance
- status

## 4.4.3 Staff management — P0
**Features**
- add staff profile
- assign role
- assign route or service area
- activate/deactivate staff
- view staff performance

**Staff fields**
- employee code
- name
- phone
- role
- route assigned
- status

## 4.4.4 Product management — P0
**Features**
- add product
- edit product
- set category
- set pack size/unit
- set selling price
- set active/inactive status
- set stock visibility

**Product fields**
- SKU / item code
- product name
- category
- size/unit
- selling price
- cost price optional
- tax rate optional
- status

## 4.4.5 Pricing management — P1
**Features**
- area-wise or retailer-wise price list
- bulk pricing rules
- temporary price changes
- effective date for pricing

## 4.4.6 Order management — P0
**Features**
- view all incoming orders
- search by retailer/date/status
- edit order if needed
- confirm order
- cancel order
- create manual order for phone orders
- view item-wise demand totals

**Admin actions**
- approve
- modify quantity
- hold order
- mark packed
- assign to dispatch

## 4.4.7 Dispatch planning — P0
**Features**
- group orders by route/area
- create dispatch sheet
- assign to staff
- view route-wise quantity requirement
- print/export dispatch summary

## 4.4.8 Delivery monitoring — P0
**Features**
- track delivery progress live by route
- see delivered / pending / failed stops
- view reasons for failure
- intervene on urgent issues

## 4.4.9 Inventory / stock management — P0
**Features**
- opening stock entry
- stock received from company/depot
- stock dispatched for delivery
- stock adjustment
- returned stock entry
- damaged/expired stock entry
- balance stock view

**Stock views**
- current stock by product
- route dispatched stock
- available stock before dispatch
- stock movement history

## 4.4.10 Payment management — P0
**Features**
- record payment manually
- view collection history
- reconcile staff-collected payments
- track unpaid invoices
- adjust payment entries if authorized

## 4.4.11 Ledger & dues management — P0
**Features**
- retailer outstanding balance
- opening balance support
- invoice debit entries
- payment credit entries
- manual adjustments with audit trail
- overdue retailer list
- credit limit breach alerts

## 4.4.12 Invoice management — P1
**Features**
- generate invoice after dispatch/delivery
- admin dashboard toggle/quick action to generate invoice on behalf of retailer
- assign invoice number
- view item-wise invoice
- print/download invoice
- admin-generated invoices must appear in retailer invoice view automatically
- handle partial invoice logic if needed

## 4.4.13 Returns management — P1
**Features**
- retailer return entry
- route return summary
- damaged items summary
- return approval workflow
- stock correction after return

## 4.4.14 Complaints / issue management — P1
**Features**
- central list of retailer complaints
- assign issue to staff/admin
- track issue status
- record resolution notes

## 4.4.15 Reports & analytics — P0/P1
### P0 Reports
- daily order report
- daily dispatch report
- daily delivery status report
- payment collection report
- outstanding dues report
- stock summary report
- retailer-wise sales report
- product-wise sales report

### P1 Reports
- route-wise performance
- staff-wise delivery performance
- repeat order patterns
- order failure reasons
- top-selling products
- overdue customer aging report

## 4.4.16 Audit log — P1
**Features**
- track who changed product price
- who edited order
- who updated payment/ledger
- who cancelled delivery/order

## 4.4.17 Settings — P1
**Features**
- company profile
- delivery cutoff time
- invoice numbering rules
- tax settings if needed
- notification settings
- payment mode settings
- route master settings

---

## 4.5 Notifications & Communication

## 4.5.1 System notifications — P0
**Trigger events**
- order submitted
- order confirmed
- order cancelled
- route assigned
- delivery completed
- payment recorded
- low stock alert
- overdue dues alert

## 4.5.2 SMS / WhatsApp notifications — P1
**Use cases**
- retailer order confirmation
- dispatch alert
- due reminder
- payment confirmation
- staff route assignment alert

## 4.5.3 Internal notes / comments — P1
**Features**
- admin note on retailer account
- note on order
- note on delivery incident

---

## 4.6 Search, Filter, Export, and Utility Features

### 4.6.1 Universal search — P1
Search by:
- retailer name
- retailer code
- order number
- invoice number
- product name

### 4.6.2 Filters — P0/P1
Filters for:
- date range
- status
- route
- product
- staff
- payment status

### 4.6.3 Export tools — P1
- export orders CSV
- export dues report CSV/Excel
- export product sales report
- export collection report

### 4.6.4 Print-friendly documents — P1
- dispatch sheet
- invoice
- ledger statement
- delivery summary

---

## 4.7 Mobile-First UX Features

### 4.7.1 Responsive interface — P0
**Requirements**
- easy use on Android phone browser
- big buttons for staff use during delivery
- simple order entry for retailers
- low typing workload

### 4.7.2 Progressive Web App (PWA) behavior — P1
**Features**
- installable on mobile home screen
- app-like navigation
- faster loading after first use

### 4.7.3 Fast data entry shortcuts — P1
**Examples**
- repeat last order
- quick quantity buttons
- one-tap mark delivered
- payment quick entry presets

---

# 5. Core Workflows

## 5.1 Retailer Order Workflow
1. retailer logs in
2. opens product catalog
3. enters item quantities
4. reviews order
5. submits order
6. system marks order as pending/confirmed
7. admin reviews and dispatches
8. staff delivers
9. invoice and ledger update

## 5.2 Admin Dispatch Workflow
1. admin receives all retailer orders
2. checks item-wise demand totals
3. validates stock availability
4. groups orders route-wise
5. assigns route to staff
6. dispatch list generated
7. delivery starts
8. admin monitors status

## 5.3 Staff Delivery Workflow
1. staff logs in
2. opens assigned route
3. visits retailer stop
4. checks ordered quantities
5. enters delivered quantities
6. records payment if collected
7. reports issues/returns
8. completes route

## 5.4 Payment & Ledger Workflow
1. payment is collected or manually recorded
2. payment mode selected
3. amount linked to retailer ledger
4. invoice/outstanding updates
5. retailer sees updated due balance

## 5.5 Return / Issue Workflow
1. staff or retailer reports issue
2. admin views issue queue
3. action taken: replace, adjust, credit, or reject
4. stock and ledger updated if needed
5. issue marked resolved

---

# 6. Business Rules to Implement

## 6.1 Order Rules
- order cutoff time can be set by admin
- retailer cannot order inactive products
- quantity must be numeric and positive
- order can be edited only before cutoff or before admin confirmation

## 6.2 Pricing Rules
- each product has active selling price
- optional retailer-specific pricing later
- historical orders keep old price for accuracy

## 6.3 Credit Rules
- retailer may have credit limit
- if outstanding exceeds credit limit:
  - warn retailer
  - or block order
  - or allow admin override

## 6.4 Delivery Rules
- delivered quantity can differ from ordered quantity
- failed or partial deliveries require reason
- returns and damages must affect stock/ledger correctly

## 6.5 Payment Rules
- partial payments allowed
- each payment needs mode/date/amount/collector
- manual ledger adjustment should require admin permission

## 6.6 Audit Rules
- important business actions should be logged
- payment edits and order changes should be traceable

---

# 7. Suggested Navigation Structure

## Retailer Navigation
- Dashboard
- Products / New Order
- Order History
- Invoices / Dues
- Support
- Profile

## Staff Navigation
- Dashboard
- Today’s Route
- Deliveries
- Collections
- Issues / Returns
- Profile

## Admin Navigation
- Dashboard
- Retailers
- Staff
- Products
- Orders
- Dispatch
- Deliveries
- Inventory
- Payments
- Ledger / Dues
- Reports
- Support / Issues
- Settings

---

# 8. MVP Scope Recommendation

## 8.1 Must Build First (Launch Scope) — P0
### Retailer
- login
- dashboard
- productashboard
- product catalog
- place order
- repeat order
- order history
- dues/invoice view

### Staff
- login
- route list
- delivery detail page
- delivery status update
- quantity delivered entry
- payment collection entry
- return/damage notes

### Admin
- dashboard
- retailer management
- staff management
- product management
- order management
- dispatch planning
- delivery monitoring
- inventory basics
- payment entry
- ledger tracking
- essential reports

### System
- role-based access
- notification basics
- responsive mobile UI

## 8.2 Strong V1 Enhancements — P1
- invoice PDF
- support tickets
- pricing rules
- proof of delivery
- export reports
- audit log
- PWA installability
- SMS/WhatsApp notifications
- retailer ledger statement

## 8.3 Later Features — P2
- offline sync
- route optimization
- GPS tracking
- multilingual UI
- standing recurring orders
- advanced analytics
- mobile app using same APIs

---

# 9. Non-Functional Requirements

## Performance
- pages should load quickly on normal mobile internet
- common actions should be under a few taps

## Security
- encrypted password storage
- secure auth tokens/sessions
- role-based API protection
- audit trail for sensitive changes

## Reliability
- daily backups
- error logging
- graceful handling of network issues

## Scalability
- backend should support future Android/iPhone apps
- database structure should support more routes, more staff, more retailers

---

# 10. Open Items to Confirm Later
These are useful decisions before design/build:
- do you want OTP login or password login first?
- do retailers order daily or on fixed subscription pattern?
- do all retailers get same price or different prices?
- do you want invoice generation at dispatch or after delivery?
- do you collect cash daily, weekly, or mixed?
- do you want Hindi + English UI?
- do you need GST invoice support?

---

# 11. Final Product Scope Statement
This application should work as a **digital operating system** for your dairy distribution business, covering:
- ordering
- delivery
- inventory
- payments
- retailer accounts
- staff operations
- business reporting

---

# 12. Recommended Next Step
After this features list, the best next step is:

## Option 1
Create **wireframes/page-by-page screen plan**

## Option 2
Create **database schema and API list**

## Option 3
Start building the **project structure and codebase**
