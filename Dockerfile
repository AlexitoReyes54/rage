# ---------- Stage 1: Test ----------
FROM oven/bun:1.3.5-slim AS test

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .
RUN bun test


# ---------- Stage 2: Production ----------
FROM oven/bun:1.3.5-slim AS runner

WORKDIR /app

# Copy only necessary files
COPY --from=test /app/package.json ./
COPY --from=test /app/bun.lock ./
COPY --from=test /app/node_modules ./node_modules
COPY --from=test /app/server.ts ./server.ts
# (add src/ or other folders if needed)

ENV NODE_ENV=production

EXPOSE 3000

CMD ["bun", "run", "server.ts"]
