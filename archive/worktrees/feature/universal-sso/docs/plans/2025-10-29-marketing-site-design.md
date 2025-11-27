# Sailorskills Marketing Site Design

**Date**: 2025-10-29
**Author**: Brian
**Status**: Approved
**Purpose**: Marketing site to attract dive business partners and showcase active development

---

## Executive Summary

The **sailorskills-marketing** site is a dual-purpose marketing platform targeting:
1. **Marine service providers (divers)** - showcase product value and operational benefits
2. **Potential dive business partners** - invite collaboration using Sailorskills as the operational engine

The site uses a **hybrid static + dynamic API architecture** to balance performance with fresh, live content showcasing active development through curated commit stories, programmatic screenshots, and roadmap visibility.

---

## Business Objectives

### Primary Goals
- **Customer Acquisition**: Demonstrate product value to marine service providers
- **Partner Recruitment**: Attract fellow divers to join forces and grow together
- **Credibility Building**: Show active development, transparent progress, and modern tech stack
- **Lead Qualification**: Capture serious interest through gated content (financial models, business plans)

### Success Metrics
- Partner inquiry form submissions (target: 5-10/month initially)
- Time on site and engagement with development feed
- Gated content access requests
- Conversion to demo calls or partnership discussions

---

## Target Audiences

### Primary: Dive Business Operators
- Professional divers running service businesses
- Pain points: manual invoicing, service tracking chaos, inventory management
- Looking for: proven operational platform, technology partner, growth opportunity

### Secondary: Marine Service Customers
- Marinas, boat owners, fleet managers
- Want to understand the service quality and professionalism
- Reassured by: modern platform, systematic approach, transparency

---

## Technical Architecture

### Frontend Stack
- **Vite** - Fast build tool, consistent with existing Sailorskills services
- **Vanilla JavaScript** - Modular components, no framework overhead
- **Tailwind CSS** (or similar utility framework) - Rapid styling, responsive design
- **Shared Package** (potential) - Common navigation/branding components

### Backend Services

**Vercel Serverless Functions** (`/api/` directory):
```
/api/github-activity     - Fetch curated commits and roadmap data
/api/screenshots         - Trigger/serve screenshot generation
/api/request-access      - Handle partner inquiry form submissions
```

**Supabase Database**:
```sql
CREATE TABLE partner_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  business_name TEXT,
  location TEXT,
  message TEXT,
  interest_type TEXT, -- 'partner', 'customer', 'demo', 'other'
  requested_at TIMESTAMP DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE
);
```

**External Integrations**:
- GitHub API (commit history, roadmap parsing)
- Playwright (screenshot generation)
- SendGrid/email service (notifications and gated content delivery)

### Project Structure
```
sailorskills-marketing/
├── src/
│   ├── pages/
│   │   ├── home.js           # Hero, value prop, product overview
│   │   ├── product.js        # Deep dive on each service
│   │   ├── development.js    # Building in public section
│   │   └── partners.js       # Partner opportunity, gated content
│   ├── components/
│   │   ├── navigation.js
│   │   ├── screenshot-gallery.js
│   │   ├── dev-feed.js
│   │   ├── partner-form.js
│   │   └── service-card.js
│   ├── api/
│   │   ├── github.js         # GitHub API wrapper
│   │   └── supabase.js       # Supabase client
│   └── lib/
│       ├── utils.js
│       └── cache.js
├── api/                      # Serverless functions
│   ├── github-activity.js
│   ├── screenshots.js
│   └── request-access.js
├── public/
│   ├── screenshots/          # Generated screenshots
│   └── assets/
├── scripts/
│   └── capture-screenshots.js  # Build-time Playwright script
├── vite.config.js
├── vercel.json
└── package.json
```

---

## Page Structure & Content

### 1. Home Page
**Hero Section**:
- Headline: "Marine Service Management, Perfected"
- Subheadline: "Purpose-built platform for dive businesses - estimating, operations, billing, and inventory in one unified system"
- Dual CTAs: "See How It Works" + "Grow With Us"

