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
  let authUser = null
  let profile = null
  
  const supabase = await createClient()
  try {
    const { data } = await supabase.auth.getUser()
    authUser = data.user
    
    if (authUser) {
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()
      profile = profileData
    }
  } catch (err) {
    console.error('Auth check error:', err)
  }

  if (!authUser) {
    redirect('/login')
  }

  return (
    <div className={styles.dashboardLayout}>
      <Sidebar user={profile as User | null} />
      <div className={styles.mainArea}>
        <Header user={profile as User | null} />
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  )
}
