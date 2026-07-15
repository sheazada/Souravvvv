.PHONY: help \
	backend-prisma backend-prisma-products backend-prisma-lookups backend-prisma-purchase-orders \
	frontend-ui frontend-lookups frontend-products frontend-operations

help:
	@echo "Available targets:"
	@echo "  make backend-prisma          # Boot test DB + run full Prisma-backed backend suite"
	@echo "  make backend-prisma-products # Boot test DB + run Prisma-backed product suite"
	@echo "  make backend-prisma-lookups  # Boot test DB + run Prisma-backed lookup suite"
	@echo "  make backend-prisma-purchase-orders # Boot test DB + run Prisma-backed purchase order suite"
	@echo "  make frontend-ui             # Run full frontend UI validation/test flow"
	@echo "  make frontend-lookups        # Run frontend lookup tests only"
	@echo "  make frontend-products       # Run frontend product tests only"
	@echo "  make frontend-operations     # Run frontend operations tests only"

backend-prisma:
	bash ./scripts/run-backend-prisma-suites.sh

backend-prisma-products:
	bash ./scripts/run-backend-prisma-suites.sh test:e2e:prisma:http-products

backend-prisma-lookups:
	bash ./scripts/run-backend-prisma-suites.sh test:e2e:prisma:http-lookups

backend-prisma-purchase-orders:
	bash ./scripts/run-backend-prisma-suites.sh purchase-orders

frontend-ui:
	bash ./scripts/run-frontend-ui-suites.sh

frontend-lookups:
	bash ./scripts/run-frontend-ui-suites.sh lookups

frontend-products:
	bash ./scripts/run-frontend-ui-suites.sh products

frontend-operations:
	bash ./scripts/run-frontend-ui-suites.sh operations
