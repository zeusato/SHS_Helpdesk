import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  // Verify caller is a manager
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (profile?.role !== 'manager') {
    return NextResponse.json({ error: 'Chỉ Manager mới có quyền tạo tài khoản' }, { status: 403 })
  }

  const body = await request.json()
  const { username, name, email, role, status, password } = body

  if (!username || !name || !email || !password) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
  }

  // Use service_role key to create auth user
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Service role key chưa được cấu hình' }, { status: 500 })
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Create auth user
  const { data: newAuthUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !newAuthUser.user) {
    return NextResponse.json({ error: authError?.message || 'Lỗi tạo auth user' }, { status: 400 })
  }

  // Create profile
  const { error: profileError } = await adminClient
    .from('users')
    .insert({
      id: newAuthUser.user.id,
      username,
      name,
      email,
      role: role || 'po',
      status: status || 'active',
    })

  if (profileError) {
    // Rollback: delete auth user
    await adminClient.auth.admin.deleteUser(newAuthUser.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, user_id: newAuthUser.user.id })
}
