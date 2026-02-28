# â”€â”€ Stage 1: Dependencies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# â”€â”€ Stage 2: Builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time env vars with fallbacks so `docker compose up --build` works
# without a fully populated .env. Real values injected at runtime.
ARG NEXT_PUBLIC_PRIVY_APP_ID=placeholder
ARG NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
ARG NEXT_PUBLIC_CHAIN_ID=5611
ARG NEXT_PUBLIC_OPBNB_RPC=https://opbnb-testnet-rpc.bnbchain.org
ARG NEXT_PUBLIC_VAULT_FACTORY_ADDRESS=0xEd871ed2D9281B175B42597b50748B9Ee8e951F7
ARG NEXT_PUBLIC_VAULT_IMPL_ADDRESS=0x671419bb5a8CeF7547f661212030F998B7992ACE
ARG NEXT_PUBLIC_ZK_VERIFIER_ADDRESS=0x05bcAB91C51104853f796F5D7bd57EF8077E904D
ARG NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=0xD233dEbF4C760f93AA61C6fA7f668c19CA93aaC0
ARG NEXT_PUBLIC_LTV_ORACLE_ADDRESS=0x16165ad7A069Ada84F97a6311c9A62c700AC43d8
ENV NEXT_PUBLIC_PRIVY_APP_ID=$NEXT_PUBLIC_PRIVY_APP_ID
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID
ENV NEXT_PUBLIC_OPBNB_RPC=$NEXT_PUBLIC_OPBNB_RPC
ENV NEXT_PUBLIC_VAULT_FACTORY_ADDRESS=$NEXT_PUBLIC_VAULT_FACTORY_ADDRESS
ENV NEXT_PUBLIC_VAULT_IMPL_ADDRESS=$NEXT_PUBLIC_VAULT_IMPL_ADDRESS
ENV NEXT_PUBLIC_ZK_VERIFIER_ADDRESS=$NEXT_PUBLIC_ZK_VERIFIER_ADDRESS
ENV NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=$NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS
ENV NEXT_PUBLIC_LTV_ORACLE_ADDRESS=$NEXT_PUBLIC_LTV_ORACLE_ADDRESS

RUN npm run build

# â”€â”€ Stage 3: Runner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
