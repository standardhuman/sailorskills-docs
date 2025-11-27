# DNS Configuration for Portal Separation

**Date:** 2025-10-25

## Required DNS Changes in Squarespace (or DNS Provider)

### Add New Record for Customer Portal

Add this A record to your DNS provider:

```
Type: A
Name: portal
Value: 76.76.21.21
TTL: Auto (or 3600)
```

**Full domain:** `portal.sailorskills.com`

### Verification

Once the DNS record is added:
1. Vercel will automatically verify the domain (may take up to 48 hours)
2. You'll receive an email confirmation from Vercel
3. The portal will be accessible at https://portal.sailorskills.com

### Current Domain Configuration

- **ops.sailorskills.com** - Already configured ✅ (Admin Dashboard)
- **portal.sailorskills.com** - Pending DNS configuration ⏳ (Customer Portal)
- **billing.sailorskills.com** - Already configured ✅ (Billing System)
- **diving.sailorskills.com** - Already configured ✅ (Estimator)

### Testing After DNS Propagation

Check DNS propagation status:
```bash
# Check if DNS is propagated
dig portal.sailorskills.com

# Test HTTPS access
curl -I https://portal.sailorskills.com
```

### Rollback (if needed)

If issues arise, simply remove the DNS record. The old portal URLs in Operations will continue to work until you remove those files.

---

**Next Steps:**
1. Add the A record in your DNS provider (Squarespace)
2. Wait for Vercel email confirmation (usually < 1 hour, max 48 hours)
3. Test portal at https://portal.sailorskills.com
4. Once verified, proceed with removing portal files from Operations repo