**Problem/Solution**:
- Pain Point 1: Manual invoicing and payment tracking → Automated billing with Stripe
- Pain Point 2: Service log chaos and data loss → Structured service tracking with propeller history
- Pain Point 3: Inventory guesswork → Real-time anode and parts tracking
- Visual: Before/After comparison

**Product Showcase Grid**:
- 8 service cards with screenshots, hover for details
- Each card: Service name, tagline, key feature, screenshot thumbnail
- Click → Navigate to Product page for deep dive

**Social Proof Placeholder**:
- "Join the future of professional marine service management"
- Testimonials/case studies when available

### 2. Product Deep Dive
**Service-by-Service Breakdown**:

Each service gets its own section with:
- **Screenshot(s)**: Programmatically captured, auto-updated
- **Key Features**: Bullet list of 3-5 primary capabilities
- **Pain Point Solved**: User story format ("Stop doing X, start doing Y")
- **Technical Highlights**: Brief tech stack mention for credibility

Services to feature:
1. **Estimator** - Customer acquisition, pricing, quote generation
2. **Operations** - Field service management, client portal, service logs
3. **Billing** - Stripe integration, invoicing, payment tracking
4. **Inventory** - Anode tracking, parts management, stock levels
5. **Dashboard** - Analytics, business intelligence, reporting
6. **Portal** - Customer self-service, invoice viewing, service history
7. **Booking** - Training scheduling, Google Calendar sync
8. **Video** - Service video workflows, YouTube integration

**Interactive Data Flow Diagram**:
- Visual showing: Customer inquiry → Estimate → Service → Billing → Payment → Analytics
- Highlight integration points between services

### 3. Building in Public / Development
**Roadmap Overview**:
- Parse from `ROADMAP.md` in main repository
- Display quarterly objectives (Q4 2025, Q1 2026, etc.)
- Progress indicators: Completed, In Progress, Planned
- Link to design docs for major features

**Live Development Feed**:
- **Source**: Existing commit stories feature (migrated into this project)
- **Content**: AI-translated commit messages addressing founder/customer pain points
- **Display**: Timeline or card-based layout
  - Commit message (translated)
  - Date and service(s) affected
  - Link to GitHub commit for transparency
- **Filtering**: By service, date range, feature type
- **Update Frequency**: API cached for 1 hour, refreshes automatically

**Recent Milestones**:
- Pull from `docs/plans/*.md` design documents
- Display as achievement cards with dates
- Examples: "Pending Orders Queue", "Transaction Viewing System", "Zoho Migration"
- Shows systematic, thoughtful development approach

**Tech Stack Transparency**:
- What we're built with: Vite, Supabase, Stripe, Playwright, Gemini AI
- Why these choices: Performance, developer experience, cost-effectiveness
- Open development philosophy: "Watch us solve real problems in real-time"

### 4. For Partners (Dive Business Operators)
**Vision & Mission**:
- "Empowering professional divers to run exceptional businesses"
- Technology as enabler, not barrier
- Network of professional operators using shared platform

**Market Opportunity**:
- High-level industry context (no specific financial numbers publicly)
- Fragmented market, manual processes, opportunity for modernization
- Growing demand for professional marine services

**What We're Looking For**:
- Professional dive businesses ready to modernize
- Operators who value systematization and efficiency
- Partners interested in collaborative growth
- Geographic diversity (territory opportunities)

**Gated Content CTA**:
- "View Detailed Business Plan & Financial Models"
- Simple form (see Form Fields below)
- Upon submission: Email with PDF deck, financial projections, next steps

**How to Get Involved**:
- Submit partner inquiry
- Schedule intro call
- Review detailed materials
- Explore territory/partnership fit

### 5. Partner Inquiry Form

**Form Fields**:
- Name (required)
- Email (required)
- Business Name
- Location (City, State)
- "Tell us about your operation" (textarea)
- "I'm interested in:" (radio buttons)
  - [ ] Partnering to grow my dive business
  - [ ] Requesting a product demo
  - [ ] Learning more about the platform
  - [ ] Other

**Form Behavior**:
1. Client-side validation
2. Submit to `/api/request-access`
3. Server-side validation and Supabase insert
4. Send auto-response email with:
   - Thank you message
   - PDF business deck (if "partnering" selected)
   - Link to detailed financial models
   - Calendar link for intro call
