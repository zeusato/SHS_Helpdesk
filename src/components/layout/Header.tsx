'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User, Notification } from '@/lib/types'
import styles from './Header.module.css'
import Link from 'next/link'
import BrandLogo from '@/components/ui/BrandLogo'
import Icon from '@/components/ui/Icon'

interface HeaderProps {
  user: User | null
}

import { useTheme } from '@/components/providers/ThemeProvider'

export default function Header({ user }: HeaderProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { theme, toggleTheme } = useTheme()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const unreadCount = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    if (!user) return
    // Fetch existing notifications
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (data) setNotifications(data)
    }
    fetchNotifications()

    // Realtime subscription
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev.filter(item => item.id !== payload.new.id)].slice(0, 20))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, supabase])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
    }
    document.addEventListener('mousedown', handler)
    const escape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (notifRef.current?.contains(document.activeElement)) notifRef.current.querySelector('button')?.focus()
      if (profileRef.current?.contains(document.activeElement)) profileRef.current.querySelector('button')?.focus()
      setShowNotifications(false)
      setShowProfile(false)
    }
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', escape)
    }
  }, [])

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    if (!user) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const roleLabel = user?.role === 'manager' ? 'Quản trị viên' : 'Product Owner'

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
      <div className={styles.headerLeft}>
        <Link href="/dashboard" className={styles.brandLink} aria-label="TVSI Helpdesk — Tổng quan"><BrandLogo /></Link>
        <div className={styles.brandTitle}><strong>Helpdesk</strong><span>Không gian hỗ trợ nội bộ</span></div>
      </div>

      <div className={styles.headerRight}>
        {/* Theme Toggle */}
        <button 
          className={styles.iconBtn} 
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Chuyển sang Chế độ sáng' : 'Chuyển sang Chế độ tối'}
          aria-label={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
        >
          <Icon name={mounted && theme === 'dark' ? 'sun' : 'moon'} size={19} />
        </button>

        {/* Notifications */}
        <div className={styles.dropdown} ref={notifRef}>
          <button
            className={styles.iconBtn}
            onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false) }}
            aria-label="Thông báo"
            aria-expanded={showNotifications}
            aria-controls="notifications-panel"
          >
            <Icon name="bell" size={19} />
            {unreadCount > 0 && (
              <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className={styles.dropdownMenu + ' ' + styles.notifMenu} id="notifications-panel" aria-label="Thông báo gần đây">
              <div className={styles.dropdownHeader}>
                <span>Thông báo</span>
                {unreadCount > 0 && (
                  <button className={styles.markAllBtn} onClick={markAllRead}>
                    Đánh dấu tất cả đã đọc
                  </button>
                )}
              </div>
              <div className={styles.notifList}>
                {notifications.length === 0 ? (
                  <div className={styles.emptyNotif}>Không có thông báo</div>
                ) : (
                  notifications.map(n => (
                    <button
                      type="button"
                      key={n.id}
                      className={`${styles.notifItem} ${!n.is_read ? styles.unread : ''}`}
                      onClick={() => {
                        markAsRead(n.id)
                        if (n.link) router.push(n.link)
                        setShowNotifications(false)
                      }}
                    >
                      <div className={styles.notifTitle}>{n.title}</div>
                      {n.message && <div className={styles.notifMsg}>{n.message}</div>}
                      <div className={styles.notifTime}>
                        {new Date(n.created_at).toLocaleString('vi-VN')}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className={styles.dropdown} ref={profileRef}>
          <button
            className={styles.profileBtn}
            onClick={() => { setShowProfile(!showProfile); setShowNotifications(false) }}
            aria-label="Mở menu tài khoản"
            aria-expanded={showProfile}
            aria-controls="profile-panel"
          >
            <div className={styles.avatar}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>{user?.name || 'Tài khoản'}</span>
              <span className={styles.profileRole}>{roleLabel}</span>
            </div>
            <Icon name="chevronDown" size={14} />
          </button>

          {showProfile && (
            <div className={styles.dropdownMenu} id="profile-panel">
              <button className={styles.menuItem} onClick={() => { router.push('/settings/security'); setShowProfile(false) }}>
                <Icon name="settings" size={17} /> Cài đặt
              </button>
              <div className={styles.menuDivider} />
              <button className={styles.menuItem + ' ' + styles.menuDanger} onClick={handleLogout}>
                <Icon name="logout" size={17} /> Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
  )
}
