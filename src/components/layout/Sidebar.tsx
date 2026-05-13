'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import type { User } from '@/lib/types'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: '📊',
  },
  {
    label: 'Tickets',
    href: '/tickets',
    icon: '🎫',
  },
  {
    label: 'Shape Up',
    href: '/shapeups',
    icon: '📚',
  },
  {
    label: 'Lịch sử Email',
    href: '/emails',
    icon: '📧',
  },
  {
    label: 'Quản trị',
    href: '/admin',
    icon: '⚙️',
    children: [
      { label: 'Dự án', href: '/admin/projects' },
      { label: 'Tài khoản', href: '/admin/users' },
      { label: 'Phân quyền PO', href: '/admin/assignments' },
    ],
  },
  {
    label: 'Cài đặt',
    href: '/settings',
    icon: '🔧',
    children: [
      { label: 'Bảo mật', href: '/settings/security' },
      { label: 'Tích hợp AI', href: '/settings/ai' },
      { label: 'Cấu hình Mail', href: '/settings/mail' },
    ],
  },
]

export default function Sidebar({ user }: { user?: User | null }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['/admin', '/settings'])

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (item.label === 'Quản trị' && user?.role !== 'manager') return false
    return true
  })

  const toggleGroup = (href: string) => {
    setExpandedGroups(prev =>
      prev.includes(href) ? prev.filter(g => g !== href) : [...prev, href]
    )
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* Mobile toggle */}
      <button
        className={styles.mobileToggle}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}>
        {/* Logo */}
        <div className={styles.logo}>
          <Image src="/LOGO.png" alt="Logo" width={32} height={32} className={styles.logoImg} />
          {!collapsed && <span className={styles.logoText}>SHS Helpdesk</span>}
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {visibleNavItems.map(item => (
            <div key={item.href}>
              {item.children ? (
                <>
                  <button
                    className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
                    onClick={() => toggleGroup(item.href)}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className={styles.navLabel}>{item.label}</span>
                        <span className={`${styles.chevron} ${expandedGroups.includes(item.href) ? styles.chevronOpen : ''}`}>
                          ›
                        </span>
                      </>
                    )}
                  </button>
                  {!collapsed && expandedGroups.includes(item.href) && (
                    <div className={styles.subNav}>
                      {item.children.map(child => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`${styles.subNavItem} ${pathname === child.href ? styles.active : ''}`}
                          onClick={() => setMobileOpen(false)}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Collapse toggle (desktop) */}
        <button
          className={styles.collapseBtn}
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Collapse sidebar"
        >
          {collapsed ? '»' : '«'}
        </button>
      </aside>
    </>
  )
}
