'use client'

import styles from './layout.module.css'
import Link from '@/components/ui/NavigationLink'
import { usePathname } from 'next/navigation'
import Icon, { type IconName } from '@/components/ui/Icon'

const sections: { href: string; label: string; icon: IconName }[] = [
  { href: '/settings/security', label: 'Bảo mật', icon: 'shield' },
  { href: '/settings/ai', label: 'Tích hợp AI', icon: 'sparkles' },
  { href: '/settings/mail', label: 'Email cá nhân', icon: 'mail' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Không gian cá nhân</span>
        <h1>Cài đặt</h1>
        <p className="text-secondary mt-sm">Quản lý bảo mật, cấu hình AI và thiết lập email cá nhân</p>
      </div>

      <nav className={styles.tabs} aria-label="Danh mục cài đặt">
        {sections.map(section => <Link key={section.href} href={section.href} className={pathname === section.href ? styles.active : ''} aria-current={pathname === section.href ? 'page' : undefined}><Icon name={section.icon} size={18} />{section.label}</Link>)}
      </nav>
      <div className={styles.layout}>
        <div className={styles.mainContent}>
          {children}
        </div>
      </div>
    </div>
  )
}