5. Notify Brian via email/Slack
6. Success message with next steps

**Error Handling**:
- Preserve form data on failure
- Clear error messages
- Email fallback: "Having trouble? Email partners@sailorskills.com"

---

## Data Flow & Integration

### Screenshot Generation System

**Build-Time Generation** (Primary):
```javascript
// scripts/capture-screenshots.js
import { chromium } from 'playwright';

const services = [
  { name: 'billing', url: 'https://sailorskills-billing.vercel.app', screens: [...] },
  { name: 'operations', url: 'https://sailorskills-operations.vercel.app', screens: [...] },
  // ... etc
];

// For each service:
// 1. Launch browser
// 2. Login with standardhuman@gmail.com / KLRss!650
// 3. Navigate to each key screen
// 4. Capture screenshot (optimized WebP)
// 5. Save to public/screenshots/ with metadata
// 6. Generate screenshots.json manifest
```

**Integration Points**:
- Runs during Vercel build process
- Timeout: 10 minutes max for all screenshots
- Fallback: Use last-known-good screenshots from repository
- Metadata includes: timestamp, service, screen name, dimensions

**On-Demand Refresh** (Secondary):
- Serverless function: `/api/screenshots?service=billing&refresh=true`
- Manual trigger for when services get major UI updates
- Stores new screenshots in Vercel blob storage or public/ directory
- Updates metadata manifest

**Screenshot Metadata Format**:
```json
{
  "generated_at": "2025-10-29T12:34:56Z",
  "screenshots": [
    {
      "service": "sailorskills-billing",
      "screen": "invoice-detail",
      "url": "/screenshots/billing-invoice-detail.webp",
      "thumbnail_url": "/screenshots/thumbs/billing-invoice-detail.webp",
      "alt": "Invoice detail view showing line items and payment status"
    }
  ]
}
```

### Development Feed (Commit Stories)

**Source**: Existing commit stories feature built for this project

**Migration Plan**:
1. Move commit stories code into `src/lib/commit-stories/`
2. Adapt API endpoint to run as Vercel serverless function
3. Maintain existing AI translation functionality
4. Add caching layer for performance

**API Endpoint**: `/api/github-activity`
```javascript
// Fetches:
// - Curated commits from GitHub API
// - Filters by tags/patterns or manual selection
// - AI-translates to address pain points
// - Returns JSON for frontend consumption

// Caching:
// - Server: 5 minutes
// - Client: 1 hour (localStorage)
```

**Frontend Display**:
```javascript
// components/dev-feed.js
export class DevFeed {
  async loadCommits() {
    const cached = this.checkCache();
    if (cached && !this.isStale(cached)) return cached;

    const commits = await fetch('/api/github-activity').then(r => r.json());
    this.updateCache(commits);
    return commits;
  }

  render(commits) {
    // Timeline layout with:
    // - Date grouping
    // - Service badges
    // - Translated commit message
    // - Link to GitHub commit
    // - Filter controls
  }
}
```

### Roadmap Integration

**Source**: `ROADMAP.md` in main sailorskills-repos directory

**Parsing Strategy**:
1. Fetch ROADMAP.md from GitHub (build-time or API)
2. Parse markdown structure (quarterly sections)
3. Extract objectives, status indicators, linked design docs
4. Generate structured JSON for frontend

**Display Format**:
- Interactive roadmap visualization
- Quarterly view with progress bars
- Clickable items link to design docs
- Shows: Completed ✓, In Progress →, Planned ○

### Gated Content Delivery

**Flow**:
1. User submits partner inquiry form
2. `/api/request-access` serverless function receives POST
3. Validate and sanitize input
4. Insert into Supabase `partner_requests` table
5. If "partnering" selected:
   - Send email with PDF deck attached
   - Include link to detailed financial models (secure URL)
   - Add to email sequence (future)
6. Send notification to Brian (email/Slack)
7. Return success response to frontend

