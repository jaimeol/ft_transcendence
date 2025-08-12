# Makefile para el proyecto ft_transcendence
# ============================================================================== #

COMPOSE = docker compose

# ============================================================================== #
# ✨ Reglas Principales                                                         #
# ============================================================================== #

# Regla por defecto: modo estable/producción SIN watch.
# Usa el `docker-compose.override.yml` para cambiar los comandos de inicio.
.PHONY: all
all: build up

# Regla para desarrollo: modo CON watch.
# Inicia con `docker compose watch`, que está diseñado para esto.
.PHONY: watch
watch:
	@echo "🚀 Iniciando entorno de desarrollo (con watchers)..."
	$(COMPOSE) watch

# ============================================================================== #
# 🐋 Comandos de Docker Compose                                                  #
# ============================================================================== #

# Construye las imágenes de Docker.
.PHONY: build
build:
	@echo "🏗️  Construyendo imágenes de Docker..."
	$(COMPOSE) build

# Levanta los contenedores en segundo plano (usará el override).
.PHONY: up
up:
	@echo "⚡ Arrancando contenedores en modo estable (sin watch)..."
	$(COMPOSE) up -d

# Detiene y elimina los contenedores.
.PHONY: down
down:
	@echo "🛑 Deteniendo y eliminando contenedores..."
	$(COMPOSE) down

# ... (El resto de las reglas 'clean', 'fclean', 're', 'logs' pueden quedar igual)
# ============================================================================== #
# 🧹 Reglas de Limpieza                                                          #
# ============================================================================== #
.PHONY: clean
clean:
	@echo "🧹 Limpiando el entorno..."
	$(COMPOSE) down -v
	rm -rf ./data

.PHONY: fclean
fclean:
	@echo "💥 Limpieza profunda: eliminando contenedores, volúmenes e imágenes..."
	$(COMPOSE) down -v --rmi all --remove-orphans
	rm -rf ./data

# ============================================================================== #
# 🔄 Reglas de Conveniencia                                                     #
# ============================================================================== #
.PHONY: re
re: fclean all

.PHONY: logs
logs:
	@echo "📜 Mostrando logs en tiempo real..."
	$(COMPOSE) logs -f