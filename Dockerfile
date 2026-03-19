FROM oven/bun:1.3.5-slim

WORKDIR /app

# Copy lockfile and package.json first for better caching
COPY package.json bun.lock ./
RUN bun install 

# Copy the rest of your source code
COPY . .

# Set production environment
ENV NODE_ENV=production

EXPOSE 3000

# Run the app
CMD ["bun", "run", "server.ts"]
