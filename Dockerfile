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

# Build Next.js. Bump Node's heap ceiling so the build completes on
# memory-tight hosts (t3.micro w/ swap). Default is ~500 MB which OOMs
# during type-checking on this codebase.
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN npm run build

# Expose port
EXPOSE 3000

# Entrypoint: push schema, seed, start
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
