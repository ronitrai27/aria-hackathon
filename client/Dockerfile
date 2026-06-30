# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package configuration
COPY package.json pnpm-lock.yaml ./

# Install dependencies (including devDependencies needed for build)
RUN pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm

# Copy dependencies and source code
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for Clerk and Convex environment variables (with default fallbacks from .env.local)
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_cG9wdWxhci1kdWNrbGluZy04Mi5jbGVyay5hY2NvdW50cy5kZXYk
ARG NEXT_PUBLIC_CONVEX_URL=https://wandering-antelope-3.convex.cloud
ARG NEXT_PUBLIC_CONVEX_SITE_URL=https://wandering-antelope-3.convex.site
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/auth/callback
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/auth/callback
ARG UPSTASH_REDIS_REST_URL=https://ideal-sole-136511.upstash.io
ARG UPSTASH_REDIS_REST_TOKEN=gQAAAAAAAhU_AAIgcDE5YWRmNzBmMjRiMjg0YmNkYmY0ZTQ0MGZiNzZkYWY1OQ
ARG UPSTASH_REDIS_URL=https://ideal-sole-136511.upstash.io
ARG UPSTASH_REDIS_TOKEN=gQAAAAAAAhU_AAIgcDE5YWRmNzBmMjRiMjg0YmNkYmY0ZTQ0MGZiNzZkYWY1OQ

ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL \
    NEXT_PUBLIC_CONVEX_SITE_URL=$NEXT_PUBLIC_CONVEX_SITE_URL \
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL \
    NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL \
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL \
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL \
    UPSTASH_REDIS_REST_URL=$UPSTASH_REDIS_REST_URL \
    UPSTASH_REDIS_REST_TOKEN=$UPSTASH_REDIS_REST_TOKEN \
    UPSTASH_REDIS_URL=$UPSTASH_REDIS_URL \
    UPSTASH_REDIS_TOKEN=$UPSTASH_REDIS_TOKEN

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm run build

# Stage 3: Runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root system user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static assets and public assets
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
