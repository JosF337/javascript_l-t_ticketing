# =========================================================================
# Production Dockerfile for Customer Support Helpdesk API (P14)
# Lightweight, Multi-stage Node.js Alpine Container with Non-root Security
# =========================================================================

# Stage 1: Build & Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Final Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install curl for container health check
RUN apk --no-cache add curl

# Create application directory with proper permissions
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Use non-root node user for container security
USER node

# Expose API and WebSocket port
EXPOSE 5000

# Health check to ensure service is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/ || exit 1

# Start the application
CMD ["node", "server.js"]
