# VaultForge — System Architecture

> Complete system design showing all components, data flows, security boundaries, and deployment topology.

---

## Full System Component Diagram

Every arrow is labeled with the data or action that flows through it.

```mermaid
graph TD
    subgraph UserLayer["User Layer"]
        WALLET["User Wallet<br/>(Privy Embedded AA)"]
    end

    subgraph FrontendLayer["Frontend — Vercel"]
        FE["Next.js 16 App Router<br/>+ wagmi 3.5 + viem 2.46<br/>+ shadcn/ui + Tailwind v4"]
    end

    subgraph BackendLayer["Backend — Docker"]
        API["FastAPI REST API<br/>(Python 3.12 + UV)"]
        OPT["LTV Optimizer<br/>(SciPy + PuLP)"]
        PROVER["ZK Proof Orchestrator"]
        LIMITER["Rate Limiter<br/>(slowapi)"]
        CACHE["Redis 7<br/>(Price Cache)"]
    end

    subgraph ZKLayer["ZK Layer — Circom 2.x"]
        CT["CollateralThreshold<br/>Circuit"]
        LTV_C["LTVComputation<br/>Circuit"]
        RS["ReputationScore<br/>Circuit"]
        SNARK["snarkjs Groth16<br/>Prover"]
    end

    subgraph ContractLayer["Smart Contracts — opBNB (Chain ID 5611)"]
        VF["VaultFactory.sol<br/>(EIP-1167 Clones)"]
        VAULT["Vault.sol<br/>(Deposit/Borrow/Repay)"]
        ZKV["ZKVerifier.sol<br/>(Groth16 + Nonce)"]
        AR["AgentRegistry.sol<br/>(Stake/Execute/Slash)"]
        LO["LTVOracle.sol<br/>(Optimistic Challenge)"]
    end

    subgraph AgentLayer["BNB AI Agent Framework"]
        AGENT_DN["Delta-Neutral<br/>Arbitrage Agent"]
        AGENT_YR["Yield Rotation<br/>Agent"]
        AGENT_HG["Hedge<br/>Agent"]
    end

    subgraph OracleLayer["Oracles"]
        CL["Chainlink<br/>BNB/USD Feed"]
        BNB_OR["BNB Native<br/>Price Oracle"]
    end

    subgraph RelayerLayer["Privacy & Gas"]
        RELAY["Privacy Relayer<br/>(Paymaster)"]
    end

    subgraph DataLayer["Data Layer"]
        DB[("Supabase Postgres<br/>+ RLS + Realtime")]
    end

    %% User → Frontend
    WALLET -->|"sign tx / social login"| FE

    %% Frontend → Backend
    FE -->|"REST: proof requests,<br/>vault queries, health checks"| API
    FE -->|"wagmi tx: deposit,<br/>borrow, repay, withdraw"| VAULT
    FE -->|"wagmi tx: deployVault"| VF

    %% Backend internal
    API --> OPT
    API --> PROVER
    API --> LIMITER
    API -->|"cache price feeds<br/>(TTL 30s)"| CACHE

    %% Backend → ZK
    PROVER -->|"circuit inputs<br/>(private: amounts,<br/>public: thresholds)"| SNARK
    SNARK --> CT & LTV_C & RS
    SNARK -->|"proof {pA, pB, pC,<br/>publicSignals}"| PROVER

    %% Backend → Contracts
    API -->|"submitOptimization<br/>(vault, ltv, proof)"| LO
    API -->|"read collateral,<br/>debt, health factor"| VAULT

    %% Backend → Database
    API -->|"INSERT/UPDATE vault records,<br/>borrow history, ZK hashes"| DB

    %% Contract interactions
    VF -->|"clone + initialize<br/>(owner, zkVerifier)"| VAULT
    VAULT -->|"verifyProof(pA,pB,pC,<br/>pubSignals)"| ZKV
    VAULT -->|"markProofUsed<br/>(hash, nonce)"| ZKV
    AR -->|"executeAction<br/>(vault, calldata)"| VAULT
    LO -->|"setOptimalLTV<br/>(vault, bps)"| VAULT

    %% Agents → Contracts
    AGENT_DN -->|"rebalance calls<br/>via AgentRegistry"| AR
    AGENT_YR -->|"rotate yield strategy"| AR
    AGENT_HG -->|"hedge collateral<br/>exposure"| AR

    %% Oracles → Backend
    CL -->|"BNB/USD price<br/>(latest round)"| API
    BNB_OR -->|"native token<br/>price data"| API

    %% Relayer
    RELAY -->|"meta-tx: gasless<br/>user operations"| VAULT
    FE -->|"UserOp (ERC-4337)"| RELAY

    %% Database → Frontend
    DB -->|"Realtime subscription:<br/>vault updates, health factor"| FE
```

