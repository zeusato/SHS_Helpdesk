'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'
import BrandLogo from '@/components/ui/BrandLogo'
import Icon from '@/components/ui/Icon'
import Link from 'next/link'

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

      if (!authError) {
        router.push('/dashboard')
        router.refresh()
        // We don't set loading(false) here to keep the button disabled during navigation
        return
      }
      
      setError('Email hoặc mật khẩu không đúng')
    } catch {
      setError('Đã có lỗi xảy ra. Vui lòng thử lại.')
    }
    setLoading(false)
  }

  return (
    <div className={styles.loginPage}>
      <header className={styles.header}>
        <div className={styles.identity}><BrandLogo /><span>Helpdesk<small>Không gian hỗ trợ nội bộ</small></span></div>
        <Link href="/portal" className={styles.portalLink} aria-label="Gửi yêu cầu hỗ trợ">Gửi yêu cầu hỗ trợ <Icon name="arrowRight" size={17} /></Link>
      </header>
      <main className={styles.loginContainer}>
        <section className={styles.brandSide} aria-labelledby="brand-heading">
          <div className={styles.brandContent}>
            <p className={styles.eyebrow}>TVSI / Kết nối & hỗ trợ</p>
            <h1 id="brand-heading" className={styles.brandTitle}>Cùng phối hợp.<br />Cùng giải quyết.</h1>
            <p className={styles.brandDesc}>
              Một không gian để tiếp nhận yêu cầu, theo dõi xử lý và chia sẻ tri thức trong đội ngũ TVSI.
            </p>
            <div className={styles.features}>
              <div className={styles.feature}>
                <Icon name="ticket" size={21} />
                <div><strong>Yêu cầu được kết nối</strong><span>Tiếp nhận và theo dõi ticket xuyên suốt.</span></div>
              </div>
              <div className={styles.feature}>
                <Icon name="book" size={21} />
                <div><strong>Kiến thức được sẻ chia</strong><span>Tìm giải pháp trong thư viện Shape Up.</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Right side - Login form */}
        <div className={styles.formSide}>
          <form className={styles.form} onSubmit={handleLogin} aria-busy={loading}>
            <p className={styles.eyebrow}>Chào mừng trở lại</p>
            <h2 className={styles.formTitle}>Đăng nhập</h2>
            <p className={styles.formSubtitle}>Nhập thông tin tài khoản để truy cập hệ thống</p>

            {error && (
              <div className={styles.error} role="alert">
                <Icon name="warning" size={18} /> {error}
              </div>
            )}

            <div className="input-group">
              <label className="input-label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                className="input"
                placeholder="Nhập email của bạn"
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
                name="password"
                type="password"
                autoComplete="current-password"
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
                <>Đăng nhập <Icon name="arrowRight" size={18} /></>
              )}
            </button>
            <p className={styles.formNote}><Icon name="lock" size={15} /> Sử dụng tài khoản đã được cấp để truy cập.</p>
          </form>
        </div>
      </main>
      <footer className={styles.footer}><span>TVSI Helpdesk</span><span>Công ty Cổ phần Chứng khoán Tân Việt</span></footer>
    </div>
  )
}
