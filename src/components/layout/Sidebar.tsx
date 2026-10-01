'use client'

import { usePathname } from 'next/navigation'
import Link from '@/components/ui/NavigationLink'
import { useEffect, useRef, useState } from 'react'
import type { User } from '@/lib/types'
import Icon from '@/components/ui/Icon'
import styles from './Sidebar.module.css'

const PRIMARY_LINKS = [
  { label: 'Tổng quan', href: '/dashboard' },
  { label: 'Tickets', href: '/tickets' },
  { label: 'Shape Up', href: '/shapeups' },
  { label: 'Lịch sử email', href: '/emails' },
]
const ADMIN_LINKS = [
  { label: 'Dự án', href: '/admin/projects' },
  { label: 'Tài khoản', href: '/admin/users' },
  { label: 'Phân quyền PO', href: '/admin/assignments' },
]

export default function Navigation({ user }: { user?: User | null }) {
  const pathname = usePathname()
  const [adminOpen, setAdminOpen] = useState(false)
  const adminRef = useRef<HTMLDivElement>(null)
  const adminButtonRef = useRef<HTMLButtonElement>(null)
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (adminRef.current && !adminRef.current.contains(event.target as Node)) setAdminOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && adminOpen) {
        setAdminOpen(false)
        adminButtonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [adminOpen])

  return (
    <div className={styles.bar}>
      <nav className={styles.navigation} aria-label="Điều hướng chính">
        <div className={styles.primaryLinks}>
          {PRIMARY_LINKS.map(item => (
            <Link key={item.href} href={item.href} className={styles.navLink + (isActive(item.href) ? ' ' + styles.active : '')} aria-current={isActive(item.href) ? 'page' : undefined} onClick={() => setAdminOpen(false)}>
              {item.label}
            </Link>
          ))}
        </div>
        {user?.role === 'manager' && (
          <div className={styles.group} ref={adminRef}>
            <button ref={adminButtonRef} type="button" className={styles.navLink + (isActive('/admin') ? ' ' + styles.active : '')} aria-expanded={adminOpen} aria-controls="admin-navigation" onClick={() => setAdminOpen(!adminOpen)}>
              Quản trị <Icon name="chevronDown" size={14} className={adminOpen ? styles.rotated : undefined} />
            </button>
            {adminOpen && (
              <div className={styles.dropdown} id="admin-navigation">
                <span className={styles.dropdownLabel}>Quản lý hệ thống</span>
                {ADMIN_LINKS.map(item => <Link key={item.href} href={item.href} className={styles.subLink + (isActive(item.href) ? ' ' + styles.subActive : '')} aria-current={isActive(item.href) ? 'page' : undefined} onClick={() => setAdminOpen(false)}>{item.label}<Icon name="arrowRight" size={15} /></Link>)}
              </div>
            )}
          </div>
        )}
        <Link href="/settings/security" className={styles.navLink + ' ' + styles.settings + (isActive('/settings') ? ' ' + styles.active : '')} aria-current={isActive('/settings') ? 'page' : undefined} onClick={() => setAdminOpen(false)}>
          <Icon name="settings" size={18} /> <span>Cài đặt</span>
        </Link>
      </nav>
    </div>
  )
}
