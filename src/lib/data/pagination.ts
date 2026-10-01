export const PAGE_SIZE = 50

// Quote PostgREST filter values and treat LIKE metacharacters as literal input.
export function literalContains(value: string) {
  return `%${value.trim().slice(0, 200).replace(/[\\%_*]/g, '\\$&')}%`
}

export function ticketSearchFilter(value: string) {
  const pattern = JSON.stringify(literalContains(value))
  return ['title', 'requester_name', 'requester_email'].map(column => `${column}.ilike.${pattern}`).join(',')
}

export interface QueryResult {
  data: unknown[] | null
  error: { message: string } | null
}

export async function readPage<T>(load: (from: number, to: number, signal: AbortSignal) => PromiseLike<QueryResult>, page: number, signal: AbortSignal) {
  // Fetch one extra row instead of counting the entire filtered table.
  const { data, error } = await load(page * PAGE_SIZE, (page + 1) * PAGE_SIZE, signal)
  if (error) throw new Error(error.message)
  const rows = data || []
  return { rows: rows.slice(0, PAGE_SIZE) as T[], hasNext: rows.length > PAGE_SIZE }
}
