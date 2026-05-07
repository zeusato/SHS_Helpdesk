'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User, Notification } from '@/lib/types'
import styles from './Header.module.css'

interface HeaderProps {
  user: User | null
}

import { useTheme } from '@/components/providers/ThemeProvider'

export default function Header({ user }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const { theme, toggleTheme } = useTheme()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
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
        setNotifications(prev => [payload.new as Notification, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
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
  }

  const roleLabel = user?.role === 'manager' ? 'Quản trị viên' : 'Product Owner'

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <h2 className={styles.pageTitle}>Helpdesk & Shape Up</h2>
      </div>

      <div className={styles.headerRight}>
        {/* Theme Toggle */}
        <button 
          className={styles.iconBtn} 
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Chuyển sang Chế độ sáng' : 'Chuyển sang Chế độ tối'}
        >
          {mounted ? (theme === 'dark' ? '☀️' : '🌙') : '...'}
        </button>

        {/* Notifications */}
        <div className={styles.dropdown} ref={notifRef}>
          <button
            className={styles.iconBtn}
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Thông báo"
          >
            🔔
            {unreadCount > 0 && (
              <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className={styles.dropdownMenu + ' ' + styles.notifMenu}>
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
                    <div
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
                    </div>
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
            onClick={() => setShowProfile(!showProfile)}
          >
            <div className={styles.avatar}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>{user?.name || 'User'}</span>
              <span className={styles.profileRole}>{roleLabel}</span>
            </div>
          </button>

          {showProfile && (
            <div className={styles.dropdownMenu}>
              <button className={styles.menuItem} onClick={() => { router.push('/settings'); setShowProfile(false) }}>
                🔧 Cài đặt
              </button>
              <div className={styles.menuDivider} />
              <button className={styles.menuItem + ' ' + styles.menuDanger} onClick={handleLogout}>
                🚪 Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
