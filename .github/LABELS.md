# GitHub Labels — Recommended Mapping

This document defines a practical label system for **DAIRY-FLOW-PRO** so issues and PRs can be triaged consistently.

It is tailored to the actual ERP workflows in this repo:
- assisted retailer ordering
- assisted retailer billing
- daily demand consolidation
- procurement / GRN / inventory
- dispatch / delivery
- ledger-first payments
- wallet / credit control
- retailer + staff portal
- CI / Prisma-backed e2e

---

## 1. Label design goals
Use labels to answer these questions quickly:

1. **What kind of item is this?**
   - bug, enhancement, regression, docs, test, CI, etc.
2. **Which module/workflow is affected?**
   - payments, dispatch, inventory, portal, etc.
3. **How urgent is it?**
   - P0, P1, P2, P3
4. **Is there special business risk?**
   - finance risk, inventory risk, retailer visibility risk, etc.
5. **What is the current triage state?**
   - needs triage, blocked, good first issue, etc.

---

## 2. Recommended label groups

## 2.1 Type labels
Use exactly one primary type label where possible.

| Label | Purpose | Suggested color |
|---|---|---|
| `bug` | Defect / incorrect behavior | `d73a4a` |
| `enhancement` | New feature or improvement | `a2eeef` |
| `regression` | Previously working workflow broke | `b60205` |
| `refactor` | Internal code cleanup without business behavior change | `cfd3d7` |
| `docs` | Documentation only | `0075ca` |
| `test` | Test coverage / testing infrastructure | `5319e7` |
| `ci` | CI/CD / workflow / pipeline work | `1d76db` |
| `chore` | Maintenance / non-feature upkeep | `fef2c0` |
| `security` | Security-related work | `b60205` |
| `breaking-change` | Change may break API/workflow compatibility | `000000` |

---

## 2.2 Priority labels
Use one priority label.

| Label | Meaning | Suggested color |
|---|---|---|
| `P0-critical` | Business-critical, blocks operations or data trust | `b60205` |
| `P1-high` | High importance, should be handled soon | `d93f0b` |
| `P2-medium` | Important but not urgent | `fbca04` |
| `P3-low` | Nice to have / cleanup / backlog | `0e8a16` |

### P0 examples
Use `P0-critical` for issues like:
- incorrect retailer dues
- wrong ledger balance
- duplicate receipt posting
- credit control allowing blocked dispatch incorrectly
- admin-created order/invoice missing from retailer account view
- demand consolidation producing wrong totals

---

## 2.3 Area / module labels
Use one or more depending on scope.

### Platform / app areas
| Label | Purpose | Suggested color |
|---|---|---|
| `area:backend` | NestJS backend | `0366d6` |
| `area:frontend` | Next.js frontend | `0e8a16` |
| `area:prisma` | Prisma schema / DB behavior | `5319e7` |
| `area:ci` | GitHub Actions / CI / test profile | `1d76db` |
| `area:docs` | Project docs | `0075ca` |

### ERP domains
| Label | Purpose | Suggested color |
|---|---|---|
| `domain:auth` | auth/session/roles | `0052cc` |
| `domain:retailers` | retailer master / profile | `006b75` |
| `domain:sales-orders` | retailer/admin order flow | `0e8a16` |
| `domain:demand-consolidation` | core daily demand aggregation | `2cbe4e` |
| `domain:procurement` | PO / supplier-facing procurement | `c2e0c6` |
| `domain:grn` | goods receipt / inwarding | `bfdadc` |
| `domain:inventory` | stock, batches, movement, adjustments | `f9d0c4` |
| `domain:dispatch` | trip planning / route loading | `d4c5f9` |
| `domain:delivery` | stop execution / POD / field updates | `7057ff` |
| `domain:sales-invoices` | invoice generation/posting | `e99695` |
| `domain:payments` | receipts / intents / allocation | `fef2c0` |
| `domain:ledger` | ledger / passbook / statement | `d876e3` |
| `domain:wallet` | advance wallet / balance carry-forward | `fbca04` |
| `domain:credit-control` | limit, overdue, override, block logic | `b60205` |
| `domain:accounting` | journals / accounts / books | `c5def5` |
| `domain:reports` | reports / exports / analytics | `bfd4f2` |
| `domain:dashboard` | KPI/dashboard aggregation | `f9c513` |
| `domain:notifications` | SMS/WhatsApp/email/in-app | `d4c5f9` |
| `domain:retailer-portal` | retailer self-service UI/API | `a2eeef` |
| `domain:staff-portal` | delivery/staff UI/API | `c2e0c6` |
| `domain:offline-pwa` | service worker/offline queue/PWA | `5319e7` |

---

## 2.4 Business risk labels
Use when the issue/PR can affect business trust or core data integrity.

| Label | Purpose | Suggested color |
|---|---|---|
| `risk:finance` | dues/ledger/payment/credit/wallet impact | `b60205` |
| `risk:inventory` | stock quantity/value/batch integrity impact | `d93f0b` |
| `risk:dispatch` | dispatch/delivery execution risk | `fbca04` |
| `risk:retailer-visibility` | retailer account/dashboard/history mismatch risk | `e99695` |
| `risk:data-integrity` | broader persistence / reconciliation integrity risk | `5319e7` |

---

## 2.5 Workflow-state labels
Use for triage and team coordination.

| Label | Purpose | Suggested color |
|---|---|---|
| `needs-triage` | Newly opened, not yet categorized | `ededed` |
| `needs-repro` | Needs reproduction or clearer steps | `f9d0c4` |
| `blocked` | Waiting on another issue/decision | `d93f0b` |
| `good-first-issue` | Safe beginner task | `7057ff` |
| `help-wanted` | Community help welcome | `008672` |
| `needs-business-decision` | Requires owner/business rule clarification | `c2e0c6` |
| `ready-for-dev` | Triaged and implementable | `0e8a16` |
| `ready-for-review` | PR is ready for review | `1d76db` |

