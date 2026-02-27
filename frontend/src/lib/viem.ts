import { createPublicClient, http, decodeEventLog } from 'viem'
import type { TransactionReceipt } from 'viem'
import { VAULT_FACTORY_ABI } from '@/lib/contracts'

/** opBNB Testnet chain definition */
const opBNBTestnet = {
  id: 5611,
  name: 'opBNB Testnet',
  nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://opbnb-testnet-rpc.bnbchain.org'] },
  },
  blockExplorers: {
    default: { name: 'opBNBScan', url: 'https://opbnb-testnet.bscscan.com' },
  },
} as const

/** Public viem client for read-only RPC calls on opBNB Testnet */
export const publicClient = createPublicClient({
  chain: opBNBTestnet,
  transport: http(),
})

/**
 * Extract the deployed vault address from a `deployVault` transaction receipt.
 * Decodes the `VaultDeployed(address indexed owner, address indexed vault)` event.
 * Returns the vault address or `null` if the event wasn't found.
 */
export function getVaultAddressFromReceipt(
  receipt: TransactionReceipt,
): `0x${string}` | null {
  for (const log of receipt.logs) {
    try {
      const event = decodeEventLog({
        abi: VAULT_FACTORY_ABI,
        data: log.data,
        topics: log.topics,
      })
      if (event.eventName === 'VaultDeployed') {
        return (event.args as { vault: `0x${string}` }).vault
      }
    } catch {
      // Not a VaultDeployed event — skip
    }
  }
  return null
}

/**
 * Wait for a tx hash to be confirmed, then extract the vault address.
 */
export async function getVaultAddressFromTxHash(
  txHash: `0x${string}`,
): Promise<`0x${string}`> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
  const addr = getVaultAddressFromReceipt(receipt)
  if (!addr) throw new Error('VaultDeployed event not found in receipt')
  return addr
}