---

## ZK Proof Flow — Detailed

This diagram traces exactly how a zero-knowledge proof is created, verified, and consumed — from raw asset data to an on-chain borrow.

```mermaid
graph LR
    subgraph Private["Private Inputs (never leave client)"]
        A1["Collateral Amounts<br/>(10 BNB, 5000 USDT)"]
        A2["Wallet Balances<br/>(raw token amounts)"]
        A3["Repayment History<br/>(timestamps, amounts)"]
    end

    subgraph Hash["Commitment Layer"]
        B1["Poseidon Hash<br/>(collision-resistant)"]
    end

    subgraph Circuit["Circom 2.x Circuits"]
        C1["CollateralThreshold<br/>proves: total ≥ minimum"]
        C2["LTVComputation<br/>proves: debt/collateral ≤ max"]
        C3["ReputationScore<br/>proves: score ≥ threshold"]
    end

    subgraph Prove["snarkjs Groth16"]
        D1["Generate Proof<br/>{pA, pB, pC}"]
        D2["Public Signals<br/>(threshold, LTV, score)"]
    end

    subgraph OnChain["On-Chain (opBNB)"]
        E1["ZKVerifier.sol<br/>verifyProof()"]
        E2["markProofUsed<br/>(hash + nonce)"]
        E3["Vault.borrow()<br/>release funds"]
    end

    A1 & A2 & A3 --> B1
    B1 -->|"commitment<br/>(public)"| C1 & C2 & C3
    A1 -->|"private witness"| C1
    A1 -->|"private witness"| C2
    A3 -->|"private witness"| C3
    C1 & C2 & C3 --> D1
    D1 --> D2
    D1 -->|"proof bytes"| E1
    D2 -->|"public signals"| E1
    E1 -->|"valid ✓"| E2
    E2 -->|"nonce incremented"| E3
    E3 -->|"USDT transferred<br/>to user wallet"| F1["User receives funds"]

    style A1 fill:#FF6B6B,color:#fff
    style A2 fill:#FF6B6B,color:#fff
    style A3 fill:#FF6B6B,color:#fff
    style F1 fill:#00F5FF,color:#000
```

**Key property:** The red nodes (private inputs) never leave the user's browser. Only the proof and public signals go on-chain. The verifier contract confirms the proof is valid without learning what the actual amounts are.

---

## Data Flow Table

Every user action mapped to its on-chain effect, off-chain computation, and database update.

| Action | Who Initiates | What Happens On-Chain | What Happens Off-Chain | Database Update |
|---|---|---|---|---|
| **Connect Wallet** | User (via Privy) | — | Privy creates/loads embedded AA wallet; session JWT issued | `INSERT INTO users (wallet, auth_provider, created_at)` |
| **Deploy Vault** | User (first visit) | `VaultFactory.deployVault()` emits `VaultDeployed` event; EIP-1167 proxy created | Frontend reads event, extracts vault address | `INSERT INTO vaults (user_id, vault_address, chain_id, status)` |
| **Deposit Collateral** | User | `Vault.deposit(token, amount)` — ERC-20 transferred to vault contract | Frontend computes Poseidon hash of balance for ZK commitment | `UPDATE vault_positions SET collateral_hash = $hash, updated_at = now()` |
| **Request LTV Optimization** | AI Agent (via Backend) | `LTVOracle.submitOptimization(vault, ltv, proof)` — starts challenge window | Backend runs SciPy/PuLP optimization on portfolio composition | `INSERT INTO ltv_optimizations (vault, proposed_ltv, status, expires_at)` |
| **Challenge Optimization** | Any observer | `LTVOracle.challengeOptimization(id, counterProof)` — resets LTV | Backend validates counter-proof, recalculates | `UPDATE ltv_optimizations SET status = 'challenged'` |
| **Finalize LTV** | Backend (after window) | `LTVOracle.finalizeOptimization(id)` — LTV locked on-chain | Backend confirms no challenges in window | `UPDATE ltv_optimizations SET status = 'finalized'` |
| **Generate ZK Proof** | User (click "Borrow") | — | snarkjs Groth16 prover runs CollateralThreshold + LTVComputation circuits | `INSERT INTO proof_requests (vault, circuit, status, created_at)` |
| **Borrow** | User | `Vault.borrow(token, amount, pA, pB, pC, pubSignals)` — ZKVerifier validates, nonce incremented, tokens transferred | Backend logs tx hash, updates health factor | `INSERT INTO borrows (vault, token, amount, proof_hash, tx_hash, status)` |
| **Monitor Health** | AI Agent (continuous) | `Vault.getCollateral()` + `getDebt()` read calls (no gas) | Backend computes health factor from Chainlink price + on-chain state | `UPDATE vault_health SET health_factor = $hf, checked_at = now()` |
| **Agent Rebalance** | AI Agent | `AgentRegistry.executeAction(vault, rebalanceCalldata)` | Agent decides rebalance strategy (delta-neutral, yield rotation, hedge) | `INSERT INTO agent_actions (agent, vault, action_type, tx_hash)` |
| **Repay Debt** | User | `Vault.repay(token, amount)` — tokens transferred from user to vault, debt reduced | Backend updates health factor, reputation score | `UPDATE borrows SET status = 'repaid'; UPDATE reputation_scores SET score_hash = $new` |
| **Withdraw Collateral** | User | `Vault.withdraw(token, amount)` — tokens returned (only if no debt) | Frontend updates displayed balances | `UPDATE vault_positions SET collateral_hash = $new_hash` |
| **Trigger Default** | Anyone (if debt > 0) | `Vault.triggerDefault(token)` — marks position as defaulted | Backend alerts user, logs default | `UPDATE borrows SET status = 'defaulted'` |
| **Seize Collateral** | Anyone (after default) | `Vault.seize(token)` — max 50% of collateral seized (partial seizure) | Backend logs seizure, updates insurance pool stats | `INSERT INTO seizures (vault, token, amount_seized, penalty)` |
| **Register AI Agent** | Agent operator | `AgentRegistry.registerAgent()` — 0.01 BNB staked | Backend tracks agent registration | `INSERT INTO agents (address, owner, stake, status)` |
| **Slash Agent** | Admin | `AgentRegistry.slash(agent, amount)` — stake reduced | Backend logs slashing event | `UPDATE agents SET stake = stake - $amount, slashed = true` |
| **Update Reputation** | Backend (after repay) | — | snarkjs generates ReputationScore proof (off-chain) | `UPDATE reputation_scores SET score_hash = $hash, updated_at = now()` |

