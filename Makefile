# Makefile para el proyecto ft_transcendence
# ============================================================================== #

COMPOSE = docker compose

# ============================================================================== #
# ✨ Reglas Principales                                                         #
# ============================================================================== #

# Regla por defecto: modo estable/producción SIN watch.
# Levanta los contenedores usando el CMD por defecto de los Dockerfile.
.PHONY: all
all:
	@echo "🚀 Iniciando entorno en modo estable (sin watch)..."
	$(COMPOSE) up -d --build

# Regla para desarrollo: modo CON watch.
# Sobrescribe el comando de inicio para usar "npm run dev".
.PHONY: dev
dev:
	@echo "🚀 Iniciando entorno de desarrollo (con watchers y logs)..."
	$(COMPOSE) up --build -d backend
	$(COMPOSE) run --rm --service-ports frontend npm run dev

# ============================================================================== #
# 🐋 Comandos de Docker Compose                                                  #
# ============================================================================== #

# Detiene y elimina los contenedores.
.PHONY: down
down:
	@echo "🛑 Deteniendo y eliminando contenedores..."
	$(COMPOSE) down

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