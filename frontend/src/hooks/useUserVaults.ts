'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface VaultRow {
  id: string
  user_id: string
  wallet_address: string
  vault_contract_address: string | null
  chain_id: number
  status: string
  total_deposited: string
  total_borrowed: string
  current_ltv_bps: number
  created_at: string
}

export function useUserVaults(walletAddress: string | undefined) {
  const [vaults, setVaults] = useState<VaultRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!walletAddress) {
      setIsLoading(false)
      return
    }

    const address = walletAddress.toLowerCase()

    // Initial fetch
    supabase
      .from('vaults')
      .select('*')
      .eq('wallet_address', address)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) {
          console.error('Failed to fetch vaults:', err)
          setError(err.message)
        } else {
          setVaults(data || [])
        }
        setIsLoading(false)
      })

    // Real-time subscription for vault updates
    const channel = supabase
      .channel(`user-vaults-${address}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vaults',
          filter: `wallet_address=eq.${address}`,
        },
        (payload) => {
          setVaults((prev) => [payload.new as VaultRow, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vaults',
          filter: `wallet_address=eq.${address}`,
        },
        (payload) => {
          setVaults((prev) =>
            prev.map((v) => (v.id === payload.new.id ? (payload.new as VaultRow) : v))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [walletAddress])

  return { vaults, isLoading, error }
}
