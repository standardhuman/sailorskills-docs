-- Migration: Update Cleaning Frequency to Custom Progression
-- Purpose: Implement gradual-then-steep progression with conservative max for good paint,
--          aggressive max (200%) for poor paint
-- Date: 2025-11-07

-- Clear existing overrides
DELETE FROM cleaning_frequency_overrides;

-- ============================================
-- EXCELLENT, GOOD, FAIR PAINT
-- Max: 60% (conservative - rewards maintenance)
-- Progression: Gradual then steep
-- ============================================

-- Excellent Paint (60% max)
INSERT INTO cleaning_frequency_overrides (interval_key, paint_condition, override_multiplier, reason) VALUES
    ('0-2_months', 'excellent', 0, 'Custom progression: no surcharge for recent cleaning'),
    ('3-4_months', 'excellent', 5, 'Custom progression: gradual start'),
    ('5-6_months', 'excellent', 12, 'Custom progression: gradual increase'),
    ('7-8_months', 'excellent', 22, 'Custom progression: steeper increase'),
    ('9-12_months', 'excellent', 35, 'Custom progression: steeper increase'),
    ('13-24_months', 'excellent', 48, 'Custom progression: approaching max'),
    ('over_24_months_unsure', 'excellent', 60, 'Custom progression: max for excellent paint');

-- Good Paint (60% max - same as excellent)
INSERT INTO cleaning_frequency_overrides (interval_key, paint_condition, override_multiplier, reason) VALUES
    ('0-2_months', 'good', 0, 'Custom progression: no surcharge for recent cleaning'),
    ('3-4_months', 'good', 5, 'Custom progression: gradual start'),
    ('5-6_months', 'good', 12, 'Custom progression: gradual increase'),
    ('7-8_months', 'good', 22, 'Custom progression: steeper increase'),
    ('9-12_months', 'good', 35, 'Custom progression: steeper increase'),
    ('13-24_months', 'good', 48, 'Custom progression: approaching max'),
    ('over_24_months_unsure', 'good', 60, 'Custom progression: max for good paint');

-- Fair Paint (60% max - same as excellent/good)
INSERT INTO cleaning_frequency_overrides (interval_key, paint_condition, override_multiplier, reason) VALUES
    ('0-2_months', 'fair', 0, 'Custom progression: no surcharge for recent cleaning'),
    ('3-4_months', 'fair', 5, 'Custom progression: gradual start'),
    ('5-6_months', 'fair', 12, 'Custom progression: gradual increase'),
    ('7-8_months', 'fair', 22, 'Custom progression: steeper increase'),
    ('9-12_months', 'fair', 35, 'Custom progression: steeper increase'),
    ('13-24_months', 'fair', 48, 'Custom progression: approaching max'),
    ('over_24_months_unsure', 'fair', 60, 'Custom progression: max for fair paint');

-- ============================================
-- POOR PAINT
-- Max: 200% (aggressive - heavily penalizes neglect on already poor paint)
-- Progression: Gradual then steep, starts higher
-- ============================================

INSERT INTO cleaning_frequency_overrides (interval_key, paint_condition, override_multiplier, reason) VALUES
    ('0-2_months', 'poor', 30, 'Custom progression: poor paint starts with base surcharge'),
    ('3-4_months', 'poor', 50, 'Custom progression: gradual increase'),
    ('5-6_months', 'poor', 75, 'Custom progression: moderate increase'),
    ('7-8_months', 'poor', 105, 'Custom progression: steeper increase'),
    ('9-12_months', 'poor', 140, 'Custom progression: aggressive increase'),
    ('13-24_months', 'poor', 170, 'Custom progression: approaching max'),
    ('over_24_months_unsure', 'poor', 200, 'Custom progression: max for poor paint - double base price');

-- Add comment explaining the strategy
COMMENT ON TABLE cleaning_frequency_overrides IS 'Manual overrides for cleaning frequency surcharges. Current strategy: Conservative (60% max) for good paint to reward maintenance, Aggressive (200% max) for poor paint to reflect difficulty of neglected hulls in bad condition.';