**Email Template**:
```
Subject: Welcome to Sailorskills Partnership Opportunity

Hi {Name},

Thank you for your interest in partnering with Sailorskills!

I've attached our business plan and financial projections. This includes:
- Market opportunity analysis
- Revenue model and projections
- Territory structure
- Support and training overview

Next steps:
1. Review the attached materials
2. Schedule an intro call: [calendar link]
3. We'll discuss your operation and partnership fit

Looking forward to connecting!

Brian
Founder, Sailorskills
```

---

## Performance Optimization

### Core Web Vitals Targets
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### Optimization Strategies

**Images/Screenshots**:
- WebP format with JPEG fallback
- Responsive sizes: `srcset` with 320w, 640w, 1024w, 1920w
- Lazy loading for below-the-fold content
- Thumbnail generation for gallery views
- Optimize during build: sharp or similar

**JavaScript**:
- Code splitting by page
- Defer non-critical scripts
- Inline critical path CSS
- Minimize third-party scripts
- Bundle size target: < 100KB gzipped

**Caching Strategy**:
```
Static Assets (HTML, CSS, JS):
  - Vercel Edge CDN
  - Cache-Control: public, max-age=31536000, immutable (for hashed assets)
  - Versioned filenames for cache busting

API Responses:
  - /api/github-activity: stale-while-revalidate, 1 hour
  - /api/screenshots: stale-while-revalidate, 24 hours
  - Client-side localStorage cache with TTL

Screenshots:
  - CDN caching via Vercel Edge
  - Versioned filenames (hash or timestamp)
  - Fallback to repository-stored versions
```

**Network Optimization**:
- HTTP/2 server push for critical assets
- Preconnect to external domains (GitHub API, Supabase)
- Resource hints: `<link rel="preload">` for fonts/critical CSS
- Minimize DNS lookups

---

## Error Handling & Resilience

### Screenshot Generation Failures

**Scenarios**:
- Playwright timeout
- Service unavailable (staging down)
- Build time limit exceeded

**Mitigation**:
1. **Fallback to cached screenshots**: Store last-known-good in `/public/screenshots-fallback/`
2. **Partial success handling**: If some screenshots fail, use those that succeeded
3. **Stale detection**: Show "Last updated: X days ago" if > 7 days old
4. **Admin notification**: Email Brian if screenshots fail during build
5. **Graceful degradation**: Show placeholder with message "Screenshot updating soon..."

### API Failures (GitHub, External Services)

**GitHub API**:
- Rate limiting: Cache aggressively, use conditional requests (ETags)
- Unavailability: Serve cached data with "Last updated" timestamp
- Retry logic: Exponential backoff (1s, 2s, 4s)

**Development Feed**:
- Check localStorage cache first (1-hour TTL)
- If API fails: Show cached data with banner "Using cached data from [time]"
- After 3 retries: Show user-friendly message "Development feed temporarily unavailable"

**Screenshot Service**:
- If real-time generation fails: Serve static screenshots
- If no screenshots available: Show service logo + description (no image)

### Form Submission Failures

**Client-Side Validation**:
- Required fields: name, email
- Email format validation
- Character limits on textarea
- Show inline errors before submission

**Server-Side Failures**:
```javascript
// api/request-access.js error handling
try {
  // Validate input
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Insert to Supabase
  const { error } = await supabase.from('partner_requests').insert({...});
  if (error) throw error;

  // Send email
  await sendEmail({...});

  return res.status(200).json({ success: true });

} catch (err) {
  console.error('Form submission error:', err);

  // Log to error tracking (Sentry)
  logError(err);

  // Return user-friendly error
  return res.status(500).json({
    error: 'Submission failed. Please try again or email partners@sailorskills.com'
  });
}
```

