-- Migration: Add Cleaning Frequency Configuration System
-- Purpose: Make cleaning frequency time intervals and surcharge multipliers configurable
-- Date: 2025-11-07

-- Table 1: Cleaning Time Intervals
-- Stores the configurable time ranges for "when was it last cleaned?"
CREATE TABLE IF NOT EXISTS cleaning_time_intervals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interval_key TEXT UNIQUE NOT NULL, -- e.g., "0-2_months"
    min_months INTEGER NOT NULL,
    max_months INTEGER, -- NULL means "and above"
    display_label TEXT NOT NULL, -- Customer-facing text, e.g., "Within 2 months"
    sort_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: Cleaning Frequency Formulas
-- Stores formula parameters for calculating surcharges per paint condition
CREATE TABLE IF NOT EXISTS cleaning_frequency_formulas (
    paint_condition TEXT PRIMARY KEY, -- excellent | good | fair | poor
    base_rate NUMERIC(5,2) NOT NULL DEFAULT 0, -- Starting surcharge %
    escalation_factor NUMERIC(5,2) NOT NULL DEFAULT 0, -- % increase per interval
    max_rate NUMERIC(5,2) NOT NULL DEFAULT 100, -- Ceiling surcharge %
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Optional: Manual Overrides Table
-- Allows overriding formula-calculated values for specific combinations
CREATE TABLE IF NOT EXISTS cleaning_frequency_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interval_key TEXT NOT NULL REFERENCES cleaning_time_intervals(interval_key),
    paint_condition TEXT NOT NULL,
    override_multiplier NUMERIC(5,2) NOT NULL, -- The override percentage
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(interval_key, paint_condition)
);

-- Seed default time intervals (matching current hardcoded values)
INSERT INTO cleaning_time_intervals (interval_key, min_months, max_months, display_label, sort_order) VALUES
    ('0-2_months', 0, 2, 'Within 2 months', 1),
    ('3-4_months', 3, 4, '3-4 months ago', 2),
    ('5-6_months', 5, 6, '5-6 months ago', 3),
    ('7-8_months', 7, 8, '7-8 months ago', 4),
    ('9-12_months', 9, 12, '9-12 months ago', 5),
    ('13-24_months', 13, 24, '13-24 months ago', 6),
    ('over_24_months_unsure', 25, NULL, 'Over 24 months ago / Unsure', 7);

-- Seed default formulas (reverse-engineered from current hardcoded values)
-- These formulas approximate the current surcharge progression
INSERT INTO cleaning_frequency_formulas (paint_condition, base_rate, escalation_factor, max_rate, description) VALUES
    ('excellent', 0, 15.00, 100, 'Excellent paint: gradual progression from 0% to 100%'),
    ('good', 0, 15.50, 100, 'Good paint: slightly faster progression than excellent'),
    ('fair', 0, 16.50, 100, 'Fair paint: faster progression, starts earlier'),
    ('poor', 30, 14.00, 100, 'Poor paint: starts at 30%, escalates quickly');

-- Note: The formulas above are approximations. The actual calculation will be:
-- surcharge_percentage = MIN(base_rate + (interval_index * escalation_factor), max_rate)
-- where interval_index is 0 for first interval, 1 for second, etc.

-- For exact match to current values, we'll use overrides initially
INSERT INTO cleaning_frequency_overrides (interval_key, paint_condition, override_multiplier, reason) VALUES
    -- Excellent paint
    ('0-2_months', 'excellent', 0, 'Current hardcoded value'),
    ('3-4_months', 'excellent', 0, 'Current hardcoded value'),
    ('5-6_months', 'excellent', 25, 'Current hardcoded value'),
    ('7-8_months', 'excellent', 40, 'Current hardcoded value'),
    ('9-12_months', 'excellent', 70, 'Current hardcoded value'),
    ('13-24_months', 'excellent', 85, 'Current hardcoded value'),
    ('over_24_months_unsure', 'excellent', 100, 'Current hardcoded value'),

    -- Good paint
    ('0-2_months', 'good', 0, 'Current hardcoded value'),
    ('3-4_months', 'good', 0, 'Current hardcoded value'),
    ('5-6_months', 'good', 25, 'Current hardcoded value'),
    ('7-8_months', 'good', 40, 'Current hardcoded value'),
    ('9-12_months', 'good', 75, 'Current hardcoded value'),
    ('13-24_months', 'good', 90, 'Current hardcoded value'),
    ('over_24_months_unsure', 'good', 100, 'Current hardcoded value'),

    -- Fair paint
    ('0-2_months', 'fair', 0, 'Current hardcoded value'),
    ('3-4_months', 'fair', 25, 'Current hardcoded value'),
    ('5-6_months', 'fair', 40, 'Current hardcoded value'),
    ('7-8_months', 'fair', 70, 'Current hardcoded value'),
    ('9-12_months', 'fair', 85, 'Current hardcoded value'),
    ('13-24_months', 'fair', 95, 'Current hardcoded value'),
    ('over_24_months_unsure', 'fair', 100, 'Current hardcoded value'),

    -- Poor paint
    ('0-2_months', 'poor', 30, 'Current hardcoded value'),
    ('3-4_months', 'poor', 50, 'Current hardcoded value'),
    ('5-6_months', 'poor', 80, 'Current hardcoded value'),
    ('7-8_months', 'poor', 90, 'Current hardcoded value'),
    ('9-12_months', 'poor', 95, 'Current hardcoded value'),
    ('13-24_months', 'poor', 100, 'Current hardcoded value'),
    ('over_24_months_unsure', 'poor', 100, 'Current hardcoded value');

