#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
SKIP_INSTALL="${SKIP_INSTALL:-0}"

resolve_targets() {
  case "$1" in
    all)
      printf '%s\n' \
        "typecheck:products" \
        "typecheck" \
        "test:lookups" \
        "test:products" \
        "test:operations" \
        "test:settings" \
        "test:portal" \
        "test:reports"
      ;;
    typecheck-products)
      printf '%s\n' "typecheck:products"
      ;;
    typecheck)
      printf '%s\n' "typecheck"
      ;;
    lookups)
      printf '%s\n' "test:lookups"
      ;;
    products)
      printf '%s\n' "test:products"
      ;;
    operations)
      printf '%s\n' "test:operations"
      ;;
    settings)
      printf '%s\n' "test:settings"
      ;;
    portal)
      printf '%s\n' "test:portal"
      ;;
    reports)
      printf '%s\n' "test:reports"
      ;;
    dispatch)
      printf '%s\n' "vitest run src/features/dispatch/components/__tests__"
      ;;
    inventory)
      printf '%s\n' "vitest run src/features/inventory/components/__tests__"
      ;;
    goods-receipts)
      printf '%s\n' "vitest run src/features/goods-receipts/components/__tests__"
      ;;
    purchase-orders)
      printf '%s\n' "vitest run src/features/purchase-orders/components/__tests__"
      ;;
    *)
      printf '%s\n' "$1"
      ;;
  esac
}

cd "$FRONTEND_DIR"

if [[ "$SKIP_INSTALL" != "1" ]]; then
  echo ">>> Installing frontend dependencies"
  npm ci
else
  echo ">>> SKIP_INSTALL=1 set, skipping npm ci"
fi

if [[ "$#" -eq 0 ]]; then
  mapfile -t scripts < <(resolve_targets all)
else
  scripts=()
  for raw_arg in "$@"; do
    while IFS= read -r script_name; do
      [[ -n "$script_name" ]] && scripts+=("$script_name")
    done < <(resolve_targets "$raw_arg")
  done
fi

echo ">>> Resolved frontend targets: ${scripts[*]}"

for script_name in "${scripts[@]}"; do
  echo ">>> Running frontend target: $script_name"
  if [[ "$script_name" == vitest\ run* ]]; then
    npx $script_name
  else
    npm run "$script_name"
  fi
done

echo ">>> Frontend UI suite run completed successfully"