**Frontend Error Handling**:
- Preserve form data on failure (don't clear fields)
- Show clear error message with retry option
- Provide email fallback contact
- Track failed submissions in separate error log table for manual follow-up

### Monitoring & Alerting

**Error Tracking**:
- Integrate Sentry or similar (free tier)
- Track: JavaScript errors, API failures, form submission issues
- Alert on: Screenshot generation failure, email delivery failure

**Performance Monitoring**:
- Vercel Analytics (built-in)
- Track: Page load times, API response times, Core Web Vitals
- Alert on: Degraded performance (> 5s load time)

**Business Metrics**:
- Form submission success rate (target: > 95%)
- Screenshot freshness (target: < 7 days)
- API uptime (target: > 99%)

---

## Testing Strategy

### Playwright E2E Tests

**Critical Paths**:
```javascript
// tests/partner-form.spec.js
test('Partner inquiry form submission flow', async ({ page }) => {
  await page.goto('/partners');
  await page.fill('[name="name"]', 'Test Diver');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="business_name"]', 'Test Marine Services');
  await page.selectOption('[name="interest_type"]', 'partner');
  await page.click('button[type="submit"]');

  // Verify success message
  await expect(page.locator('.success-message')).toBeVisible();

  // Verify email sent (check test inbox or mock)
});

// tests/screenshot-gallery.spec.js
test('Screenshot gallery loads and displays images', async ({ page }) => {
  await page.goto('/product');

  // Verify screenshots load
  const screenshots = await page.locator('.screenshot-card');
  await expect(screenshots).toHaveCount(8); // One per service

  // Verify lazy loading works
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.locator('.screenshot-card img[loading="lazy"]')).toBeVisible();
});

// tests/dev-feed.spec.js
test('Development feed loads and filters work', async ({ page }) => {
  await page.goto('/development');

  // Verify feed loads
  await expect(page.locator('.commit-card')).toHaveCount.greaterThan(0);

  // Test filtering by service
  await page.click('[data-filter="billing"]');
  const billingCommits = await page.locator('.commit-card[data-service="billing"]');
  await expect(billingCommits.first()).toBeVisible();
});
```

**Cross-Browser Testing**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Mobile: iOS Safari, Android Chrome

### Manual Testing Checklist

**Responsive Design**:
- [ ] Mobile (375px, 414px)
- [ ] Tablet (768px, 1024px)
- [ ] Desktop (1280px, 1920px)
- [ ] Navigation collapses properly on mobile
- [ ] Forms usable on touch devices
- [ ] Screenshots display well at all sizes

**Network Conditions**:
- [ ] Fast 3G simulation (Chrome DevTools)
- [ ] Offline behavior (show cached content)
- [ ] Slow image loading (lazy load works)

**Form Validation**:
- [ ] Required field validation
- [ ] Email format validation
- [ ] Success state shows next steps
- [ ] Error states clear and actionable

**Content Display**:
- [ ] All screenshots load and display correctly
- [ ] Development feed shows recent commits
- [ ] Roadmap displays with correct progress indicators
- [ ] Gated content triggers properly

**Email Delivery**:
- [ ] Auto-response email arrives (< 1 minute)
- [ ] Email formatting correct (no broken images, links work)
- [ ] PDF attachment included for partners
- [ ] Notification email sent to Brian

---

## Deployment Configuration

### Vercel Setup

**Production URL**: `sailorskills.com` (or `sailorskills-marketing.vercel.app` initially)

**Build Settings**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

**Environment Variables**:
```bash
# Supabase
VITE_SUPABASE_URL=https://fzygakldvvzxmahkdylq.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>

# GitHub API (for commit feed)
GITHUB_PAT=<personal_access_token>
GITHUB_REPO=anthropics/sailorskills-repos

# Email Service (SendGrid, Resend, or similar)
SENDGRID_API_KEY=<api_key>
EMAIL_FROM=partnerships@sailorskills.com
EMAIL_NOTIFY=brian@sailorskills.com

# Screenshot Service (if using external)
SCREENSHOT_SERVICE_URL=<optional_url>

# Test Credentials (for screenshot generation)
TEST_USER_EMAIL=standardhuman@gmail.com
TEST_USER_PASSWORD=<stored_securely>
```

**Deployment Triggers**:
- Auto-deploy on push to `main` branch
- Preview deployments for all branches
- Manual deploys via Vercel CLI

### CI/CD Pipeline

**Build Steps**:
1. Install dependencies (`npm install`)
2. Run Playwright screenshot capture script (timeout: 10 min)
3. Build Vite app (`npm run build`)
4. Run E2E tests (`npx playwright test`)
5. Deploy to Vercel

**Screenshot Generation in CI**:
```yaml
# vercel.json or build script
{
  "buildCommand": "node scripts/capture-screenshots.js && npm run build"
}
```

**Fallback Strategy**:
- If screenshot generation fails (timeout/error), skip and use cached screenshots
- Build should not fail if screenshots fail
- Log warning and notify

### Ongoing Maintenance

**Scheduled Tasks**:
- Screenshot regeneration: Weekly (Vercel cron or GitHub Actions)
- Development feed cache clear: Hourly
- Stale content check: Daily (alert if > 7 days old)

**Content Updates**:
- Manual: Edit JSON files in `/src/data/` for quick updates
- Automatic: Pull from GitHub (roadmap, commit feed)
- Screenshots: Auto-update on each deployment or weekly cron

**Partner Request Management**:
- Review via Supabase dashboard
- Export to CSV for CRM import
- Follow-up tracking (future: add status column)

---

## Future Enhancements (Post-Launch)

### Phase 2 (Month 2-3)
- **A/B testing**: Hero messaging, CTA variations
- **Analytics dashboard**: Partner inquiry sources, conversion funnel
- **SEO optimization**: Meta descriptions, structured data, sitemap
- **Blog integration**: Development updates, case studies, technical deep dives

### Phase 3 (Month 4-6)
- **Customer testimonials**: Video interviews, written case studies
- **Live chat**: Intercom or similar for immediate engagement
- **Email sequences**: Automated follow-up for partner inquiries
- **Demo booking**: Integrated calendar (Calendly or custom)

### Phase 4 (Month 6+)
- **Partner portal**: Private area for partners to access resources
- **ROI calculator**: Interactive tool showing cost savings
- **Localized content**: Multi-language support for international markets
- **API documentation**: Public API docs for technical evaluation

---

## Success Criteria

### Launch Goals (Month 1)
- [ ] Site deployed and accessible
- [ ] All 8 services showcased with screenshots
- [ ] Development feed showing live commits
- [ ] Partner inquiry form functional and tested
- [ ] Gated content delivery working
- [ ] Page load time < 3s on 4G
- [ ] Mobile responsive across all pages

### 3-Month Goals
- [ ] 10+ partner inquiry submissions
- [ ] 3+ scheduled partnership discussions
- [ ] Page views: 500+/month
- [ ] Average time on site: > 2 minutes
- [ ] Bounce rate: < 60%

### 6-Month Goals
- [ ] 1-2 active partner onboardings
- [ ] 50+ qualified leads (demo + partner inquiries)
- [ ] Organic search traffic: 100+/month
- [ ] Testimonials/case studies published
- [ ] Conversion rate (visit → inquiry): > 2%

---

## Appendix: Reference Links

**Existing Services**:
- Billing: https://sailorskills-billing.vercel.app
- Operations: https://sailorskills-operations.vercel.app
- Dashboard: https://sailorskills-dashboard.vercel.app
- Portal: https://sailorskills-portal.vercel.app
- Inventory: https://sailorskills-inventory.vercel.app
- Estimator: https://sailorskills-estimator.vercel.app

**Repository Structure**:
- Main repo: `/Users/brian/app-development/sailorskills-repos/`
- Roadmap: `ROADMAP.md`
- Design docs: `docs/plans/`

**Related Projects**:
- Commit stories feature: (to be migrated into sailorskills-marketing)
- Business models: `sailorskills-business/` directory

---

## Conclusion

The **sailorskills-marketing** site is a strategic investment in customer acquisition and partner recruitment. By showcasing active development through curated commit stories, programmatic screenshots, and transparent roadmap visibility, we build credibility with both audiences.

The hybrid static + dynamic architecture balances performance with freshness, ensuring the site remains current without constant manual updates. Gated content filtering creates a qualified lead funnel for serious partnership discussions.

This design positions Sailorskills as a modern, transparent, and professional platform worthy of trust from dive business operators looking to modernize their operations and grow together.

**Next Steps**: Create implementation plan and begin Phase 1 development.
