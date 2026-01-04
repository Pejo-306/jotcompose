.PHONY: help dev up logs down clean setup seed load_test
.DEFAULT_GOAL := up

# Simple shortcuts for running the full stack. Use `make help` to see options.

help:
	@echo "Available targets:"
	@echo "  up     - docker compose up -d"
	@echo "  dev    - docker compose -f compose.yaml -f compose.dev.yaml up -w"
	@echo "  logs   - docker compose logs -f reverse-proxy notebooks notes"
	@echo "  down   - docker compose down"
	@echo "  clean  - docker compose down -v --rmi local"
	@echo "  setup  - run scripts/setup.sh to create .env files"
	@echo "  seed   - run scripts/seed.sh to seed sample data"
	@echo "  load_test - run scripts/load_test.sh (see README for heavy defaults)"

dev:
	docker compose -f compose.yaml -f compose.dev.yaml up -w

up:
	docker compose up -d

logs:
	docker compose logs -f reverse-proxy notebooks notes

down:
	docker compose down

clean:
	docker compose down -v --rmi local

setup:
	chmod +x scripts/setup.sh
	bash scripts/setup.sh

seed:
	chmod +x scripts/seed.sh
	bash scripts/seed.sh

load_test:
	chmod +x scripts/load_test.sh
	bash scripts/load_test.sh

