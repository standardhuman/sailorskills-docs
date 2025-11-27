# Vercel Staging Configuration Checklist

**Track your progress configuring each service**

Date Started: _____________

---

## Configuration Progress

### Critical Services (Must complete first)

#### 1. sailorskills-login
- [ ] Verify staging branch tracked
- [ ] Add environment variables (3 variables)
- [ ] Configure domain: `login-staging.sailorskills.com`
- [ ] Verify deployment succeeds
- [ ] Test: Can visit login page
- [ ] Test: Can authenticate
- [ ] Notes: _______________________________

#### 2. sailorskills-portal
- [ ] Verify staging branch tracked
- [ ] Add environment variables (3 variables)
- [ ] Configure domain: `portal-staging.sailorskills.com`
- [ ] Verify deployment succeeds
- [ ] Test: Can load dashboard
- [ ] Test: Authenticated pages work
- [ ] Notes: _______________________________

#### 3. sailorskills-operations
- [ ] Verify staging branch tracked
- [ ] Add environment variables (6 variables: Supabase + Google)
- [ ] Configure domain: `ops-staging.sailorskills.com`
- [ ] Verify deployment succeeds
- [ ] Test: Can load operations dashboard
- [ ] Test: Service management works
- [ ] Notes: _______________________________

#### 4. sailorskills-billing
- [ ] Verify staging branch tracked
- [ ] Add environment variables (6 variables: Supabase + Stripe TEST)
- [ ] Configure domain: `billing-staging.sailorskills.com`
- [ ] Verify deployment succeeds
- [ ] Test: Can load billing page
- [ ] Test: Stripe test mode active
- [ ] Notes: _______________________________

---

### Supporting Services

#### 5. sailorskills-estimator
- [ ] Verify staging branch tracked
- [ ] Add environment variables (4 variables: Supabase + Gemini)
- [ ] Configure domain: `estimator-staging.sailorskills.com`
- [ ] Verify deployment succeeds
- [ ] Notes: _______________________________

#### 6. sailorskills-settings
- [ ] Verify staging branch tracked
- [ ] Add environment variables (4 variables: Supabase + Resend)
- [ ] Configure domain: `settings-staging.sailorskills.com`
- [ ] Verify deployment succeeds
- [ ] Notes: _______________________________

#### 7. sailorskills-inventory
- [ ] Verify staging branch tracked
- [ ] Add environment variables (3 variables: Supabase)
- [ ] Configure domain: `inventory-staging.sailorskills.com`
- [ ] Verify deployment succeeds
- [ ] Notes: _______________________________

#### 8. sailorskills-insight
- [ ] Verify staging branch tracked
- [ ] Add environment variables (3 variables: Supabase)
- [ ] Configure domain: `insight-staging.sailorskills.com`
- [ ] Verify deployment succeeds
- [ ] Notes: _______________________________

#### 9. sailorskills-video
- [ ] Verify staging branch tracked
- [ ] Add environment variables (4 variables: Supabase + YouTube)
- [ ] Configure domain: `video-staging.sailorskills.com`
- [ ] Verify deployment succeeds
- [ ] Notes: _______________________________

#### 10. sailorskills-booking
- [ ] Verify staging branch tracked
- [ ] Add environment variables (6 variables: Supabase + Google Calendar)
- [ ] Configure domain: `booking-staging.sailorskills.com`
- [ ] Verify deployment succeeds
- [ ] Notes: _______________________________

#### 11. sailorskills-marketing
- [ ] Verify staging branch tracked
- [ ] Add environment variables (3 variables: Supabase)
- [ ] Configure domain: `marketing-staging.sailorskills.com`
- [ ] Verify deployment succeeds
- [ ] Notes: _______________________________

#### 12. sailorskills-site
- [ ] Verify staging branch tracked
- [ ] Add environment variables (3 variables: Supabase)
- [ ] Configure domain: `site-staging.sailorskills.com`
- [ ] Verify deployment succeeds
- [ ] Notes: _______________________________

#### 13. sailorskills-shared
- [ ] Verify staging branch tracked
- [ ] Add environment variables (if needed)
- [ ] Configure domain: `shared-staging.sailorskills.com` (if applicable)
- [ ] Verify deployment succeeds
- [ ] Notes: _______________________________

---

## Verification Tests

After all services configured:

- [ ] Run verification script: `node scripts/staging/verify-staging-deployment.mjs`
- [ ] All critical services return 200/30x
- [ ] All domains resolve with SSL
- [ ] No CORS errors in browser console
- [ ] Authentication flow works end-to-end

---

## DNS Configuration (If External DNS)

If using external DNS provider (not Vercel DNS):

- [ ] login-staging.sailorskills.com → CNAME → cname.vercel-dns.com
- [ ] portal-staging.sailorskills.com → CNAME → cname.vercel-dns.com
- [ ] ops-staging.sailorskills.com → CNAME → cname.vercel-dns.com
- [ ] billing-staging.sailorskills.com → CNAME → cname.vercel-dns.com
- [ ] estimator-staging.sailorskills.com → CNAME → cname.vercel-dns.com
- [ ] settings-staging.sailorskills.com → CNAME → cname.vercel-dns.com
- [ ] inventory-staging.sailorskills.com → CNAME → cname.vercel-dns.com
- [ ] insight-staging.sailorskills.com → CNAME → cname.vercel-dns.com
- [ ] video-staging.sailorskills.com → CNAME → cname.vercel-dns.com
- [ ] booking-staging.sailorskills.com → CNAME → cname.vercel-dns.com
- [ ] marketing-staging.sailorskills.com → CNAME → cname.vercel-dns.com
- [ ] site-staging.sailorskills.com → CNAME → cname.vercel-dns.com

---

## Common Issues & Solutions

### Issue: Build fails after adding env vars
**Solution**: Redeploy from Vercel dashboard after adding variables

### Issue: Domain shows "Domain not configured"
**Solution**: Wait 5-10 minutes for DNS propagation

### Issue: Redirects to production login
**Solution**: Update SSO redirect URLs in Phase 6

### Issue: Stripe webhooks fail
**Solution**: Configure Stripe staging webhook URLs in Stripe Dashboard

---

## Completion Sign-Off

- [ ] All 13 services deployed successfully
- [ ] Critical services tested and working
- [ ] Verification script passes
- [ ] Ready for Phase 6 (SSO updates)

**Completed By**: _____________
**Date**: _____________
**Time Spent**: _____________ hours

---

**Next**: Proceed to Phase 6 - Update SSO for staging environment
