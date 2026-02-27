import { createConfig, http } from 'wagmi'
import { defineChain } from 'viem'

export const opBNBTestnet = defineChain({
  id: 5611,
  name: 'opBNB Testnet',
  nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://opbnb-testnet-rpc.bnbchain.org'] },
    public: { http: ['https://opbnb-testnet-rpc.bnbchain.org'] },
  },
  blockExplorers: {
    default: {
      name: 'opBNBScan',
      url: 'https://testnet.opbnbscan.com',
      apiUrl: 'https://api-testnet.opbnbscan.com/api',
    },
  },
  testnet: true,
})

export const wagmiConfig = createConfig({
  chains: [opBNBTestnet],
  transports: {
    [opBNBTestnet.id]: http('https://opbnb-testnet-rpc.bnbchain.org'),
  },
})
