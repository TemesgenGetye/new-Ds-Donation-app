FROM node:20-alpine AS builder

ARG SERVICE_PATH

WORKDIR /app

# Copy package files first for better caching
COPY ${SERVICE_PATH}/package*.json ./
COPY ${SERVICE_PATH}/tsconfig.json ./

# Install ALL dependencies (including devDependencies for build)
# Use npm ci if package-lock.json exists, otherwise use npm install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy source code
COPY ${SERVICE_PATH}/src ./src
COPY ${SERVICE_PATH}/swagger.yaml ./swagger.yaml

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

ARG SERVICE_PATH

WORKDIR /app

# Copy package files from builder (ensures same package.json used for build)
COPY --from=builder /app/package*.json ./

# Install ONLY production dependencies
# Use npm ci if package-lock.json exists, otherwise use npm install
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --only=production; fi && npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/swagger.yaml ./swagger.yaml

# Default port (overridden by environment variable and docker-compose)
EXPOSE 3000

# Start server
CMD ["node", "dist/index.js"]

