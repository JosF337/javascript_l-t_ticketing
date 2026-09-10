# =========================================================================
# Multi-Stage Production Dockerfile for Customer Support Helpdesk (P14)
# Stage 1: Build Angular 18 Standalone SPA Client
# Stage 2: Install Backend Production Dependencies
# Stage 3: Minimal, Secure Node.js 20 Alpine Runner
# =========================================================================

# Stage 1: Build Frontend
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Backend Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 3: Final Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install curl for container health check
RUN apk --no-cache add curl

# Copy backend dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy compiled frontend from client-builder
COPY --from=client-builder /app/client/dist ./client/dist

# Copy backend source code
COPY . .

# Clean up client source code from production image to keep it lightweight
RUN rm -rf client/node_modules client/src

# Use non-root node user for container security
USER node

# Expose API, WebSockets, and SPA port
EXPOSE 5000

# Health check to ensure service is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/docs || exit 1

# Start the application
CMD ["node", "server.js"]

