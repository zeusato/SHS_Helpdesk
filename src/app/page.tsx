import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  let user = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    console.error('Home page auth check error:', err)
  }

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
