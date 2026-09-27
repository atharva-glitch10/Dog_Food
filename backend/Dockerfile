# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL and libc compatibility for Prisma engine on Alpine
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY src ./src
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install OpenSSL and libc compatibility for Prisma engine, plus su-exec for safe privilege dropping
RUN apk add --no-cache openssl libc6-compat su-exec

ENV NODE_ENV=production
ENV PORT=4000

COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig.json ./

RUN npm ci --omit=dev
RUN npx prisma generate

COPY --from=builder /app/dist ./dist
# OpenAPI spec served by Swagger UI at /api/docs (resolved relative to dist/)
COPY docs ./docs
COPY docker-entrypoint.sh /app/docker-entrypoint.sh

# Ensure uploads/secrets directories exist and prepare entrypoint permissions
RUN mkdir -p /app/uploads /app/secrets && \
    chown -R node:node /app && \
    sed -i 's/\r$//' /app/docker-entrypoint.sh && \
    chmod +x /app/docker-entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
