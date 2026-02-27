import type { PrivyClientConfig } from "@privy-io/react-auth";

export const privyConfig: PrivyClientConfig = {
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets",
    },
  },
  loginMethods: ["wallet", "email"],
  appearance: {
    theme: "dark",
    accentColor: "#00F5FF",
  },
  defaultChain: {
    id: 5611,
    name: "opBNB Testnet",
    nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://opbnb-testnet-rpc.bnbchain.org"] },
    },
  } as never, // Chain type from Privy differs from viem — safe cast
  supportedChains: [
    {
      id: 5611,
      name: "opBNB Testnet",
      nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
      rpcUrls: {
        default: { http: ["https://opbnb-testnet-rpc.bnbchain.org"] },
      },
    } as never,
    {
      id: 56,
      name: "BNB Smart Chain",
      nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
      rpcUrls: {
        default: { http: ["https://bsc-dataseed.bnbchain.org"] },
      },
    } as never,
  ],
};
