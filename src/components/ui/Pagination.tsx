import { PAGE_SIZE } from '@/lib/data/pagination'

export default function Pagination({ page, count, hasNext, loading, onChange }: {
  page: number; count: number; hasNext: boolean; loading: boolean; onChange: (page: number) => void
}) {
  return <nav aria-label="Phân trang" className="pagination">
    <span className="text-secondary text-sm" aria-live="polite">{loading ? 'Đang tải…' : count ? `Hiển thị ${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + count}` : 'Không có kết quả'}</span>
    <div className="flex gap-sm items-center">
      <button className="btn btn-secondary btn-sm" disabled={loading || page === 0} onClick={() => onChange(page - 1)}>Trang trước</button>
      <span className="text-sm">Trang {page + 1}</span>
      <button className="btn btn-secondary btn-sm" disabled={loading || !hasNext} onClick={() => onChange(page + 1)}>Trang sau</button>
    </div>
  </nav>
}
