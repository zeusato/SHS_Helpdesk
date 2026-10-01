import nodemailer from 'nodemailer'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 })
  let body
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 })
  }
  const { to, subject, html, ticket_id, sender_id } = body || {}
  if (typeof to !== 'string' || typeof subject !== 'string' || typeof html !== 'string' ||
    !to.trim() || !subject.trim() || !html.trim() || subject.length > 500 || html.length > 1_000_000 ||
    typeof ticket_id !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(ticket_id)) {
    return NextResponse.json({ error: 'Thông tin gửi email không hợp lệ.' }, { status: 400 })
  }
  if (sender_id && sender_id !== user.id) {
    return NextResponse.json({ error: 'Không được gửi bằng tài khoản khác.' }, { status: 403 })
  }
  // Apply the caller's RLS permissions, including access to the target ticket.
  const [profile, ticket] = await Promise.all([
    supabase.from('users').select('name,status,role').eq('id', user.id).single(),
    supabase.from('tickets').select('id').eq('id', ticket_id).single(),
  ])
  if (profile.error || profile.data?.status !== 'active' || !['manager', 'po'].includes(profile.data?.role)) {
    return NextResponse.json({ error: 'Tài khoản không có quyền gửi email.' }, { status: 403 })
  }
  if (ticket.error || !ticket.data) {
    return NextResponse.json({ error: 'Ticket không tồn tại hoặc không có quyền truy cập.' }, { status: 403 })
  }
  const { data: settings, error: settingsError } = await supabase.from('user_mail_settings')
    .select('smtp_host,smtp_port,smtp_user,smtp_pass').eq('user_id', user.id).single()
  if (settingsError || !settings?.smtp_host || !settings.smtp_user || !settings.smtp_pass) {
    return NextResponse.json({ error: 'Vui lòng cấu hình hòm thư SMTP trong Cài đặt > Email cá nhân.' }, { status: 400 })
  }
  const transporter = nodemailer.createTransport({
    host: settings.smtp_host, port: settings.smtp_port || 587, secure: settings.smtp_port === 465,
    auth: { user: settings.smtp_user, pass: settings.smtp_pass },
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
  })
  try {
    const info = await transporter.sendMail({
      from: { name: profile.data.name || 'TVSI Helpdesk', address: settings.smtp_user }, to, subject, html,
    })
    const { error } = await supabase.from('emails').insert({
      ticket_id, sender_id: user.id, subject, content: html, recipient_email: to,
    })
    if (error) return NextResponse.json({ success: true, messageId: info.messageId, dbWarning: 'Email đã gửi nhưng chưa lưu được lịch sử. Không gửi lại để tránh trùng thư.' })
    return NextResponse.json({ success: true, messageId: info.messageId })
  } catch {
    return NextResponse.json({ error: 'Không gửi được email. Vui lòng kiểm tra cấu hình SMTP và kết nối.' }, { status: 502 })
  } finally { transporter.close() }
}
