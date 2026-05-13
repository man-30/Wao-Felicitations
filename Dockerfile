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

# Build (if needed)
RUN npm run build 2>/dev/null || true

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start backend server
CMD ["npx", "tsx", "backend-express-complete.ts"]
