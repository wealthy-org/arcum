# Arcum Bun Backend API Dockerfile (Optimized for Railway & Container PaaS)
FROM oven/bun:1.4.2-alpine AS runner

WORKDIR /app

# Copy package manifests
COPY app/package.json app/bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy application source code
COPY app/src ./src
COPY app/tsconfig.json ./

ENV NODE_ENV=production
ENV CHAIN_ID=4663
ENV RPC_URL=https://rpc.mainnet.chain.robinhood.com

EXPOSE 3002

CMD ["bun", "run", "src/api/server.ts"]
