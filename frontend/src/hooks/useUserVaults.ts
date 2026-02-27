'use client'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { VaultRow } from '@/lib/api'

export type { VaultRow } from '@/lib/api'

export function useUserVaults(walletAddress: string | undefined) {
  const [vaults, setVaults] = useState<VaultRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVaults = useCallback(async (address: string) => {
    try {
      const data = await api.vaultsByWallet(address)
      setVaults(data.vaults)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch vaults:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch vaults')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!walletAddress) {
      setIsLoading(false)
      return
    }

    fetchVaults(walletAddress)

    // Poll every 15 seconds for updates (replaces Supabase realtime)
    const interval = setInterval(() => fetchVaults(walletAddress), 15_000)
    return () => clearInterval(interval)
  }, [walletAddress, fetchVaults])

  return { vaults, isLoading, error, refetch: () => walletAddress ? fetchVaults(walletAddress) : undefined }
}
