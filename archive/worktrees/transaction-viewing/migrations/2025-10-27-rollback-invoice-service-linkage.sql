-- Rollback Migration: Invoice-Service Linkage
-- Date: 2025-10-27
-- Service: Operations, Billing, Portal
-- Tables: service_logs, payments, transaction_details view
--
-- Purpose:
-- Rollback the invoice-service linkage migration (Migration 015)
--
-- Impact:
-- Removes bi-directional linking between invoices and service_logs
-- Removes transaction_details view
-- Removes customer payment RLS policy

-- Drop optimized transaction view
DROP VIEW IF EXISTS transaction_details;

-- Drop RLS policy for customer payment access
DROP POLICY IF EXISTS "Customers can view own payments" ON payments;

-- Drop index on service_logs.invoice_id
DROP INDEX IF EXISTS idx_service_logs_invoice_id;

-- Remove invoice_id column from service_logs
ALTER TABLE service_logs DROP COLUMN IF EXISTS invoice_id;