---

## 3. Recommended mappings for issue templates

## 3.1 `bug_report.md`
Default labels:
- `bug`
- `needs-triage`

Then add one or more:
- area labels
- domain labels
- priority label
- risk label if applicable

### Example
A bug where retailer dues are wrong after payment:
- `bug`
- `area:backend`
- `domain:payments`
- `domain:ledger`
- `risk:finance`
- `risk:data-integrity`
- `P0-critical`

---

## 3.2 `feature_request.md`
Default labels:
- `enhancement`
- `needs-triage`

Then add:
- relevant area/domain labels
- `needs-business-decision` if business rules are unclear
- priority label

### Example
Festival credit extension workflow:
- `enhancement`
- `domain:credit-control`
- `domain:payments`
- `needs-business-decision`
- `P2-medium`

---

## 3.3 `business_workflow_regression.md`
Default labels:
- `regression`
- `P0-critical`
- `needs-triage`

Usually also add:
- one or more domain labels
- `risk:finance` or `risk:inventory` or `risk:retailer-visibility`

### Example
Admin invoice no longer appears in retailer portal:
- `regression`
- `domain:sales-invoices`
- `domain:retailer-portal`
- `risk:retailer-visibility`
- `P0-critical`

---

## 4. Recommended mappings for PRs

Use PR labels to show both technical scope and business risk.

### Example PR: credit check enforcement
- `area:backend`
- `domain:credit-control`
- `domain:sales-orders`
- `domain:dispatch`
- `test`
- `P1-high`

### Example PR: passbook response shape change
- `area:backend`
- `area:frontend`
- `domain:ledger`
- `domain:retailer-portal`
- `risk:finance`
- `breaking-change`

### Example PR: CI-only work
- `ci`
- `area:ci`
- `test`
- `P2-medium`

---

## 5. Minimal label policy
If you want to keep label count small, use this minimum set:

### Minimum type
- `bug`
- `enhancement`
- `regression`
- `docs`
- `test`
- `ci`

### Minimum priority
- `P0-critical`
- `P1-high`
- `P2-medium`
- `P3-low`

### Minimum domain
- `domain:sales-orders`
- `domain:demand-consolidation`
- `domain:inventory`
- `domain:dispatch`
- `domain:sales-invoices`
- `domain:payments`
- `domain:ledger`
- `domain:credit-control`
- `domain:retailer-portal`
- `domain:staff-portal`

### Minimum risk
- `risk:finance`
- `risk:inventory`
- `risk:retailer-visibility`

---

## 6. GitHub CLI bootstrap script
A ready-to-run GitHub CLI script is included here:

- `.github/scripts/bootstrap-labels.sh`

### Usage
From the repository root:

```bash
./.github/scripts/bootstrap-labels.sh
```

Or target the repo explicitly:

```bash
./.github/scripts/bootstrap-labels.sh sheazada/DAIRY-FLOW-PRO
```

Or:

```bash
REPO=sheazada/DAIRY-FLOW-PRO ./.github/scripts/bootstrap-labels.sh
```

The script will:
- create missing labels
- update existing labels to the recommended color/description mapping

### Requirements
- GitHub CLI (`gh`) installed
- authenticated `gh auth login`
- permission to manage labels on the target repository

### Manual example
If you prefer manual creation, GitHub CLI commands look like this:

```bash
gh label create bug --color d73a4a --description "Defect / incorrect behavior"
gh label create enhancement --color a2eeef --description "New feature or improvement"
gh label create regression --color b60205 --description "Previously working workflow broke"
gh label create P0-critical --color b60205 --description "Business-critical issue"
gh label create area:backend --color 0366d6 --description "NestJS backend"
gh label create domain:payments --color fef2c0 --description "Receipts / intents / allocation"
gh label create domain:credit-control --color b60205 --description "Limit, overdue, override, block logic"
gh label create risk:finance --color b60205 --description "Dues/ledger/payment/credit/wallet impact"
gh label create needs-triage --color ededed --description "Newly opened, not yet categorized"
```

---

## 7. Suggested team usage

### For new issues
Add at least:
- one type label
- one priority label
- one area/domain label

### For finance-sensitive issues/PRs
Always add:
- `risk:finance`
if it can affect:
- payment receipt behavior
- invoice payment status
- ledger balance
- wallet balance
- credit enforcement
- retailer dues visibility

### For retailer trust-sensitive items
Always add:
- `risk:retailer-visibility`
if admin-created/assisted records may stop appearing correctly in retailer views.

---

## 8. Recommended first rollout
If setting up labels from scratch, start with these first:

### Core starter set
- `bug`
- `enhancement`
- `regression`
- `docs`
- `test`
- `ci`
- `P0-critical`
- `P1-high`
- `P2-medium`
- `P3-low`
- `area:backend`
- `area:frontend`
- `area:prisma`
- `domain:sales-orders`
- `domain:demand-consolidation`
- `domain:inventory`
- `domain:dispatch`
- `domain:sales-invoices`
- `domain:payments`
- `domain:ledger`
- `domain:credit-control`
- `domain:retailer-portal`
- `domain:staff-portal`
- `risk:finance`
- `risk:inventory`
- `risk:retailer-visibility`
- `needs-triage`
- `blocked`
- `ready-for-review`

---

## 9. Related files
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `.github/ISSUE_TEMPLATE/business_workflow_regression.md`
- `.github/pull_request_template.md`
- `CONTRIBUTING.md`
