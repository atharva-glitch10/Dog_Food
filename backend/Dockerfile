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

# Install OpenSSL and libc compatibility for Prisma engine on Alpine
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=4000

COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig.json ./

RUN npm ci --omit=dev
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

# Create uploads directory with appropriate permissions
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 4000

CMD ["node", "dist/server.js"]
