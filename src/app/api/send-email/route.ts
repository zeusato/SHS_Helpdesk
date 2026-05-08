import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  // Create a Supabase client inside the request handler to avoid build-time errors
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'

  const supabaseAdmin = createClient(url, serviceKey);

  try {
    const { to, subject, html, ticket_id, sender_id } = await req.json();

    if (!to || !subject || !html || !ticket_id || !sender_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Fetch Sender's SMTP settings and Name
    const [{ data: mailSettings, error: mailError }, { data: user, error: userError }] = await Promise.all([
      supabaseAdmin
        .from('user_mail_settings')
        .select('*')
        .eq('user_id', sender_id)
        .single(),
      supabaseAdmin
        .from('users')
        .select('name')
        .eq('id', sender_id)
        .single()
    ]);

    if (mailError || !mailSettings?.smtp_host || !mailSettings?.smtp_user || !mailSettings?.smtp_pass) {
      return NextResponse.json({ 
        error: 'Bạn chưa cấu hình hòm thư SMTP. Vui lòng vào Cài đặt > Cấu hình Mail để thiết lập.' 
      }, { status: 400 });
    }

    // 2. Configure Transporter
    const transporter = nodemailer.createTransport({
      host: mailSettings.smtp_host,
      port: mailSettings.smtp_port || 587,
      secure: mailSettings.smtp_port === 465, 
      auth: {
        user: mailSettings.smtp_user,
        pass: mailSettings.smtp_pass,
      },
    });

    // 3. Send Email
    const info = await transporter.sendMail({
      from: `"${user?.name || 'Helpdesk'}" <${mailSettings.smtp_user}>`,
      to: to,
      subject: subject,
      html: html,
    });

    // 4. Log to Database
    const { error: dbError } = await supabaseAdmin
      .from('emails')
      .insert({
        ticket_id,
        sender_id,
        subject,
        content: html,
        recipient_email: to
      });

    if (dbError) {
      console.error('Database Logging Error:', dbError);
      return NextResponse.json({ success: true, messageId: info.messageId, dbWarning: 'Email sent but failed to log to DB.' });
    }

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (err: any) {
    console.error('SMTP API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

