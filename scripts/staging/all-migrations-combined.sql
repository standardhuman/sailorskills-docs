-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers table
CREATE TABLE customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  stripe_customer_id TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  birthday DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Addresses table (separate for flexibility)
CREATE TABLE addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('billing', 'service')) DEFAULT 'billing',
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Boats table
CREATE TABLE boats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  make TEXT,
  model TEXT,
  length INTEGER NOT NULL,
  type TEXT CHECK (type IN ('sailboat', 'powerboat')),
  hull_type TEXT CHECK (hull_type IN ('monohull', 'catamaran', 'trimaran')),
  twin_engines BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marinas table
CREATE TABLE marinas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service orders table
CREATE TABLE service_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  boat_id UUID REFERENCES boats(id),
  marina_id UUID REFERENCES marinas(id),
  dock TEXT,
  slip_number TEXT,
  service_type TEXT NOT NULL,
  service_interval TEXT,
  estimated_amount DECIMAL(10, 2) NOT NULL,
  final_amount DECIMAL(10, 2),
  stripe_payment_intent_id TEXT,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_date DATE,
  completed_at TIMESTAMPTZ
);

-- Service history table
CREATE TABLE service_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES service_orders(id),
  boat_id UUID REFERENCES boats(id),
  service_date DATE NOT NULL,
  service_type TEXT NOT NULL,
  paint_condition TEXT,
  growth_level TEXT,
  anodes_replaced INTEGER DEFAULT 0,
  notes TEXT,
  photos TEXT[], -- Array of storage URLs
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recurring service schedules
CREATE TABLE service_schedules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  boat_id UUID REFERENCES boats(id),
  service_type TEXT NOT NULL,
  interval_months INTEGER NOT NULL,
  next_service_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_service_orders_customer ON service_orders(customer_id);
CREATE INDEX idx_service_orders_status ON service_orders(status);
CREATE INDEX idx_service_schedules_next_date ON service_schedules(next_service_date) WHERE is_active = TRUE;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to customers table
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your auth strategy)
-- For now, these are basic policies - you'll want to refine them

-- Customers can see their own data
CREATE POLICY "Customers can view own data" ON customers
FOR SELECT USING (auth.uid()::TEXT = id::TEXT OR auth.jwt()->>'role' = 'admin');

-- Service orders viewable by customer or admin
CREATE POLICY "View own service orders" ON service_orders
FOR SELECT USING (
  customer_id IN (SELECT id FROM customers WHERE auth.uid()::TEXT = id::TEXT) 
  OR auth.jwt()->>'role' = 'admin'
);

-- Add more policies as needed...-- Create an admin users table to track admin privileges
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create RLS policies for admin access
CREATE POLICY IF NOT EXISTS "Admins can view all orders" ON service_orders
FOR ALL USING (
    auth.uid() IN (SELECT id FROM admin_users)
);

CREATE POLICY IF NOT EXISTS "Admins can update orders" ON service_orders
FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM admin_users)
);

CREATE POLICY IF NOT EXISTS "Admins can view all customers" ON customers
FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admin_users)
);

CREATE POLICY IF NOT EXISTS "Admins can view all boats" ON boats
FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admin_users)
);

CREATE POLICY IF NOT EXISTS "Admins can view all marinas" ON marinas
FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admin_users)
);

CREATE POLICY IF NOT EXISTS "Admins can view all service_history" ON service_history
FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admin_users)
);

CREATE POLICY IF NOT EXISTS "Admins can view all service_schedules" ON service_schedules
FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admin_users)
);-- Anode catalog table
CREATE TABLE anodes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  boatzincs_id TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('shaft', 'hull', 'engine', 'propeller', 'rudder', 'trim_tab', 'other')),
  list_price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track which anodes each boat typically uses
CREATE TABLE boat_anodes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  boat_id UUID REFERENCES boats(id) ON DELETE CASCADE,
  anode_id UUID REFERENCES anodes(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  position TEXT, -- e.g., "port shaft", "starboard hull", etc.
  last_replaced DATE,
  replacement_interval_months INTEGER DEFAULT 6,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(boat_id, anode_id, position)
);