---

## Security Model

### What VaultForge Never Sees

| Secret | Where It Lives | Who Has Access |
|---|---|---|
| **User private keys** | Privy's secure enclave (HSM) or user's hardware wallet | User only — never touches VaultForge servers |
| **Raw collateral amounts** | User's browser (ephemeral, during proof generation) | User only — discarded after ZK proof is built |
| **Wallet seed phrases** | User's device / Privy infrastructure | User only — VaultForge has zero access |
| **Authentication secrets** | Privy infrastructure | Privy only — VaultForge receives JWT, never raw auth data |

### What's Stored Where

| Data | Storage Location | Format | Access Control |
|---|---|---|---|
| **Collateral positions** | Supabase Postgres | **Poseidon hash only** — never plaintext amounts | RLS: user can only read own rows |
| **Borrow records** | Supabase Postgres | Amount + token + proof hash + tx hash | RLS: user can only read own rows |
| **ZK proofs (used)** | opBNB on-chain (`ZKVerifier.sol`) | Proof hash stored in `isProofUsed` mapping | Public (but hash reveals nothing) |
| **Vault nonces** | opBNB on-chain (`ZKVerifier.sol`) | Incrementing uint256 per vault | Public (replay prevention counter) |
| **LTV optimizations** | opBNB on-chain (`LTVOracle.sol`) | LTV in basis points + optimization ID | Public (protocol transparency) |
| **Health factor history** | Supabase Postgres | Computed ratio (no raw amounts) | RLS: user can only read own rows |
| **Reputation scores** | Supabase Postgres | **ZK hash only** — raw score never stored | RLS: user can only read own rows |
| **Price feeds** | Redis (30s TTL) | Chainlink price integer | Backend-only, ephemeral cache |
| **Agent actions** | Supabase Postgres | Action type + tx hash (no vault amounts) | RLS: agent owner reads own actions |
| **User sessions** | Privy infrastructure | JWT with wallet address claim | Privy manages; VaultForge validates JWT signature |

### On-Chain vs Off-Chain Boundary

```mermaid
graph TB
    subgraph OnChain["On-Chain (opBNB) — Trustless, Verifiable"]
        OC1["Token balances in Vault contract"]
        OC2["ZK proof verification result (pass/fail)"]
        OC3["Proof hash + nonce (replay prevention)"]
        OC4["LTV parameters (basis points)"]
        OC5["Agent stakes + fee pool"]
        OC6["Default/seizure state machine"]
    end

    subgraph OffChain["Off-Chain — Privacy-Preserving"]
        OF1["ZK proof generation (Groth16)"]
        OF2["LTV optimization (SciPy/PuLP)"]
        OF3["Reputation score computation"]
        OF4["Health factor monitoring"]
        OF5["AI agent decision logic"]
        OF6["Price feed caching"]
    end

    subgraph NeverStored["Never Stored Anywhere"]
        NS1["Raw collateral amounts in DB"]
        NS2["User private keys on server"]
        NS3["Plaintext reputation scores"]
        NS4["Wallet seed phrases"]
    end

    style OnChain fill:#1a1a2e,color:#00F5FF,stroke:#00F5FF
    style OffChain fill:#1a1a2e,color:#FFAA00,stroke:#FFAA00
    style NeverStored fill:#1a1a2e,color:#FF6B6B,stroke:#FF6B6B
```

