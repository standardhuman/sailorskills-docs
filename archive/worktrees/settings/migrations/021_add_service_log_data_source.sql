-- Migration 021: Add data_source column to service_logs
-- Date: 2025-11-05
-- Purpose: Track whether service log data came from Notion import or Sailor Skills app

-- Add data_source column with default value 'sailorskills'
ALTER TABLE service_logs
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'sailorskills';

-- Add check constraint to ensure valid data sources
ALTER TABLE service_logs
ADD CONSTRAINT service_logs_data_source_check
CHECK (data_source IN ('notion', 'sailorskills', 'manual'));

-- Create index for filtering by data source
CREATE INDEX IF NOT EXISTS idx_service_logs_data_source
ON service_logs(data_source);

-- Update any existing records that were created by 'notion_import' to have data_source = 'notion'
UPDATE service_logs
SET data_source = 'notion'
WHERE created_by = 'notion_import' AND data_source = 'sailorskills';

-- Add comment for documentation
COMMENT ON COLUMN service_logs.data_source IS 'Source of service log data: notion (historical import), sailorskills (app-created), manual (manually entered)';