-- Record anode charges/sales
CREATE TABLE anode_charges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  boat_id UUID REFERENCES boats(id) ON DELETE CASCADE,
  stripe_charge_id TEXT,
  service_date DATE DEFAULT CURRENT_DATE,
  subtotal DECIMAL(10, 2) NOT NULL, -- sum of list prices
  tax_amount DECIMAL(10, 2) NOT NULL, -- calculated tax
  markup_amount DECIMAL(10, 2) NOT NULL, -- calculated markup
  total_amount DECIMAL(10, 2) NOT NULL, -- final charge amount
  notes TEXT,
  charged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual line items for each anode charge
CREATE TABLE anode_charge_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  anode_charge_id UUID REFERENCES anode_charges(id) ON DELETE CASCADE,
  anode_id UUID REFERENCES anodes(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL, -- list price at time of sale
  line_total DECIMAL(10, 2) NOT NULL, -- quantity * unit_price
  position TEXT -- where it was installed
);

-- Daily service schedule (can be populated from Notion or manually)
CREATE TABLE service_schedule (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  service_date DATE NOT NULL,
  boat_id UUID REFERENCES boats(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  service_order INTEGER, -- order in which boats will be serviced
  service_type TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_date, boat_id)
);

-- Create indexes for performance
CREATE INDEX idx_boat_anodes_boat_id ON boat_anodes(boat_id);
CREATE INDEX idx_anode_charges_customer_id ON anode_charges(customer_id);
CREATE INDEX idx_anode_charges_boat_id ON anode_charges(boat_id);
CREATE INDEX idx_anode_charges_service_date ON anode_charges(service_date);
CREATE INDEX idx_service_schedule_date ON service_schedule(service_date);
CREATE INDEX idx_service_schedule_boat_id ON service_schedule(boat_id);

-- Create update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_anodes_updated_at BEFORE UPDATE ON anodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boat_anodes_updated_at BEFORE UPDATE ON boat_anodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();-- Create booking types enum
CREATE TYPE booking_type AS ENUM ('consultation', 'half_day', 'full_day', 'extended');

-- Create booking status enum
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- Create service types table
CREATE TABLE service_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration_hours DECIMAL(3,1) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  type booking_type NOT NULL,
  max_participants INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create bookings table
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type_id UUID REFERENCES service_types(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  participants INTEGER DEFAULT 1,
  status booking_status DEFAULT 'pending',
  google_event_id TEXT,
  notes TEXT,
  total_price DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  confirmation_sent_at TIMESTAMP WITH TIME ZONE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create availability rules table
CREATE TABLE availability_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create blocked dates table
CREATE TABLE blocked_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(date)
);

-- Create admin settings table
CREATE TABLE booking_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default service types
INSERT INTO service_types (name, description, duration_hours, price, type) VALUES
  ('Free Consultation', 'We meet at your boat to discuss your goals and develop a plan for you.', 1, 0, 'consultation'),
  ('Training: Half Day', '3 hours of in-person training', 3, 250, 'half_day'),
  ('Training: Full Day', '6-7 hours of in-person training', 7, 450, 'full_day'),
  ('Extended Session', 'For voyages requiring more than 7 hours. See FAQ for pricing details.', 12, 800, 'extended');

-- Insert default availability (9 AM to 6 PM, Monday to Saturday)
INSERT INTO availability_rules (day_of_week, start_time, end_time, is_available) VALUES
  (0, '09:00', '18:00', false), -- Sunday
  (1, '09:00', '18:00', true),  -- Monday
  (2, '09:00', '18:00', true),  -- Tuesday
  (3, '09:00', '18:00', true),  -- Wednesday
  (4, '09:00', '18:00', true),  -- Thursday
  (5, '09:00', '18:00', true),  -- Friday
  (6, '09:00', '18:00', true);  -- Saturday

