import { http, createConfig } from "wagmi";
import { defineChain } from "viem";

export const opBNBTestnet = defineChain({
  id: 5611,
  name: "opBNB Testnet",
  nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://opbnb-testnet-rpc.bnbchain.org"] },
  },
  blockExplorers: {
    default: { name: "opBNBScan", url: "https://testnet.opbnbscan.com" },
  },
  testnet: true,
});

export const bscMainnet = defineChain({
  id: 56,
  name: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://bsc-dataseed.bnbchain.org"] },
  },
  blockExplorers: {
    default: { name: "BscScan", url: "https://bscscan.com" },
  },
});

export const wagmiConfig = createConfig({
  chains: [opBNBTestnet, bscMainnet],
  transports: {
    [opBNBTestnet.id]: http(),
    [bscMainnet.id]: http(),
  },
});
