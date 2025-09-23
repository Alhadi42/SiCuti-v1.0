-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create system announcements table
CREATE TABLE IF NOT EXISTS system_announcements (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  browser_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

CREATE INDEX IF NOT EXISTS idx_system_announcements_active ON system_announcements(active);
CREATE INDEX IF NOT EXISTS idx_system_announcements_dates ON system_announcements(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Create GIN index for JSONB data column
CREATE INDEX IF NOT EXISTS idx_notifications_data ON notifications USING GIN(data);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_announcements_updated_at
  BEFORE UPDATE ON system_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM notifications
  WHERE user_id = p_user_id
    AND read_at IS NULL;
    
  RETURN COALESCE(unread_count, 0);
END;
$$;

-- Create function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(
  p_user_id UUID,
  p_notification_ids BIGINT[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF p_notification_ids IS NULL THEN
    -- Mark all unread notifications as read
    UPDATE notifications
    SET read_at = NOW()
    WHERE user_id = p_user_id
      AND read_at IS NULL;
  ELSE
    -- Mark specific notifications as read
    UPDATE notifications
    SET read_at = NOW()
    WHERE user_id = p_user_id
      AND id = ANY(p_notification_ids)
      AND read_at IS NULL;
  END IF;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Create function to get active system announcements
CREATE OR REPLACE FUNCTION get_active_system_announcements()
RETURNS TABLE (
  id BIGINT,
  title VARCHAR(255),
  message TEXT,
  priority VARCHAR(20),
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.id,
    sa.title,
    sa.message,
    sa.priority,
    sa.created_at
  FROM system_announcements sa
  WHERE sa.active = true
    AND (sa.start_date IS NULL OR sa.start_date <= NOW())
    AND (sa.end_date IS NULL OR sa.end_date >= NOW())
  ORDER BY sa.priority DESC, sa.created_at DESC;
END;
$$;

-- Create view for notification summary
CREATE OR REPLACE VIEW notification_summary AS
SELECT 
  u.id as user_id,
  u.username,
  COUNT(n.id) as total_notifications,
  COUNT(CASE WHEN n.read_at IS NULL THEN 1 END) as unread_count,
  COUNT(CASE WHEN n.priority = 'high' AND n.read_at IS NULL THEN 1 END) as high_priority_unread,
  MAX(n.created_at) as last_notification_at
FROM users u
LEFT JOIN notifications n ON u.id = n.user_id
GROUP BY u.id, u.username;

-- Enable Row Level Security (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
DROP POLICY IF EXISTS "notifications_view_own" ON notifications;
CREATE POLICY "notifications_view_own" ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert_any" ON notifications;
CREATE POLICY "notifications_insert_any" ON notifications
  FOR INSERT
  WITH CHECK (true); -- Allow system to insert notifications

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- Create RLS policies for system announcements
DROP POLICY IF EXISTS "system_announcements_view_all" ON system_announcements;
CREATE POLICY "system_announcements_view_all" ON system_announcements
  FOR SELECT
  USING (active = true AND 
         (start_date IS NULL OR start_date <= NOW()) AND
         (end_date IS NULL OR end_date >= NOW()));

DROP POLICY IF EXISTS "system_announcements_manage" ON system_announcements;
CREATE POLICY "system_announcements_manage" ON system_announcements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'master_admin'
    )
  );

-- Create RLS policies for notification preferences
DROP POLICY IF EXISTS "notification_preferences_manage_own" ON notification_preferences;
CREATE POLICY "notification_preferences_manage_own" ON notification_preferences
  FOR ALL
  USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT SELECT ON system_announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;
GRANT SELECT ON notification_summary TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION get_unread_notification_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notifications_read(UUID, BIGINT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_system_announcements() TO authenticated;

-- Insert default notification preferences for existing users
INSERT INTO notification_preferences (user_id, notification_type, email_enabled, browser_enabled)
SELECT 
  u.id,
  unnest(ARRAY[
    'leave_request_submitted',
    'leave_request_approved', 
    'leave_request_rejected',
    'leave_balance_updated',
    'system_announcement',
    'security_alert'
  ]) as notification_type,
  true as email_enabled,
  true as browser_enabled
FROM users u
ON CONFLICT (user_id, notification_type) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'User-specific notifications';
COMMENT ON TABLE system_announcements IS 'System-wide announcements visible to all users';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification delivery methods';

COMMENT ON FUNCTION get_unread_notification_count IS 'Returns count of unread notifications for a user';
COMMENT ON FUNCTION mark_notifications_read IS 'Marks notifications as read for a user';
COMMENT ON FUNCTION get_active_system_announcements IS 'Returns currently active system announcements';
