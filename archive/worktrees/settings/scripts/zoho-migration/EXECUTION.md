# Migration Execution Guide

## Pre-Flight Checklist

- [ ] Backup production database
- [ ] Verify Zoho CSV files are latest export
- [ ] Review customer-mapping.json (no critical unmapped customers)
- [ ] Team notified of migration window
- [ ] Set DRY_RUN=false in .env

## Execution Steps

### Phase 1: Analysis and Mapping (30 minutes)

```bash
cd scripts/zoho-migration

# 1. Analyze Zoho data
npm run analyze

# Review analysis-report.json
cat analysis-report.json

# 2. Map customers
npm run map-customers

# Review customer-mapping.json
cat customer-mapping-stats.json

# If unmatched customers, create them in database first
# Then re-run: npm run map-customers
```

**Checkpoint:** Verify >85% customer match rate

### Phase 2: Invoice Import (2-3 hours)

```bash
# 3. Run invoice import in DRY RUN first
DRY_RUN=true npm run import-invoices

# Review results
cat invoice-import-results.json

# If looks good, run for real
DRY_RUN=false npm run import-invoices
```

**Checkpoint:** Verify invoice count ~1,415-1,633

```bash
# Query database to verify
source ../../db-env.sh
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM invoices WHERE invoice_number LIKE 'ZB-%'"
```

### Phase 3: Payments Import (1-2 hours)

```bash
# 4. Run payments import in DRY RUN first
DRY_RUN=true npm run import-payments

# Review results
cat zoho-payments-import-results.json

# Run for real
DRY_RUN=false npm run import-payments
```

**Checkpoint:** Verify ~220-283 Zoho payments created

```bash
source ../../db-env.sh
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM payments WHERE payment_method='zoho'"
```

### Phase 4: Service Log Linking (1-2 hours)

```bash
# 5. Link service logs in DRY RUN first
DRY_RUN=true npm run link-service-logs

# Review results
cat service-log-linkage-results.json

# Run for real
DRY_RUN=false npm run link-service-logs
```

**Checkpoint:** Verify service logs linked

```bash
source ../../db-env.sh
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM service_logs WHERE invoice_id IS NOT NULL"
```

### Phase 5: Validation (30 minutes)

```bash
# 6. Run validation
npm run validate

# Review results
cat validation-results.json
```

**Checkpoint:** All validation checks pass

### Phase 6: Manual Review (1-2 hours)

```bash
# Review unlinked service logs
cat unlinked-service-logs.csv

# Manually link if needed using SQL:
# UPDATE service_logs SET invoice_id = 'xxx' WHERE id = 'yyy'
```

### Phase 7: Portal Testing (1 hour)

1. Log into portal: https://sailorskills-portal.vercel.app
2. Verify invoices display correctly
3. Check multiple customers
4. Verify payment status shows correctly
5. Test filtering (paid/pending/overdue)

## Rollback Procedure (If Needed)

```bash
# Emergency rollback
npm run rollback

# Type "yes" to confirm
```

This will:
- Delete all ZB-* invoices
- Clear service_log links

## Post-Migration Tasks

- [ ] Delete 2 test invoices created earlier
- [ ] Archive Zoho CSV files
- [ ] Update team documentation
- [ ] Train team on Sailor Skills billing
- [ ] Process final Zoho invoices
- [ ] Schedule Zoho subscription cancellation (30 days)
- [ ] Monitor for issues

## Success Criteria

✅ All 1,415-1,633 invoices imported
✅ Revenue totals match Zoho (±$10)
✅ 1,000+ Stripe invoices linked
✅ 200+ Zoho Payments created
✅ Service logs linked where possible
✅ Portal displays correctly
✅ Team trained

## Troubleshooting

**Issue:** Customer mapping <85%
**Fix:** Review unmatched-customers.csv, create missing customers, re-run mapping

**Issue:** Invoice import fails
**Fix:** Check error in invoice-import-results.json, fix data, re-run

**Issue:** Payment linking fails
**Fix:** Verify Stripe API keys, check payment_intent format

**Issue:** Service log linkage <50%
**Fix:** Review matching logic, adjust date tolerances

## Support Contacts

- Database: Supabase dashboard
- Stripe: stripe.com/dashboard
- Questions: Check ZOHO_MIGRATION_HANDOFF.md