-- Insert default settings
INSERT INTO booking_settings (setting_key, setting_value) VALUES
  ('advance_booking_days', '90'),
  ('minimum_notice_hours', '24'),
  ('buffer_time_minutes', '30'),
  ('reminder_hours_before', '24'),
  ('google_calendar_id', '""'),
  ('sendgrid_api_key', '""'),
  ('twilio_account_sid', '""'),
  ('twilio_auth_token', '""'),
  ('twilio_phone_number', '""'),
  ('admin_email', '""');

-- Create indexes
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX idx_blocked_dates_date ON blocked_dates(date);

-- Create function to check availability
CREATE OR REPLACE FUNCTION check_booking_availability(
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_service_type_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_day_of_week INTEGER;
  v_is_available BOOLEAN;
  v_blocked_count INTEGER;
  v_conflict_count INTEGER;
BEGIN
  -- Get day of week (0 = Sunday)
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Check if date is blocked
  SELECT COUNT(*) INTO v_blocked_count
  FROM blocked_dates
  WHERE date = p_date;
  
  IF v_blocked_count > 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Check availability rules
  SELECT is_available INTO v_is_available
  FROM availability_rules
  WHERE day_of_week = v_day_of_week
    AND start_time <= p_start_time
    AND end_time >= p_end_time;
  
  IF v_is_available IS NULL OR NOT v_is_available THEN
    RETURN FALSE;
  END IF;
  
  -- Check for conflicting bookings
  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings
  WHERE booking_date = p_date
    AND status IN ('pending', 'confirmed')
    AND (
      (start_time <= p_start_time AND end_time > p_start_time) OR
      (start_time < p_end_time AND end_time >= p_end_time) OR
      (start_time >= p_start_time AND end_time <= p_end_time)
    );
  
  RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;

-- Public can read service types
CREATE POLICY "Service types are viewable by everyone" ON service_types
  FOR SELECT USING (true);

-- Public can create bookings
CREATE POLICY "Anyone can create bookings" ON bookings
  FOR INSERT WITH CHECK (true);

-- Public can view their own bookings
CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (true);

-- Public can read availability rules
CREATE POLICY "Availability rules are viewable by everyone" ON availability_rules
  FOR SELECT USING (true);

-- Public can read blocked dates
CREATE POLICY "Blocked dates are viewable by everyone" ON blocked_dates
  FOR SELECT USING (true);-- Add service_details and metadata JSONB columns to service_orders
-- This allows storing full calculator context and service-specific metadata

ALTER TABLE service_orders
ADD COLUMN IF NOT EXISTS service_details JSONB,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add comment for documentation
COMMENT ON COLUMN service_orders.service_details IS 'Stores calculator inputs: boat type, hull type, paint condition, growth level, anodes, etc.';
COMMENT ON COLUMN service_orders.metadata IS 'Stores service-specific data like item recovery location, description, lost date, etc.';

-- Create index for querying service_details
CREATE INDEX IF NOT EXISTS idx_service_orders_service_details ON service_orders USING GIN (service_details);
CREATE INDEX IF NOT EXISTS idx_service_orders_metadata ON service_orders USING GIN (metadata);
-- ============================================
-- Migration 011: Add Boat Location Fields
-- ============================================
-- Adds marina, dock, and slip columns to boats table
-- to fix data loss issue where boat location information
-- was not being captured during Estimator signups.
--
-- Root Cause: Estimator edge function was writing to
-- marina_location and slip_number fields that didn't exist.
-- Billing service was trying to read marina, dock, slip fields
-- that didn't exist.
--
-- Resolution: Add marina, dock, slip columns to match
-- expected schema across all services.
-- ============================================

-- Add marina column (location name like "Berkeley Marina")
ALTER TABLE boats
ADD COLUMN IF NOT EXISTS marina TEXT;

-- Add dock column (dock letter/number like "O")
ALTER TABLE boats
ADD COLUMN IF NOT EXISTS dock TEXT;

-- Add slip column (slip number like "605")
ALTER TABLE boats
ADD COLUMN IF NOT EXISTS slip TEXT;

-- Create index for marina searches (commonly used filter)
CREATE INDEX IF NOT EXISTS idx_boats_marina ON boats(marina);

-- Add helpful comments for future developers
COMMENT ON COLUMN boats.marina IS 'Marina or harbor name where boat is located';
COMMENT ON COLUMN boats.dock IS 'Dock letter/number within marina';
COMMENT ON COLUMN boats.slip IS 'Slip number where boat is moored';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- ============================================
-- Migration 012: Denormalize Boats Table & Add Propeller Count
-- ============================================
-- Fixes boat data flow issues across Estimator, Billing, and Operations
--
-- PROBLEM: Estimator writes to boat_name, boat_make, boat_model, boat_length_ft
--          but database only has name, make, model, length columns.
--          This causes all boat data to fail during insert.
--
-- SOLUTION: Add denormalized columns to support both old and new schemas
--           during transition period. Add propeller_count for Billing UI.
-- ============================================

-- Step 1: Add denormalized columns
ALTER TABLE boats
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS boat_name TEXT,
  ADD COLUMN IF NOT EXISTS boat_make TEXT,
  ADD COLUMN IF NOT EXISTS boat_model TEXT,
  ADD COLUMN IF NOT EXISTS boat_year INTEGER,
  ADD COLUMN IF NOT EXISTS boat_length_ft NUMERIC,
  ADD COLUMN IF NOT EXISTS hull_material TEXT,
  ADD COLUMN IF NOT EXISTS marina_location TEXT,
  ADD COLUMN IF NOT EXISTS slip_number TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS propeller_count INTEGER;

-- Step 2: Migrate existing data from old columns to new
UPDATE boats SET boat_name = name WHERE boat_name IS NULL AND name IS NOT NULL;
UPDATE boats SET boat_make = make WHERE boat_make IS NULL AND make IS NOT NULL;
UPDATE boats SET boat_model = model WHERE boat_model IS NULL AND model IS NOT NULL;
UPDATE boats SET boat_length_ft = length WHERE boat_length_ft IS NULL AND length IS NOT NULL;

-- Step 3: Populate marina_location from marina column (added in migration 011)
UPDATE boats SET marina_location = marina WHERE marina_location IS NULL AND marina IS NOT NULL;

-- Step 4: Populate slip_number from slip column (added in migration 011)
UPDATE boats SET slip_number = slip WHERE slip_number IS NULL AND slip IS NOT NULL;

-- Step 5: Populate customer data from customers table using customer_id
UPDATE boats b
SET
  customer_name = c.name,
  customer_email = c.email,
  customer_phone = c.phone
FROM customers c
WHERE b.customer_id = c.id
  AND (b.customer_name IS NULL OR b.customer_email IS NULL OR b.customer_phone IS NULL);

-- Step 6: Backfill propeller_count from service_orders.service_details JSONB
WITH boat_propellers AS (
  SELECT DISTINCT ON (boat_id)
    boat_id,
    (service_details->>'propellerCount')::INTEGER as propeller_count
  FROM service_orders
  WHERE boat_id IS NOT NULL
    AND service_details IS NOT NULL
    AND service_details->>'propellerCount' IS NOT NULL
  ORDER BY boat_id, created_at DESC
)
UPDATE boats b
SET propeller_count = bp.propeller_count
FROM boat_propellers bp
WHERE b.id = bp.boat_id
  AND b.propeller_count IS NULL;

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_boats_customer_email ON boats(customer_email);
CREATE INDEX IF NOT EXISTS idx_boats_boat_name ON boats(boat_name);
CREATE INDEX IF NOT EXISTS idx_boats_marina_location ON boats(marina_location);
CREATE INDEX IF NOT EXISTS idx_boats_is_active ON boats(is_active) WHERE is_active = TRUE;

-- Step 8: Add helpful comments
COMMENT ON COLUMN boats.boat_name IS 'Denormalized boat name (replaces old name column)';
COMMENT ON COLUMN boats.boat_length_ft IS 'Denormalized boat length in feet (replaces old length column)';
COMMENT ON COLUMN boats.customer_name IS 'Denormalized customer name from customers table';
COMMENT ON COLUMN boats.marina_location IS 'Denormalized marina name (duplicates marina column for compatibility)';
COMMENT ON COLUMN boats.slip_number IS 'Denormalized slip number (duplicates slip column for compatibility)';
COMMENT ON COLUMN boats.propeller_count IS 'Number of propellers (extracted from service_details)';
COMMENT ON COLUMN boats.is_active IS 'Whether this boat is actively serviced';

-- ============================================
-- MIGRATION COMPLETE
-- Old columns (name, make, model, length) kept for backward compatibility
-- New columns (boat_name, boat_make, boat_model, boat_length_ft) now available
-- Both schemas will work during transition period
-- ============================================
-- ============================================
-- Migration 013: Backfill Boat Length from Service Details
-- ============================================
-- The boat length was stored in service_orders.service_details JSONB
-- but not copied to the boats.boat_length_ft column during migration.
-- This fixes that by extracting boatLength from service_details.
-- ============================================

-- Backfill boat_length_ft from service_orders.service_details
WITH boat_lengths AS (
  SELECT DISTINCT ON (boat_id)
    boat_id,
    (service_details->>'boatLength')::NUMERIC as boat_length
  FROM service_orders
  WHERE boat_id IS NOT NULL
    AND service_details IS NOT NULL
    AND service_details->>'boatLength' IS NOT NULL
    AND (service_details->>'boatLength')::NUMERIC > 0
  ORDER BY boat_id, created_at DESC
)
UPDATE boats b
SET boat_length_ft = bl.boat_length
FROM boat_lengths bl
WHERE b.id = bl.boat_id
  AND (b.boat_length_ft IS NULL OR b.boat_length_ft = 0);

-- Also update the old 'length' column for backward compatibility
UPDATE boats
SET length = boat_length_ft::INTEGER
WHERE boat_length_ft IS NOT NULL
  AND boat_length_ft > 0
  AND (length IS NULL OR length = 0);

-- Verification
DO $$
DECLARE
  total_boats INTEGER;
  boats_with_length INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_boats FROM boats;
  SELECT COUNT(*) INTO boats_with_length FROM boats WHERE boat_length_ft IS NOT NULL AND boat_length_ft > 0;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Boat Length Backfill Complete';
  RAISE NOTICE '   Total boats: %', total_boats;
  RAISE NOTICE '   Boats with length: %', boats_with_length;
  RAISE NOTICE '';
END $$;
-- ============================================
-- Migration 014: Backfill Boat Type and Hull Type
-- ============================================
-- Also backfill type and hull_type from service_details if missing
-- ============================================

-- Backfill type (sailboat/powerboat) from service_orders.service_details
WITH boat_types AS (
  SELECT DISTINCT ON (boat_id)
    boat_id,
    service_details->>'boatType' as boat_type
  FROM service_orders
  WHERE boat_id IS NOT NULL
    AND service_details IS NOT NULL
    AND service_details->>'boatType' IS NOT NULL
  ORDER BY boat_id, created_at DESC
)
UPDATE boats b
SET type = bt.boat_type
FROM boat_types bt
WHERE b.id = bt.boat_id
  AND (b.type IS NULL OR b.type = '');

-- Backfill hull_type (monohull/catamaran/trimaran) from service_orders.service_details
WITH hull_types AS (
  SELECT DISTINCT ON (boat_id)
    boat_id,
    service_details->>'hullType' as hull_type
  FROM service_orders
  WHERE boat_id IS NOT NULL
    AND service_details IS NOT NULL
    AND service_details->>'hullType' IS NOT NULL
  ORDER BY boat_id, created_at DESC
)
UPDATE boats b
SET hull_type = ht.hull_type
FROM hull_types ht
WHERE b.id = ht.boat_id
  AND (b.hull_type IS NULL OR b.hull_type = '');

-- Verification
DO $$
DECLARE
  total_boats INTEGER;
  boats_with_type INTEGER;
  boats_with_hull INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_boats FROM boats;
  SELECT COUNT(*) INTO boats_with_type FROM boats WHERE type IS NOT NULL AND type != '';
  SELECT COUNT(*) INTO boats_with_hull FROM boats WHERE hull_type IS NOT NULL AND hull_type != '';

  RAISE NOTICE '';
  RAISE NOTICE '✅ Boat Type/Hull Backfill Complete';
  RAISE NOTICE '   Total boats: %', total_boats;
  RAISE NOTICE '   Boats with type: %', boats_with_type;
  RAISE NOTICE '   Boats with hull type: %', boats_with_hull;
  RAISE NOTICE '';
END $$;
-- Migration: Add customer_id to boats table for proper relational schema
-- This enables Billing service to properly join boats with customers

-- Step 1: Add customer_id column (nullable initially for migration)
ALTER TABLE boats
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;

-- Step 2: Migrate existing data - link boats to customers by matching customer_email
UPDATE boats
SET customer_id = customers.id
FROM customers
WHERE boats.customer_email = customers.email
AND boats.customer_id IS NULL;

-- Step 3: For any remaining boats without customer_id, try to match by customer_name
UPDATE boats
SET customer_id = customers.id
FROM customers
WHERE boats.customer_name = customers.name
AND boats.customer_id IS NULL
AND boats.customer_email IS NULL;

-- Step 4: Make customer_id NOT NULL (all boats should have a customer)
-- If there are orphaned boats without customers, this will fail and you'll need to create customers first
ALTER TABLE boats
ALTER COLUMN customer_id SET NOT NULL;

-- Step 5: Create index for performance on customer_id joins
CREATE INDEX IF NOT EXISTS idx_boats_customer_id ON boats(customer_id);

-- Step 6: Add helpful comment
COMMENT ON COLUMN boats.customer_id IS 'Foreign key to customers table. Links boat to its owner for proper relational queries.';

-- Note: The old customer_* fields (customer_name, customer_email, customer_phone)
-- can be deprecated but are kept for backward compatibility.
-- New code should use the customer_id foreign key and join to customers table.
-- Create quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    quote_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_days INTEGER DEFAULT 30,

    -- Customer information
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    boat_name VARCHAR(255),
    boat_make VARCHAR(255),
    marina VARCHAR(255),
    slip VARCHAR(50),

    -- Service details
    service_type VARCHAR(100),
    service_name VARCHAR(255),
    boat_length DECIMAL(5,2),
    paint_condition VARCHAR(50),
    growth_level VARCHAR(50),
    has_twin_engines BOOLEAN DEFAULT false,
    additional_hulls INTEGER DEFAULT 0,

    -- Pricing
    base_price DECIMAL(10,2),
    rate_per_foot DECIMAL(10,2),
    anode_cost DECIMAL(10,2) DEFAULT 0,
    anode_labor_cost DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Anodes JSON array
    anodes JSONB DEFAULT '[]'::JSONB,

    -- Quote status
    status VARCHAR(50) DEFAULT 'draft',
    viewed_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    pdf_url TEXT,
    notes TEXT
);

-- Create indexes for common queries
CREATE INDEX idx_quotes_quote_number ON public.quotes(quote_number);
CREATE INDEX idx_quotes_customer_email ON public.quotes(customer_email);
CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_quotes_created_at ON public.quotes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to view quotes by quote_number
-- (for the public quote viewer)
CREATE POLICY "Quotes are viewable by anyone with the quote number"
    ON public.quotes
    FOR SELECT
    USING (true);

-- Create a policy for inserting quotes (admin only - requires service role)
CREATE POLICY "Service role can insert quotes"
    ON public.quotes
    FOR INSERT
    WITH CHECK (true);

-- Create a policy for updating quotes (admin only - requires service role)
CREATE POLICY "Service role can update quotes"
    ON public.quotes
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quotes_updated_at
    BEFORE UPDATE ON public.quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();