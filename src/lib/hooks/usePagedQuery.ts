'use client'

import { useEffect, useState } from 'react'
import { readPage, type QueryResult } from '@/lib/data/pagination'

type Loader = (from: number, to: number, signal: AbortSignal) => PromiseLike<QueryResult>

export function usePagedQuery<T>(load: Loader, filterKey = '', delay = 0) {
  const [cursor, setCursor] = useState({ filterKey, page: 0 })
  const [revision, setRevision] = useState(0)
  const page = cursor.filterKey === filterKey ? cursor.page : 0
  const key = JSON.stringify([filterKey, page, revision])
  const [result, setResult] = useState<{ key: string; rows: T[]; hasNext: boolean; error: string }>({ key: '', rows: [], hasNext: false, error: '' })

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const data = await readPage<T>(load, page, controller.signal)
        if (!controller.signal.aborted) setResult({ key, ...data, error: '' })
      } catch {
        if (!controller.signal.aborted) setResult({ key, rows: [], hasNext: false, error: 'Không tải được dữ liệu. Vui lòng thử lại.' })
      }
    }, delay)
    return () => { clearTimeout(timer); controller.abort() }
  }, [load, page, key, delay])

  const loading = result.key !== key
  return {
    rows: loading ? [] : result.rows, loading,
    error: loading ? '' : result.error,
    hasNext: !loading && result.hasNext, page,
    setPage: (next: number) => setCursor({ filterKey, page: Math.max(0, next) }),
    reload: () => setRevision(value => value + 1),
  }
}
