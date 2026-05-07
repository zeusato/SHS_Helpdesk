-- Create user_mail_settings table
CREATE TABLE IF NOT EXISTS user_mail_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  smtp_host VARCHAR(255) NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_user VARCHAR(255) NOT NULL,
  smtp_pass TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_mail_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own mail settings"
  ON user_mail_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own mail settings"
  ON user_mail_settings FOR ALL
  USING (auth.uid() = user_id);

