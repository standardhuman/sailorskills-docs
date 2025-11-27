# Zoho Billing Migration Scripts

## Overview
Migrates 1,804 invoices, 1,552 payments, 174 customers from Zoho Billing to Sailor Skills.

## Prerequisites
- Node.js 18+
- Access to Supabase production database
- Zoho CSV exports in /Users/brian/Downloads/

## CSV Files Required
- Customers.csv (175 rows)
- Invoice.csv (1,805 rows)
- Payments.csv (1,553 rows)

## Execution Order
1. `npm run analyze` - Parse CSVs, generate statistics
2. `npm run map-customers` - Match Zoho customers to Sailor Skills by email
3. `npm run import-invoices` - Import invoices with Stripe linking
4. `npm run import-payments` - Create Zoho Payments records
5. `npm run link-service-logs` - Link service_logs to invoices
6. `npm run validate` - Validate data integrity

## Generated Files
- `customer-mapping.json` - Zoho ID → Sailor Skills ID map
- `unmatched-customers.csv` - Manual review needed
- `migration-report.json` - Statistics and results
- `unlinked-service-logs.csv` - Manual linking needed
- `stripe-payment-cache.json` - Stripe payments cache

## Rollback
`npm run rollback` - Delete all migrated data (invoices with ZB- prefix)

## Safety Features
- Dry-run mode in all scripts
- Transaction support
- Detailed logging
- Rollback capability
