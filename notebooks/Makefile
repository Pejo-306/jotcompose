.PHONY: help dev up logs down clean
.DEFAULT_GOAL := up

# Shortcuts for the notebooks stack. Run `make help` for target list.

help:
	@echo "Available targets (notebooks):"
	@echo "  up     - docker compose up -d"
	@echo "  dev    - docker compose -f compose.yaml -f compose.dev.yaml up -w"
	@echo "  logs   - docker compose logs -f notebooks"
	@echo "  down   - docker compose down"
	@echo "  clean  - docker compose down -v --rmi local"

dev:
	docker compose -f compose.yaml -f compose.dev.yaml up -w

up:
	docker compose up -d

logs:
	docker compose logs -f notebooks

down:
	docker compose down

clean:
	docker compose down -v --rmi local

