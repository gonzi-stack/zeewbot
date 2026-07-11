# ZeewBot - Bot de Discord

Bot oficial de Discord para Zeew Space.

## Características

- 🎫 Sistema de tickets
- 👋 Sistema de bienvenida inteligente (agrupa múltiples usuarios)
- 🏗️ Arquitectura basada en SOLID
- 📊 Preparado para Redis (cuando sea necesario)
- 🔧 TypeScript + Discord.js v14
- 🐳 Docker y Docker Compose incluidos
- ❤️ Health checks para monitoreo

## Requisitos

- Node.js 20+ (para desarrollo local)
- Docker y Docker Compose (recomendado)
- Token de bot de Discord

## Instalación Rápida con Docker

### 1. Configuración inicial

```bash
# Clonar el repositorio
git clone <tu-repositorio>
cd ZeewBot

# Copiar archivo de entorno
cp .env.example .env

# Editar .env con tu token de Discord
# Editar config.json con los IDs de tu servidor
```

### 2. Usar con Make (Linux/Mac)

```bash
# Ver todos los comandos disponibles
make help

# Iniciar en desarrollo
make dev

# Iniciar en producción
make prod

# Ver logs
make logs

# Detener
make stop
```

### 3. Usar con Docker Compose directamente

```bash
# Desarrollo
docker-compose -f docker-compose.dev.yml up --build

# Producción
docker-compose up -d

# Ver logs
docker-compose logs -f bot

# Detener
docker-compose down
```

### 4. Usar con scripts (Windows)

```bash
# Desarrollo
.\scripts\start-dev.bat

# Producción
.\scripts\start-prod.bat

# Detener
.\scripts\stop.bat
```

## Desarrollo Local (sin Docker)

```bash
# Instalar dependencias
pnpm install

# Desarrollo con hot-reload
pnpm run dev

# Compilar
pnpm run build

# Producción
pnpm start
```

## Configuración

### Variables de Entorno (.env)

```env
DISCORD_TOKEN=tu_token_aqui
REDIS_URL=redis://localhost:6379  # Opcional
NODE_ENV=development
```

### Configuración del Bot (config.json)

```json
{
  "guildId": "ID_DE_TU_SERVIDOR",
  "channels": {
    "welcome": "ID_CANAL_BIENVENIDA",
    "tickets": "ID_CATEGORIA_TICKETS",
    "logs": "ID_CANAL_LOGS"
  },
  "roles": {
    "member": "ID_ROL_MIEMBRO",
    "support": "ID_ROL_SOPORTE"
  }
}
```

## Comandos del Bot

- `/help` - Muestra la ayuda
- `/ping` - Verifica la latencia
- `/ticket [motivo]` - Crea un ticket de soporte
- `/welcomestatus` - Ver bienvenidas pendientes (solo staff)

## Estructura del Proyecto

```
ZeewBot/
├── src/              # Código fuente TypeScript
├── scripts/          # Scripts de utilidad
├── logs/             # Archivos de log
├── docker-compose.yml # Configuración de producción
├── docker-compose.dev.yml # Configuración de desarrollo
├── Dockerfile        # Imagen de producción
├── Dockerfile.dev    # Imagen de desarrollo
└── Makefile         # Comandos de utilidad
```

## Monitoreo

El bot incluye un endpoint de health check en el puerto 3000:

```bash
# Verificar salud del bot
curl http://localhost:3000/health
```

## Backup de Redis

```bash
# Con Make
make backup

# Manual
docker-compose exec redis redis-cli BGSAVE
```

## Solución de Problemas

### El bot no se conecta
- Verifica que el token en `.env` sea correcto
- Asegúrate de que el bot tenga los permisos necesarios en Discord

### Error de permisos en Docker
- En Linux, puedes necesitar usar `sudo` o agregar tu usuario al grupo docker

### Redis no conecta
- Es opcional, el bot funciona sin Redis
- Si lo necesitas, verifica que el servicio esté ejecutándose

## Contribuir

1. Fork el proyecto
2. Crea tu rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

MIT - Ver archivo LICENSE para más detalles
