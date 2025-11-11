-- Seed Data for Local Supabase Development
-- Creates sample customers, boats, and test data for integration testing
-- Run with: psql "$DATABASE_URL" -f scripts/seed-local-data.sql

-- Clear existing data (be careful!)
-- TRUNCATE customers, boats, service_logs, invoices, bookings CASCADE;

-- Insert test customers
INSERT INTO customers (id, email, name, phone, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'test1@sailorskills.com', 'Test Customer 1', '555-0001', NOW()),
  ('00000000-0000-0000-0000-000000000002', 'test2@sailorskills.com', 'Test Customer 2', '555-0002', NOW()),
  ('00000000-0000-0000-0000-000000000003', 'standardhuman@gmail.com', 'Standard Human', '555-0003', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test boats
INSERT INTO boats (id, customer_id, name, length_ft, location, created_at) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Sea Breeze', 35, 'Marina Bay', NOW()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Ocean Spirit', 42, 'Harbor Point', NOW()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Wave Rider', 28, 'Sunset Dock', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test service logs
INSERT INTO service_logs (id, boat_id, service_date, notes, created_at) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', NOW() - INTERVAL '30 days', 'Hull cleaning completed', NOW()),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', NOW() - INTERVAL '15 days', 'Anode replacement and cleaning', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test invoices
INSERT INTO invoices (id, customer_id, issued_at, due_at, amount, status, created_at) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '20 days', NOW() + INTERVAL '10 days', 450.00, 'pending', NOW()),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '45 days', NOW() - INTERVAL '15 days', 350.00, 'paid', NOW())
ON CONFLICT (id) DO NOTHING;

-- Output success message
SELECT 'Seed data inserted successfully!' AS message;
SELECT COUNT(*) AS customer_count FROM customers WHERE email LIKE '%@sailorskills.com';
SELECT COUNT(*) AS boat_count FROM boats;
SELECT COUNT(*) AS service_log_count FROM service_logs;
SELECT COUNT(*) AS invoice_count FROM invoices;
