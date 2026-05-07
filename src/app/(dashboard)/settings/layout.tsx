'use client'

import styles from './layout.module.css'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Cài đặt</h1>
        <p className="text-secondary mt-sm">Quản lý bảo mật, cấu hình AI và thiết lập email cá nhân</p>
      </div>

      <div className={styles.layout}>
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  )
}
