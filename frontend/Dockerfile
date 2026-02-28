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
ARG NEXT_PUBLIC_VAULT_FACTORY_ADDRESS=0xb881fAf4e552780f65Ae8FC1053AD46134b71173
ARG NEXT_PUBLIC_VAULT_IMPL_ADDRESS=0x45095a5b07Cd7231c4f1B12837b427a9a94AF1C0
ARG NEXT_PUBLIC_ZK_VERIFIER_ADDRESS=0x2925896cABAd4c6B7c505495948F79b3e9308C54
ARG NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=0xFB9D6eFE47a4b6175025C9Cd97b776B7e8d9916b
ARG NEXT_PUBLIC_LTV_ORACLE_ADDRESS=0x953386f1309b2BdA061d895aBddB17b9Db706744
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
