# Use Bun to run the server
FROM oven/bun:1.2 AS builder
WORKDIR /app

# Copy the entire monorepo
COPY . .

# Install dependencies (including devDeps for build if needed, but we try to bundle)
RUN bun install --no-progress

# Bundle the server into a single file
# This removes the need for node_modules in the final image
# We target 'bun' to support top-level await and other Bun features
RUN bun build --target=bun ./apps/server/src/index.ts --outfile server.js

# Final stage - minimal image
FROM oven/bun:1.2-slim
WORKDIR /app

# Copy only the bundled server file
COPY --from=builder /app/server.js .

# Set production environment
ENV NODE_ENV=production
# PORT will be overridden by docker-compose or runtime env
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Run the bundled server
CMD ["bun", "server.js"]
