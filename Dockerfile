FROM node:20-alpine

# Prisma requires OpenSSL on Alpine; netcat-openbsd provides nc -z for the entrypoint wait loop
RUN apk add --no-cache openssl netcat-openbsd

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 3000

# Entrypoint: push schema, seed, start
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
