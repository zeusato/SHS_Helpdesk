import { useState, useEffect } from 'react'
import styles from '../shared.module.css'
import { encryptKey, decryptKey } from '@/lib/utils/crypto'

export default function AiSettingsPage() {
  const [geminiKey, setGeminiKey] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' })

  useEffect(() => {
    // Load Gemini API Key from localStorage
    const savedKey = localStorage.getItem('gemini_api_key')
    if (savedKey) {
      setGeminiKey(decryptKey(savedKey))
    }
  }, [])

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault()
    if (geminiKey.trim()) {
      localStorage.setItem('gemini_api_key', encryptKey(geminiKey.trim()))
      setStatus({ type: 'success', message: 'Đã lưu khoá API Gemini mã hoá vào trình duyệt.' })
    } else {
      localStorage.removeItem('gemini_api_key')
      setStatus({ type: 'success', message: 'Đã xoá khoá API khỏi trình duyệt.' })
    }

    setTimeout(() => {
      setStatus({ type: '', message: '' })
    }, 3000)
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">🤖 Tích hợp AI (Gemini API)</span>
      </div>
      
      <form className={styles.form} onSubmit={handleSaveApiKey}>
        <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-md)' }}>
          Nhập API Key của Google Gemini để kích hoạt các tính năng AI như gợi ý giải pháp Shape Up. 
          Khoá này sẽ được lưu an toàn trong trình duyệt của bạn (không lưu trên máy chủ). 
          Nếu chưa có, bạn có thể <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-brand)', textDecoration: 'underline' }}>lấy API Key tại đây</a>.
        </p>

        {status.message && (
          <div className={status.type === 'error' ? styles.alertError : styles.alertSuccess}>
            {status.message}
          </div>
        )}
        
        <div className="input-group">
          <label className="input-label">Gemini API Key</label>
          <input 
            type="password" 
            className="input" 
            value={geminiKey} 
            onChange={(e) => setGeminiKey(e.target.value)} 
            placeholder="AIzaSy..."
          />
        </div>
        
        <div className={styles.actions}>
          <button type="submit" className="btn btn-primary">Lưu cấu hình</button>
          {geminiKey && (
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={() => {
                setGeminiKey('');
                localStorage.removeItem('gemini_api_key');
                setStatus({ type: 'success', message: 'Đã xoá khoá API.' });
              }}
            >
              Xoá khoá
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
