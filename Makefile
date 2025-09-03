# ==============================================================================
# ⚙️ Configuración
# ==============================================================================
DC ?= docker compose
PROJECT := ft_transcendence
COMPOSE_FILES := -f docker-compose.yml

# ==============================================================================
# 🎯 Reglas Principales
# ==============================================================================

.PHONY: all dev build up up-d down logs ps clean fclean re pull help

# Regla por defecto: build + up en foreground
all: build up

# Modo desarrollo (frontend con watch y logs)
dev:
	@echo "🚀 Iniciando entorno de desarrollo..."
	$(DC) $(COMPOSE_FILES) up --build -d backend
	$(DC) $(COMPOSE_FILES) run --rm --service-ports frontend npm run dev

# Construcción de imágenes (sin caché si NO_CACHE=1)
build:
ifeq ($(NO_CACHE),1)
	$(DC) $(COMPOSE_FILES) build --no-cache
else
	$(DC) $(COMPOSE_FILES) build
endif

# Levantar servicios en primer plano
up:
	$(DC) $(COMPOSE_FILES) up

# Levantar servicios en segundo plano
up-d:
	$(DC) $(COMPOSE_FILES) up -d

# Apagar servicios
down:
	@echo "🛑 Deteniendo y eliminando contenedores..."
	$(DC) $(COMPOSE_FILES) down --remove-orphans

# Logs en vivo
logs:
	@echo "📜 Mostrando logs en tiempo real..."
	$(DC) $(COMPOSE_FILES) logs -f --tail=200

# Estado
ps:
	$(DC) $(COMPOSE_FILES) ps

# ==============================================================================
# 🧹 Limpieza
# ==============================================================================

# Limpieza ligera
clean: down
	@echo "🧹 Clean: contenedores y redes eliminados."

# Limpieza total (contenedores, redes, volúmenes, imágenes locales + node_modules)
fclean:
	$(DC) $(COMPOSE_FILES) down -v --remove-orphans --rmi local
	@echo "Eliminando posibles node_modules locales..."
	@rm -rf backend/node_modules frontend/node_modules backend/package-lock.json frontend/package-lock.json || true
	@echo "Fclean completo."

# Rebuild total
re: fclean all

# ==============================================================================
# ℹ️ Ayuda
# ==============================================================================

help:
	@echo "📖 Comandos disponibles:"
	@echo "  make              -> build + up (foreground)"
	@echo "  make dev          -> entorno de desarrollo (frontend con watchers)"
	@echo "  make build        -> construir imágenes (NO_CACHE=1 para sin caché)"
	@echo "  make up           -> levantar servicios en foreground"
	@echo "  make up-d         -> levantar servicios en background"
	@echo "  make down         -> detener y eliminar contenedores"
	@echo "  make logs         -> mostrar logs en tiempo real"
	@echo "  make ps           -> estado de contenedores"
	@echo "  make clean        -> limpieza ligera"
	@echo "  make fclean       -> limpieza total (con volúmenes e imágenes)"
	@echo "  make re           -> reconstrucción completa"
