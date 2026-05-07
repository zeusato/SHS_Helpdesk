'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError('Email hoặc mật khẩu không đúng')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Đã có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginContainer}>
        {/* Left side - Branding */}
        <div className={styles.brandSide}>
          <div className={styles.brandContent}>
            <div className={styles.brandIcon}>🛡️</div>
            <h1 className={styles.brandTitle}>Helpdesk & Shape Up</h1>
            <p className={styles.brandDesc}>
              Hệ thống quản lý Ticket và Thư viện tri thức Shape Up.
              Tiếp nhận, xử lý và phản hồi nhanh chóng.
            </p>
            <div className={styles.features}>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>🎫</span>
                <span>Quản lý Ticket thông minh</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>📚</span>
                <span>Thư viện tri thức Shape Up</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>🤖</span>
                <span>Gợi ý giải pháp bằng AI</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className={styles.formSide}>
          <form className={styles.form} onSubmit={handleLogin}>
            <h2 className={styles.formTitle}>Đăng nhập</h2>
            <p className={styles.formSubtitle}>Nhập thông tin tài khoản để truy cập hệ thống</p>

            {error && (
              <div className={styles.error}>
                <span>⚠️</span> {error}
              </div>
            )}

            <div className="input-group">
              <label className="input-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="password">Mật khẩu</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className={`btn btn-primary btn-lg ${styles.loginBtn}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