-- Create indexes for performance
CREATE INDEX idx_cleaning_intervals_sort ON cleaning_time_intervals(sort_order);
CREATE INDEX idx_cleaning_intervals_active ON cleaning_time_intervals(is_active);
CREATE INDEX idx_cleaning_overrides_lookup ON cleaning_frequency_overrides(interval_key, paint_condition);

-- Add Row-Level Security (RLS) policies
ALTER TABLE cleaning_time_intervals ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_frequency_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_frequency_overrides ENABLE ROW LEVEL SECURITY;

-- Public read access (needed for Estimator to fetch config)
CREATE POLICY "Allow public read of cleaning intervals"
    ON cleaning_time_intervals FOR SELECT
    USING (is_active = true);

CREATE POLICY "Allow public read of cleaning formulas"
    ON cleaning_frequency_formulas FOR SELECT
    USING (true);

CREATE POLICY "Allow public read of cleaning overrides"
    ON cleaning_frequency_overrides FOR SELECT
    USING (true);

-- Staff-only write access (owner and admin can modify)
CREATE POLICY "Allow staff to manage cleaning intervals"
    ON cleaning_time_intervals FOR ALL
    TO public
    USING (
        (get_user_metadata() ->> 'user_type') = 'staff'
        AND get_user_role(auth.uid()) = ANY(ARRAY['owner', 'admin'])
    );

CREATE POLICY "Allow staff to manage cleaning formulas"
    ON cleaning_frequency_formulas FOR ALL
    TO public
    USING (
        (get_user_metadata() ->> 'user_type') = 'staff'
        AND get_user_role(auth.uid()) = ANY(ARRAY['owner', 'admin'])
    );

CREATE POLICY "Allow staff to manage cleaning overrides"
    ON cleaning_frequency_overrides FOR ALL
    TO public
    USING (
        (get_user_metadata() ->> 'user_type') = 'staff'
        AND get_user_role(auth.uid()) = ANY(ARRAY['owner', 'admin'])
    );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cleaning_intervals_updated_at
    BEFORE UPDATE ON cleaning_time_intervals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cleaning_formulas_updated_at
    BEFORE UPDATE ON cleaning_frequency_formulas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for easy querying of effective surcharges
-- This view calculates the surcharge using formula OR override
CREATE OR REPLACE VIEW cleaning_frequency_surcharges AS
SELECT
    i.interval_key,
    i.min_months,
    i.max_months,
    i.display_label,
    i.sort_order,
    f.paint_condition,
    COALESCE(
        o.override_multiplier,
        LEAST(
            f.base_rate + ((i.sort_order - 1) * f.escalation_factor),
            f.max_rate
        )
    ) AS surcharge_percentage,
    CASE
        WHEN o.override_multiplier IS NOT NULL THEN 'override'
        ELSE 'formula'
    END AS source
FROM cleaning_time_intervals i
CROSS JOIN cleaning_frequency_formulas f
LEFT JOIN cleaning_frequency_overrides o
    ON i.interval_key = o.interval_key
    AND f.paint_condition = o.paint_condition
WHERE i.is_active = true
ORDER BY i.sort_order, f.paint_condition;

-- Grant access to the view
GRANT SELECT ON cleaning_frequency_surcharges TO anon, authenticated;

-- Add comment
COMMENT ON TABLE cleaning_time_intervals IS 'Configurable time intervals for cleaning frequency question in Estimator';
COMMENT ON TABLE cleaning_frequency_formulas IS 'Formula parameters for calculating cleaning frequency surcharges by paint condition';
COMMENT ON TABLE cleaning_frequency_overrides IS 'Manual overrides for specific interval + paint condition combinations';
COMMENT ON VIEW cleaning_frequency_surcharges IS 'Calculated or overridden surcharge percentages for all combinations of intervals and paint conditions';
