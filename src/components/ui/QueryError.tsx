export default function QueryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  if (!message) return null
  return <div role="alert" className="query-error"><span>{message}</span><button className="btn btn-secondary btn-sm" onClick={onRetry}>Thử lại</button></div>
}
