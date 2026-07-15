#!/usr/bin/env bash
set -euo pipefail

# Bootstrap / update GitHub labels for this repository using GitHub CLI.
#
# Usage:
#   ./.github/scripts/bootstrap-labels.sh
#   REPO=sheazada/DAIRY-FLOW-PRO ./.github/scripts/bootstrap-labels.sh
#   ./.github/scripts/bootstrap-labels.sh sheazada/DAIRY-FLOW-PRO
#
# Requirements:
# - gh CLI installed and authenticated
# - repo access permission for label management

REPO="${1:-${REPO:-}}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is not installed." >&2
  exit 1
fi

if [[ -z "$REPO" ]]; then
  REPO="$(gh repo view --json nameWithOwner --jq '.nameWithOwner' 2>/dev/null || true)"
fi

if [[ -z "$REPO" ]]; then
  echo "Error: Could not determine repository. Pass it as an argument or set REPO." >&2
  exit 1
fi

# name|color|description
LABELS=$(cat <<'EOF'
bug|d73a4a|Defect or incorrect behavior
enhancement|a2eeef|New feature or improvement
regression|b60205|Previously working workflow broke
refactor|cfd3d7|Internal cleanup without business behavior change
docs|0075ca|Documentation only
test|5319e7|Test coverage or testing infrastructure
ci|1d76db|CI/CD or workflow changes
chore|fef2c0|Maintenance or non-feature upkeep
security|b60205|Security-related work
breaking-change|000000|May break API or workflow compatibility
P0-critical|b60205|Business-critical issue
P1-high|d93f0b|High priority
P2-medium|fbca04|Medium priority
P3-low|0e8a16|Low priority
area:backend|0366d6|NestJS backend
area:frontend|0e8a16|Next.js frontend
area:prisma|5319e7|Prisma schema or DB behavior
area:ci|1d76db|GitHub Actions, CI, or test profile
area:docs|0075ca|Project docs
domain:auth|0052cc|Auth, session, roles
domain:retailers|006b75|Retailer master or profile
domain:sales-orders|0e8a16|Retailer or admin order flow
domain:demand-consolidation|2cbe4e|Daily demand aggregation
domain:procurement|c2e0c6|PO or supplier procurement
domain:grn|bfdadc|Goods receipt or inwarding
domain:inventory|f9d0c4|Stock, batches, movement, adjustments
domain:dispatch|d4c5f9|Trip planning or route loading
domain:delivery|7057ff|Stop execution, POD, field updates
domain:sales-invoices|e99695|Invoice generation or posting
domain:payments|fef2c0|Receipts, intents, allocation
domain:ledger|d876e3|Ledger, passbook, statement
domain:wallet|fbca04|Advance wallet or carry-forward
domain:credit-control|b60205|Limit, overdue, override, block logic
domain:accounting|c5def5|Journals, accounts, books
domain:reports|bfd4f2|Reports, exports, analytics
domain:dashboard|f9c513|KPI or dashboard aggregation
domain:notifications|d4c5f9|SMS, WhatsApp, email, in-app
domain:retailer-portal|a2eeef|Retailer self-service UI/API
domain:staff-portal|c2e0c6|Delivery or staff UI/API
domain:offline-pwa|5319e7|Offline queue, service worker, PWA
risk:finance|b60205|Dues, ledger, payment, credit, or wallet impact
risk:inventory|d93f0b|Stock, quantity, batch, or value integrity impact
risk:dispatch|fbca04|Dispatch or delivery execution risk
risk:retailer-visibility|e99695|Retailer dashboard or history mismatch risk
risk:data-integrity|5319e7|Persistence or reconciliation integrity risk
needs-triage|ededed|Newly opened, not yet categorized
needs-repro|f9d0c4|Needs reproduction or clearer steps
blocked|d93f0b|Waiting on another issue or decision
good-first-issue|7057ff|Safe beginner task
help-wanted|008672|Community help welcome
needs-business-decision|c2e0c6|Requires business rule clarification
ready-for-dev|0e8a16|Triaged and implementable
ready-for-review|1d76db|PR is ready for review
EOF
)

echo "Syncing labels to $REPO"

EXISTING_LABELS="$(gh label list --repo "$REPO" --limit 1000 --json name --jq '.[].name' || true)"

has_label() {
  local name="$1"
  grep -Fxq "$name" <<<"$EXISTING_LABELS"
}

while IFS='|' read -r NAME COLOR DESCRIPTION; do
  [[ -z "$NAME" ]] && continue

  if has_label "$NAME"; then
    echo "Updating: $NAME"
    gh label edit "$NAME" \
      --repo "$REPO" \
      --color "$COLOR" \
      --description "$DESCRIPTION" >/dev/null
  else
    echo "Creating: $NAME"
    gh label create "$NAME" \
      --repo "$REPO" \
      --color "$COLOR" \
      --description "$DESCRIPTION" >/dev/null
  fi
done <<< "$LABELS"

echo "Done. Labels synced for $REPO"
