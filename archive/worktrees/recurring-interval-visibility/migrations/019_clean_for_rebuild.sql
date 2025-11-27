-- Migration: Clean database for rebuild
-- Date: 2025-11-04
-- Purpose: Delete boats, customers, service data while preserving invoices/payments
-- IMPORTANT: Run backups first! This is irreversible.

-- Show counts before deletion
SELECT 'BEFORE DELETION' as status,
  (SELECT COUNT(*) FROM service_schedules) as service_schedules,
  (SELECT COUNT(*) FROM service_logs) as service_logs,
  (SELECT COUNT(*) FROM boat_anodes) as boat_anodes,
  (SELECT COUNT(*) FROM addresses) as addresses,
  (SELECT COUNT(*) FROM boats) as boats,
  (SELECT COUNT(*) FROM customers) as customers,
  (SELECT COUNT(*) FROM marinas) as marinas,
  (SELECT COUNT(*) FROM invoices) as invoices_preserved,
  (SELECT COUNT(*) FROM payments) as payments_preserved;

-- Delete in dependency order
DELETE FROM service_schedules;
DELETE FROM service_logs;
DELETE FROM boat_anodes;
DELETE FROM addresses;
DELETE FROM boats;
DELETE FROM customers;
DELETE FROM marinas;

-- Show counts after deletion
SELECT 'AFTER DELETION' as status,
  (SELECT COUNT(*) FROM service_schedules) as service_schedules,
  (SELECT COUNT(*) FROM service_logs) as service_logs,
  (SELECT COUNT(*) FROM boat_anodes) as boat_anodes,
  (SELECT COUNT(*) FROM addresses) as addresses,
  (SELECT COUNT(*) FROM boats) as boats,
  (SELECT COUNT(*) FROM customers) as customers,
  (SELECT COUNT(*) FROM marinas) as marinas,
  (SELECT COUNT(*) FROM invoices) as invoices_preserved,
  (SELECT COUNT(*) FROM payments) as payments_preserved;

-- Verify invoices and payments still exist
SELECT 'VERIFICATION' as status,
  CASE
    WHEN (SELECT COUNT(*) FROM invoices) = 0 THEN 'ERROR: Invoices were deleted!'
    WHEN (SELECT COUNT(*) FROM payments) = 0 THEN 'ERROR: Payments were deleted!'
    ELSE 'SUCCESS: Invoices and payments preserved'
  END as result;
