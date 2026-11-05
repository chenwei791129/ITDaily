.DEFAULT_GOAL := help

IMAGE ?= it-daily
TAG ?= latest
PORT ?= 8080
# Use docker when available, otherwise podman.
CONTAINER ?= $(shell command -v docker >/dev/null 2>&1 && echo docker || echo podman)
ENV_FILE := $(addprefix --env-file ,$(wildcard .env))

.PHONY: help install dev start test build check docker-build docker-run clean

help: ## Show this help
	@printf '\033[1mUsage:\033[0m make \033[36m<target>\033[0m\n\n\033[1mTargets:\033[0m\n'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf '\n\033[1mVariables:\033[0m \033[33mIMAGE\033[0m=$(IMAGE) \033[33mTAG\033[0m=$(TAG) \033[33mPORT\033[0m=$(PORT) \033[33mCONTAINER\033[0m=$(CONTAINER)\n'

install: ## Install dependencies
	bun install

dev: ## Run the Vite dev server (run `make start` alongside for /api)
	bun run dev

start: build ## Build and serve on PORT
	PORT=$(PORT) bun run start

test: ## Run tests
	bun test

build: ## Type-check and build the site into dist/
	bun run build

check: test build ## Run tests and build

docker-build: ## Build the container image IMAGE:TAG
	$(CONTAINER) build -t $(IMAGE):$(TAG) .

docker-run: ## Run the image on PORT (uses .env when present)
	$(CONTAINER) run --rm -p $(PORT):8080 $(ENV_FILE) $(IMAGE):$(TAG)

clean: ## Remove build output
	rm -rf dist
