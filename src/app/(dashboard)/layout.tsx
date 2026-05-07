import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import type { User } from '@/lib/types'
import styles from './layout.module.css'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

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
