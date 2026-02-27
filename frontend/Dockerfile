# ── Stage 1: Dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: Builder ────────────────────────────────────────────────
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
ARG NEXT_PUBLIC_VAULT_FACTORY_ADDRESS=0xD26ae761DEBE79Ca423A370C0085D75b26Ecaf28
ARG NEXT_PUBLIC_VAULT_IMPL_ADDRESS=0x1777f993b35fe74EcA9178DA576a71aaf9F06f8A
ARG NEXT_PUBLIC_ZK_VERIFIER_ADDRESS=0x528eeF03cE66493FAC386Bd7DAC6E4a89C4786f8
ARG NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=0xD5932aF5c315C0A1fD9D486E0f58b7C210866ADF
ARG NEXT_PUBLIC_LTV_ORACLE_ADDRESS=0x4B6171fA771fdA1F86445a5C06b0d5dA11875BC4
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

# ── Stage 3: Runner ─────────────────────────────────────────────────
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
