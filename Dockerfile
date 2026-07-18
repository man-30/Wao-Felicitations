FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy prisma schema
COPY prisma ./prisma

# Generate prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build frontend (Vite → dist/index.html)
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode >= 200 && r.statusCode < 400 ? 0 : 1)}).on('error', () => process.exit(1))"

# Start backend server
CMD ["npx", "tsx", "backend-express-complete.ts"]
