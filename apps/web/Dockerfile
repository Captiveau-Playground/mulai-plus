# Use Node.js for building (Bun runtime has issues with Next.js build/Turbopack/worker_threads)
# We install Bun specifically for package management
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Install Bun
ENV BUN_INSTALL=/root/.bun
ENV PATH=$BUN_INSTALL/bin:$PATH
RUN apt-get update && apt-get install -y curl unzip && \
    curl -fsSL https://bun.sh/install | bash && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy the entire monorepo
COPY . .

# Use staging env for build
COPY apps/web/.env.staging apps/web/.env.production

# Install dependencies using Bun
# We need to ensure we use the same lockfile format
RUN bun install --no-progress

# Build Next.js app using Node (via npm run build)
# npm run build executes "next build" using the node executable
# npm handles finding the binary in node_modules/.bin (including parent dirs)
WORKDIR /app/apps/web

# Add build arguments for Next.js public variables
ARG NEXT_PUBLIC_SERVER_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

# Make them available during build
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

RUN npm run build

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# PORT will be overridden by docker-compose or runtime env
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy standalone build
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
