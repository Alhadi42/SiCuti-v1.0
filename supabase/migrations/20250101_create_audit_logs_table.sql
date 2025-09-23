-- Create audit_logs table for security and activity logging
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_agent TEXT,
  ip_address VARCHAR(45),
  session_id VARCHAR(255),
  details JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);

-- Create GIN index for JSONB details column for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_details ON audit_logs USING GIN(details);

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Audit trail for security and activity monitoring';
COMMENT ON COLUMN audit_logs.event_type IS 'Type of event (login_success, login_failed, etc.)';
COMMENT ON COLUMN audit_logs.user_id IS 'ID of user who performed the action (null for anonymous)';
COMMENT ON COLUMN audit_logs.user_agent IS 'Browser user agent string';
COMMENT ON COLUMN audit_logs.ip_address IS 'Client IP address';
COMMENT ON COLUMN audit_logs.session_id IS 'Session identifier';
COMMENT ON COLUMN audit_logs.details IS 'Additional event details in JSON format';
COMMENT ON COLUMN audit_logs.timestamp IS 'When the event occurred';

-- Create function to automatically clean old audit logs (optional, for storage management)
CREATE OR REPLACE FUNCTION clean_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs 
  WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION clean_old_audit_logs IS 'Removes audit logs older than specified days (default 365)';

-- Create a view for recent security events (last 30 days)
CREATE OR REPLACE VIEW recent_security_events AS
SELECT 
  al.id,
  event_type,
  user_id,
  u.username,
  ip_address,
  details,
  timestamp
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE timestamp >= NOW() - INTERVAL '30 days'
  AND event_type IN ('login_failed', 'login_blocked', 'unauthorized_access', 'system_error')
ORDER BY timestamp DESC;

COMMENT ON VIEW recent_security_events IS 'Recent security-related audit events for monitoring';

-- Enable Row Level Security (RLS)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Only master_admin can view audit logs
DROP POLICY IF EXISTS "audit_logs_view_policy" ON audit_logs;
CREATE POLICY "audit_logs_view_policy" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'master_admin'
    )
  );

-- Create RLS policy: System can insert audit logs
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON audit_logs;
CREATE POLICY "audit_logs_insert_policy" ON audit_logs
  FOR INSERT
  WITH CHECK (true); -- Allow all inserts for system logging

-- Grant permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT INSERT ON audit_logs TO authenticated;
GRANT SELECT ON recent_security_events TO authenticated;

-- Only allow audit log deletion for master_admin (for cleanup purposes)
DROP POLICY IF EXISTS "audit_logs_delete_policy" ON audit_logs;
CREATE POLICY "audit_logs_delete_policy" ON audit_logs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'master_admin'
    )
  );

GRANT DELETE ON audit_logs TO authenticated;
