import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import type { User } from '@/lib/types'
import styles from './layout.module.css'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let userId: string | null = null
  let profile = null
  
  const supabase = await createClient()
  try {
    const { data, error } = await supabase.auth.getClaims()
    userId = error ? null : data?.claims.sub ?? null
    
    if (userId) {
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      profile = profileData
    }
  } catch (err) {
    console.error('Auth check error:', err)
  }

  if (!userId || !profile || profile.status !== 'active') {
    redirect('/login')
  }

  return (
    <div className={styles.dashboardLayout}>
      <a className="skip-link" href="#main-content">Đến nội dung chính</a>
      <Header user={profile as User | null} />
      <Sidebar user={profile as User | null} />
      <div className={styles.mainArea}>
        <main className={styles.content} id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className={styles.footer}><strong>TVSI Helpdesk</strong><span>Công ty Cổ phần Chứng khoán Tân Việt</span></footer>
      </div>
    </div>
  )
}
