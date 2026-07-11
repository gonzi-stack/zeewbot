# Build stage
FROM node:20-alpine AS builder

# Instalar dependencias de compilación y pnpm
RUN apk add --no-cache python3 make g++ && \
    corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar archivos de configuración
COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json ./

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY src ./src
COPY config.json ./

# Compilar TypeScript
RUN pnpm run build

# Limpiar dependencias de desarrollo
RUN pnpm prune --prod

# Production stage
FROM node:20-alpine

# Instalar dumb-init para manejar señales correctamente
RUN apk add --no-cache dumb-init

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copiar archivos necesarios desde el builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --chown=nodejs:nodejs config.json ./

# Crear directorio de logs
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Cambiar al usuario no-root
USER nodejs

# Exponer métricas (si las implementamos en el futuro)
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => { process.exit(1); })"

# Usar dumb-init para manejar señales correctamente
ENTRYPOINT ["dumb-init", "--"]

# Comando por defecto
CMD ["node", "dist/index.js"]