### Security Invariants (Enforced by Smart Contracts)

| Invariant | Enforced By | Mechanism |
|---|---|---|
| **No borrow without valid ZK proof** | `Vault.sol` → `ZKVerifier.sol` | `borrow()` calls `verifyProof()` — reverts if invalid |
| **No proof replay** | `ZKVerifier.sol` | `isProofUsed[hash]` mapping + per-vault nonce counter |
| **Partial seizure only** | `Vault.sol` | `MAX_SEIZURE_RATIO = 50%` — contract enforces ceiling |
| **One vault per user** | `VaultFactory.sol` | `userVaults[owner] != address(0)` check; reverts on duplicate |
| **Non-reentrant on all state changes** | All 5 contracts | OpenZeppelin `ReentrancyGuard` on every external mutating function |
| **Agent must be staked** | `AgentRegistry.sol` | `MIN_STAKE = 0.01 BNB` required to register; slashable |
| **LTV within bounds** | `LTVOracle.sol` | `MIN_LTV_BPS = 1000` (10%), `MAX_LTV_BPS = 9000` (90%) |
| **Challenge window before LTV finalization** | `LTVOracle.sol` | 1-hour window (testnet); anyone can challenge with counter-proof |
| **Owner-only withdrawals** | `Vault.sol` | `onlyOwner` modifier — only vault creator can withdraw collateral |
| **No withdrawal with outstanding debt** | `Vault.sol` | `withdraw()` reverts if `getDebt(token) > 0` |

### Trust Assumptions

| Component | Trust Level | Justification |
|---|---|---|
| **opBNB L2** | Trust BNB Chain validators | Standard L2 trust model; fraud proofs in development |
| **Chainlink price feeds** | Trust Chainlink oracles | Industry standard; decentralized oracle network |
| **Privy auth** | Trust Privy infrastructure | SOC 2 certified; keys in HSM enclaves |
| **snarkjs Groth16** | Trust trusted setup ceremony | Using Hermez `powersOfTau28_hez_final_14` (community ceremony) |
| **VaultForge backend** | Minimize trust via ZK | Backend never sees raw amounts; ZK proofs are verified on-chain, not by backend |
| **AI agents** | Minimized trust via staking + slashing | Agents post 0.01 BNB bond; admin can slash for misbehavior |
| **Supabase** | Trust Supabase infra + RLS | RLS policies enforced at database level; service key never in frontend |

---

## Deployment Topology

```mermaid
graph TB
    subgraph Vercel["Vercel Edge Network"]
        FE_PROD["Next.js 16<br/>Static + SSR<br/>CDN-distributed"]
    end

    subgraph Docker["Docker Compose (Dev/Judging)"]
        FE_DEV["Frontend :3000"]
        BE_DEV["Backend :8000"]
        PG_DEV["Postgres :5432"]
        RD_DEV["Redis :6379"]
    end

    subgraph Railway["Railway (Production Backend)"]
        BE_PROD["FastAPI<br/>Auto-scaling"]
    end

    subgraph Supabase["Supabase Cloud"]
        DB_PROD["Postgres + RLS<br/>+ Realtime"]
    end

    subgraph opBNB["opBNB Testnet (Chain ID 5611)"]
        CONTRACTS["5 Smart Contracts<br/>Verified on opBNBScan"]
    end

    FE_PROD -->|"REST"| BE_PROD
    FE_PROD -->|"RPC"| CONTRACTS
    BE_PROD -->|"SQL"| DB_PROD
    BE_PROD -->|"RPC"| CONTRACTS

    FE_DEV -->|"REST"| BE_DEV
    BE_DEV -->|"SQL"| PG_DEV
    BE_DEV -->|"cache"| RD_DEV

    style Vercel fill:#000,color:#fff,stroke:#00F5FF
    style Docker fill:#0d1117,color:#fff,stroke:#FFAA00
    style opBNB fill:#F0B90B,color:#000,stroke:#F0B90B
```

| Environment | Frontend | Backend | Database | Contracts |
|---|---|---|---|---|
| **Local Dev** | `npm run dev` (:3000) | `uvicorn --reload` (:8000) | Docker Postgres (:5432) | Foundry Anvil (local fork) |
| **Docker Judging** | `docker compose up` (:3000) | Same compose (:8000) | Same compose (:5432) | opBNB Testnet |
| **Production** | Vercel Edge (CDN) | Railway (auto-scale) | Supabase Cloud | opBNB Mainnet |
