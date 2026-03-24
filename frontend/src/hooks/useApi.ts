import { useState, useEffect, useCallback } from 'react';

export function useApi<T>(fetcher: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

export function usePolling<T>(fetcher: () => Promise<T>, intervalMs: number, deps: any[] = []) {
  const result = useApi(fetcher, deps);

  useEffect(() => {
    const timer = setInterval(result.refetch, intervalMs);
    return () => clearInterval(timer);
  }, [result.refetch, intervalMs]);

  return result;
}
