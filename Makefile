.PHONY: help build dev prod stop logs clean install lint test

# Colores
GREEN  := \033[0;32m
YELLOW := \033[0;33m
RED    := \033[0;31m
NC     := \033[0m

help: ## Muestra esta ayuda
	@echo "${GREEN}ZeewBot - Comandos disponibles${NC}"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "${YELLOW}%-15s${NC} %s\n", $$1, $$2}'

install: ## Instala las dependencias
	pnpm install

build: ## Construye la imagen de Docker para producción
	docker-compose build

dev: ## Inicia el bot en modo desarrollo
	@if [ ! -f .env ]; then \
		echo "${RED}Error: .env file not found!${NC}"; \
		echo "Please copy .env.example to .env and configure it."; \
		exit 1; \
	fi
	docker-compose -f docker-compose.dev.yml up --build

prod: ## Inicia el bot en modo producción
	@if [ ! -f .env ]; then \
		echo "${RED}Error: .env file not found!${NC}"; \
		echo "Please copy .env.example to .env and configure it."; \
		exit 1; \
	fi
	docker-compose up -d
	@echo "${GREEN}Bot iniciado en modo producción${NC}"
	@echo "Usa 'make logs' para ver los logs"

stop: ## Detiene todos los servicios
	docker-compose down
	docker-compose -f docker-compose.dev.yml down
	@echo "${GREEN}Servicios detenidos${NC}"

logs: ## Muestra los logs del bot
	docker-compose logs -f bot

logs-dev: ## Muestra los logs del bot en desarrollo
	docker-compose -f docker-compose.dev.yml logs -f bot

clean: ## Limpia contenedores, volúmenes e imágenes
	docker-compose down -v --rmi all
	docker-compose -f docker-compose.dev.yml down -v --rmi all
	rm -rf dist node_modules
	@echo "${GREEN}Limpieza completada${NC}"

lint: ## Ejecuta el linter
	pnpm run lint

lint-fix: ## Corrige problemas de lint
	pnpm run lint:fix

test: ## Ejecuta las pruebas (cuando las implementes)
	@echo "${YELLOW}No hay pruebas implementadas aún${NC}"

restart: stop prod ## Reinicia el bot en producción

restart-dev: stop dev ## Reinicia el bot en desarrollo

shell: ## Abre una shell en el contenedor del bot
	docker-compose exec bot sh

shell-redis: ## Abre redis-cli
	docker-compose exec redis redis-cli

backup: ## Crea un backup de Redis
	@mkdir -p backups
	docker-compose exec redis redis-cli BGSAVE
	@sleep 2
	docker cp zeewbot-redis:/data/dump.rdb ./backups/dump-$$(date +%Y%m%d-%H%M%S).rdb
	@echo "${GREEN}Backup creado en ./backups/${NC}"

status: ## Muestra el estado de los contenedores
	docker-compose ps
