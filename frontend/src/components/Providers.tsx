'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider } from '@privy-io/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig, opBNBTestnet } from '@/lib/wagmi'
import { useState, type ReactNode } from 'react'
import { Toaster } from 'sonner'

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 2 },
    },
  }))

  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  if (!privyAppId) throw new Error('NEXT_PUBLIC_PRIVY_APP_ID is not set')

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ['wallet', 'email', 'google'],
        appearance: {
          theme: 'dark',
          accentColor: '#00F5FF',
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        defaultChain: opBNBTestnet,
        supportedChains: [opBNBTestnet],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: '#0A0A0F',
                border: '1px solid rgba(0,245,255,0.2)',
                color: '#fff',
              },
            }}
          />
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  )
}
