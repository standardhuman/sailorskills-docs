# Commit Story UI Design
**Date:** 2025-10-29
**Purpose:** Co-founder recruitment tool for hull cleaner divers
**Location:** sailorskills-site `/story` page

## Overview

A web UI that translates git commit history into business-meaningful stories for potential co-founders from the hull cleaning industry. Shows how technical development solves real pain points marine service providers face daily.

## Target Audience

**Primary:** Hull cleaner divers considering joining as co-founders/partners
**Goal:** Build confidence in the technical execution and demonstrate understanding of their business challenges

## Key Requirements

- **Real-time:** Fetch commits from GitHub API on each request
- **AI Translation:** Use Gemini API to convert technical commits to business impact
- **Pain Point Focus:** Organize features by business problems solved
- **Curated:** Show only milestone commits, hide minor fixes/refactoring
- **Integrated:** Deploy as page within existing sailorskills-site

## Architecture

### Selected Approach: Server-Side with Caching

**Why:** Best balance of performance, security, and freshness
- Fast page loads via SSR and caching
- Secure API keys (GitHub, Gemini) server-side
- Updates hourly (fresh enough for recruiting)
- Lower cost than client-side API calls

### Request Flow

```
User → /story page
  ↓
Vercel Edge Function
  ↓
Check KV Cache (key: commit-story-v1)
  ↓
[Cache Hit] → Return cached HTML
  ↓
[Cache Miss]:
  1. Fetch commits from GitHub API
  2. Filter by milestone markers ([FEATURE], [FIX], [PHASE])
  3. Batch send to Gemini with translation prompt
  4. Parse response into pain point categories
  5. Store in KV cache (TTL: 1 hour)
  6. Render HTML
  ↓
Return SSR page
```

### Tech Stack

- **Edge Function:** Vercel Edge Functions (api/commit-story.js)
- **Caching:** Vercel KV (Redis)
- **APIs:** GitHub REST API, Gemini API
- **Frontend:** HTML/CSS/minimal JS (reuse sailorskills-site styling)
- **Deployment:** Vercel (existing sailorskills-site project)

## Gemini Translation Design

### Prompt Template

```
You are translating git commits for a marine service business management suite.
Target audience: Hull cleaner divers who run small marine service businesses.

Their daily pain points:
- Scheduling: Managing boat service appointments, tracking which boats need cleaning
- Billing: Creating invoices, tracking payments, handling customer accounts
- Inventory: Managing anode supplies, tracking installations on boats
- Communication: Keeping customers informed about service status
- Operations: Recording underwater work, propeller tracking, service history

For each commit below, identify:
1. Which pain point category it addresses (Scheduling, Billing, Inventory, Communication, Operations)
2. A 1-2 sentence business translation: what problem this solves for hull cleaners
3. Skip if it's internal tooling (tests, CI/CD, refactoring) unless directly impacts user workflow

Commits: [JSON array of commit messages and metadata]
```

### Response Format

```json
[
  {
    "category": "Operations",
    "business_impact": "Track propeller condition during underwater inspections so you can recommend replacements before customers experience failures.",
    "commit_sha": "abc123",
    "date": "2025-10-15"
  }
]
```

### Pain Point Categories

1. **Operations** - Core service delivery workflow (highest priority)
2. **Billing** - Invoice creation, payment tracking
3. **Scheduling** - Booking, estimating, appointment management
4. **Inventory** - Anode and supply management
5. **Communication** - Customer portal, notifications

## UI/UX Design

### Page Structure

**Header:**
- Title: "Building SailorSkills: Solving Real Problems for Hull Cleaners"
- Subtitle: Active development progress showing business challenges being solved
- Last updated timestamp

**Category Sections:**
Five expandable sections (one per pain point category):
- Category header with icon and feature count
- Feature cards with:
  - Business impact text (Gemini translation)
  - Date badge
  - Optional GitHub link for transparency

**Interactive Elements:**
- Expandable/collapsible categories (Operations expanded by default)
- Date range filter (Last 30/60/90 days, All time)
- Search box to find specific features

**Styling:**
- Reuse sailorskills-site existing design tokens
- Marine/nautical theming
- Mobile-responsive (phone-friendly)
- Print-friendly (for partner meetings)

### File Structure

```
sailorskills-site/
├── api/
│   └── commit-story.js          # Edge Function (GitHub + Gemini + KV)
├── pages/
│   └── story.html               # Main story page
├── js/
│   └── story-ui.js              # Client-side filters/interactions
└── css/
    └── story.css                # Additional styling if needed
```

## Implementation Details

### Commit Filtering

**Include:**
- Commits with milestone markers: `[FEATURE]`, `[FIX]`, `[PHASE]`, `[DOC]`
- Only main branch commits
- Last 6 months of activity

**Exclude:**
- Unmarked commits (regular development)
- Test-only changes (unless user-facing)
- Internal refactoring

### Environment Variables

```
GITHUB_TOKEN         # For API rate limits
GEMINI_API_KEY       # Already configured in suite
VERCEL_KV_*          # Auto-configured with KV store
```

### Caching Strategy

- **TTL:** 1 hour (balance freshness vs API costs)
- **Key:** `commit-story-v1` (version for cache busting)
- **Invalidation:** Auto-expire + manual override endpoint
- **Stale-while-revalidate:** Serve stale cache if APIs fail

## Error Handling

### GitHub API Failures
- Rate limit: Serve stale cache with notice
- Downtime: Extend cache TTL, show "Last updated" timestamp
- Fallback: Static list of hand-picked milestones

### Gemini API Failures
- Retry once with exponential backoff
- Fallback: Raw commit messages with keyword-based categorization
- Cache whatever succeeds to avoid repeated failures

### Cache Unavailable
- Generate translations on-the-fly (slower, but functional)
- Set 5s timeout to prevent hanging

### Empty Results
- Show "Development in progress - check back soon"
- Manual override to force-show specific commits

## Testing Strategy

### Local Development
1. Test edge function with `vercel dev`
2. Mock GitHub API responses (sample JSON)
3. Mock Gemini responses for consistency
4. Verify KV caching with emulator

### Integration Testing
1. Real GitHub API with small batch
2. Gemini translation quality validation
3. Cache hit/miss scenarios
4. Category assignment accuracy

### User Testing
1. Show to 1-2 hull cleaner divers
2. Verify translations are meaningful
3. Confirm pain point categories resonate

## Deployment Plan

1. Add Vercel KV store to sailorskills-site project
2. Set environment variables in Vercel dashboard
3. Deploy to preview branch first
4. Test with real data
5. Merge to main
6. Monitor edge function logs for 24 hours

## Iteration & Refinement

**Post-launch:**
- Refine Gemini prompt based on translation quality
- Adjust commit filtering if showing too many/few
- Tune cache TTL based on usage patterns
- Collect feedback from prospects viewing the page

## Success Metrics

- Qualitative: Do hull cleaner divers understand the value being built?
- Engagement: Time on page, category expansion patterns
- Conversion: Does this help close co-founder conversations?

## Future Enhancements (Out of Scope)

- Personalized story based on visitor's specific pain points
- Video demos linked to major features
- Newsletter signup to get updates on new features
- A/B test different translation tones
