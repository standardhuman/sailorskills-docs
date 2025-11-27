-- Migration 023: Add immediate service start/end timestamp capture
-- Purpose: Overcome browser session loss during long dives

ALTER TABLE service_logs
  ADD COLUMN IF NOT EXISTS service_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS service_ended_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS in_progress BOOLEAN DEFAULT false;

-- Add index for querying active services
CREATE INDEX IF NOT EXISTS idx_service_logs_in_progress
  ON service_logs(in_progress)
  WHERE in_progress = true;

-- Add index for querying by start time
CREATE INDEX IF NOT EXISTS idx_service_logs_started_at
  ON service_logs(service_started_at);

-- Add comment documentation
COMMENT ON COLUMN service_logs.service_started_at IS 'Exact timestamp when Start Service button clicked (captures before potential browser reload)';
COMMENT ON COLUMN service_logs.service_ended_at IS 'Exact timestamp when End Service button clicked';
COMMENT ON COLUMN service_logs.in_progress IS 'True if service is currently active (between Start and End clicks)';
