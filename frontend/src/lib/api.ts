const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

if (!BACKEND_URL) {
  console.warn('NEXT_PUBLIC_BACKEND_URL not set — backend features disabled')
}

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BACKEND_URL) throw new APIError(0, 'Backend URL not configured')

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new APIError(res.status, body.detail || `API error ${res.status}`)
  }

  return res.json()
}

// ── Types matching real backend response shapes ─────────────────────

export interface HealthResponse {
  status: string
  timestamp: string
}

export interface MetricsResponse {
  tvl: number
  active_vaults: number
  avg_ltv: number
}

export interface OptimizeRequest {
  vault_id: string
  assets: { symbol: string; value_usd: number; volatility: number; correlation_id?: number }[]
}

export interface OptimizeResponse {
  vault_id: string
  suggested_ltv_bps: number
  weights: Record<string, number>
  expected_cvar: number
  elapsed_ms: number
  converged: boolean
}

export interface VaultHealthResponse {
  vault_id: string
  status: string
  total_deposited: string
  total_borrowed: string
  current_ltv_bps: number
  health_factor: number
}

export interface VaultRow {
  id: string
  wallet_address: string
  vault_contract_address: string | null
  chain_id: number
  status: string
  total_deposited: string
  total_borrowed: string
  current_ltv_bps: number
  created_at: string
}

export interface VaultListResponse {
  wallet_address: string
  vaults: VaultRow[]
}

export interface VaultCreateRequest {
  wallet_address: string
  chain_id?: number
  vault_contract_address?: string
  total_deposited?: string
}

export interface VaultCreateResponse {
  id: string
  wallet_address: string
  chain_id: number
  status: string
  vault_contract_address?: string
}

export interface AgentActionRow {
  id: string
  agent_id: string
  vault_id: string | null
  action_type: string
  status: string
  created_at: string
}

export interface AgentActionsListResponse {
  wallet_address: string
  actions: AgentActionRow[]
}

export interface Position {
  symbol: string
  name: string
  quantity: number
  value_usd: number
  price_usd: number
}

export interface PositionsResponse {
  wallet: string
  positions: Position[]
  total_value_usd: number
}

// ── API client ──────────────────────────────────────────────────────

export const api = {
  health: () => apiFetch<HealthResponse>('/health'),

  metrics: () => apiFetch<MetricsResponse>('/metrics'),

  optimizeLTV: (
    vaultId: string,
    assets: { symbol: string; value_usd: number; volatility: number; correlation_id?: number }[],
  ) =>
    apiFetch<OptimizeResponse>('/optimize-ltv', {
      method: 'POST',
      body: JSON.stringify({ vault_id: vaultId, assets }),
    }),

  createVault: (data: VaultCreateRequest) =>
    apiFetch<VaultCreateResponse>('/vault/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  vaultsByWallet: (walletAddress: string) =>
    apiFetch<VaultListResponse>(`/vault/by-wallet/${walletAddress}`),

  vaultHealth: (vaultId: string) =>
    apiFetch<VaultHealthResponse>(`/vault/${vaultId}/health`),

  agentActions: (walletAddress: string) =>
    apiFetch<AgentActionsListResponse>(`/agent/actions/${walletAddress}`),

  positions: (walletAddress: string) =>
    apiFetch<PositionsResponse>(`/positions/${walletAddress}`),
}
