import { useState, useEffect, useCallback, useRef } from 'react'
import { getCache, setCache, clearCache, isDataChanged } from '@/lib/utils/cache'

interface UseCachedFetchOptions {
  cacheKey: string
  fetchFn: () => Promise<any>
  skipCache?: boolean
  onDataChange?: (data: any) => void
}

/**
 * Unified hook for cached data fetching with stale-while-revalidate pattern
 * Always shows cache immediately (if available) and fetches fresh data in background
 * localStorage has no expiration - only API layer (Next.js revalidate) controls freshness
 */
export function useCachedFetch<T>({
  cacheKey,
  fetchFn,
  skipCache = false,
  onDataChange,
}: UseCachedFetchOptions) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)
  const fetchFnRef = useRef(fetchFn)
  const onDataChangeRef = useRef(onDataChange)

  // Keep refs updated
  useEffect(() => {
    fetchFnRef.current = fetchFn
    onDataChangeRef.current = onDataChange
  }, [fetchFn, onDataChange])

  const fetchFreshData = useCallback(async (key: string) => {
    // Prevent concurrent fetches
    if (fetchingRef.current) return
    fetchingRef.current = true

    try {
      const freshData = await fetchFnRef.current()

      // Only update if data actually changed
      const cached = getCache<T>(key)
      if (!cached || isDataChanged(cached, freshData)) {
        setData(freshData)
        onDataChangeRef.current?.(freshData)
      }

      // Update cache
      setCache(key, freshData)
    } catch (error) {
      console.error(`Error fetching data for ${key}:`, error)
      // If fetch fails and we have cache, keep showing cache
      const cached = getCache<T>(key)
      if (!cached) {
        setLoading(false)
      }
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [])

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      // Always show cache first if available
      const cached = getCache<T>(cacheKey)

      if (cached && !skipCache && !forceRefresh) {
        setData(cached)
        setLoading(false)

        // Always fetch fresh data in background (no maxAge check)
        if (!fetchingRef.current) {
          fetchFreshData(cacheKey)
        }
        return
      }

      // No cache or skipCache/forceRefresh=true, fetch fresh data
      await fetchFreshData(cacheKey)
    },
    [cacheKey, skipCache, fetchFreshData]
  )

  const invalidateCache = useCallback(() => {
    clearCache(cacheKey)
  }, [cacheKey])

  const prevCacheKeyRef = useRef<string | null>(null)
  const skipCacheRef = useRef(skipCache)

  // Keep refs updated
  useEffect(() => {
    skipCacheRef.current = skipCache
  }, [skipCache])

  useEffect(() => {
    // Only fetch on mount or when cacheKey changes
    const cacheKeyChanged = prevCacheKeyRef.current !== cacheKey
    if (cacheKeyChanged) {
      prevCacheKeyRef.current = cacheKey

      // Always show cache first if available
      const cached = getCache<T>(cacheKey)

      if (cached && !skipCacheRef.current) {
        setData(cached)
        setLoading(false)

        // Always fetch fresh data in background (no maxAge check)
        if (!fetchingRef.current) {
          fetchFreshData(cacheKey)
        }
      } else {
        // No cache or skipCache=true, fetch fresh data
        fetchFreshData(cacheKey)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]) // Only depend on cacheKey

  const updateData = useCallback(
    (newData: T) => {
      setData(newData)
      setCache(cacheKey, newData)
    },
    [cacheKey]
  )

  return {
    data,
    loading,
    refetch: () => fetchData(true),
    invalidateCache,
    updateData, // Allow direct data updates for optimistic updates
  }
}

