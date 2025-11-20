# Service Completion Email Enhancement Design

**Date**: 2025-01-20
**Status**: Design Approved
**Author**: Claude (with Brian)

## Overview

Replace the current payment receipt email with a comprehensive service completion email that includes all service report details (boat conditions, anodes, propellers, pricing breakdown, YouTube videos) using the centralized email template system.

## Problem Statement

Currently, when charging customers in the Billing service:
- A receipt email is sent via `send-receipt` edge function
- Email only contains payment confirmation
- Service report details (boat conditions, anode replacements, propeller notes, YouTube videos) are not included
- Customers don't receive a comprehensive service summary

## Goals

1. **Replace** receipt email with service completion email
2. **Include** all service report data in email:
   - Boat condition details (paint, growth level, thru-hull)
   - Anode details (location, condition, replacements with pricing)
   - Propeller condition and notes
   - Service pricing breakdown
   - YouTube video thumbnails from boat's playlist
3. **Use** centralized email template system (Settings > Email Templates)
4. **Maintain** consistent email styling across all services
5. **Trigger** from both "Charge Customer" and "Send Invoice" buttons

## Architecture

### Current State

```
Billing charge flow → send-receipt edge function (Billing)
                      ↓
                  Inline HTML template
                      ↓
                  Resend API → Customer email
```

### Proposed Architecture

```
Billing charge flow → Collect all service data + fetch YouTube videos
                      ↓
                  send-notification edge function (Operations)
                      ↓
                  Load template from database (email_templates table)
                      ↓
                  Replace {{variables}} with actual data
                      ↓
                  Resend API → Customer email (with BCC monitoring)
```

### Why Operations' send-notification?

- ✅ Already implements centralized template loading from database
- ✅ Already handles variable replacement
- ✅ Already sends with BCC monitoring for auditing
- ✅ Aligns with existing Settings > Email Templates architecture
- ✅ `service_completion` template already exists and styled correctly

## Components & Changes

### 1. Email Template (Database: `email_templates`)

**Location**: Database table `email_templates`, `template_key = 'service_completion'`

**New Sections to Add**:

1. **Boat Conditions Section**:
   ```html
   <div class="conditions-section" style="padding: 0 40px 30px;">
     <h3 style="margin: 0 0 16px; color: #1e3a8a; font-size: 18px;">Boat Conditions</h3>
     <table width="100%" cellpadding="8" cellspacing="0">
       <tr>
         <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
           <p style="margin: 0; color: #6b7280; font-size: 14px;">Paint Condition</p>
         </td>
         <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
           <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">{{paintCondition}}</p>
         </td>
       </tr>
       <tr>
         <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
           <p style="margin: 0; color: #6b7280; font-size: 14px;">Growth Level</p>
         </td>
         <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
           <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">{{growthLevel}}</p>
         </td>
       </tr>
       <tr>
         <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
           <p style="margin: 0; color: #6b7280; font-size: 14px;">Thru-Hull Condition</p>
         </td>
         <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
           <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">{{thruHullCondition}}</p>
         </td>
       </tr>
       {{#if thruHullNotes}}
       <tr>
         <td colspan="2" style="padding: 12px 0;">
           <p style="margin: 0; color: #6b7280; font-size: 14px;">Notes: {{thruHullNotes}}</p>
         </td>
       </tr>
       {{/if}}
     </table>
   </div>
   ```

2. **Anode Details Section** (conditional):
   ```html
   {{#if anodeDetailsHtml}}
   <div class="anode-section" style="padding: 0 40px 30px;">
     <h3 style="margin: 0 0 16px; color: #1e3a8a; font-size: 18px;">Anode Inspection & Replacements</h3>
     <table width="100%" cellpadding="8" cellspacing="0" style="border: 1px solid #e5e7eb;">
       <thead>
         <tr style="background-color: #f9fafb;">
           <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Location</th>
           <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Condition</th>
           <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Status</th>
           <th style="padding: 12px; text-align: right; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Cost</th>
         </tr>
       </thead>
       <tbody>
         {{{anodeDetailsHtml}}}
       </tbody>
     </table>
   </div>
   {{/if}}
   ```

3. **Propeller Section** (conditional):
   ```html
   {{#if propeller1}}
   <div class="propeller-section" style="padding: 0 40px 30px;">
     <h3 style="margin: 0 0 16px; color: #1e3a8a; font-size: 18px;">Propeller Inspection</h3>
     <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px;">
       <p style="margin: 0 0 8px; color: #374151; font-size: 14px;"><strong>Propeller 1:</strong> {{propeller1}}</p>
       {{#if propeller2}}
       <p style="margin: 0 0 8px; color: #374151; font-size: 14px;"><strong>Propeller 2:</strong> {{propeller2}}</p>
       {{/if}}
       {{#if propellerNotes}}
       <p style="margin: 8px 0 0; padding-top: 8px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;"><strong>Notes:</strong> {{propellerNotes}}</p>
       {{/if}}
     </div>
   </div>
   {{/if}}
   ```

4. **YouTube Videos Section** (conditional):
   ```html
   {{#if videoThumbnailsHtml}}
   <div class="videos-section" style="padding: 0 40px 30px;">
     <h3 style="margin: 0 0 16px; color: #1e3a8a; font-size: 18px;">Service Videos</h3>
     <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 16px;">
       <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.5;">
         <strong>Note:</strong> Videos may still be uploading. If you don't see them yet, please check your
         <a href="{{portalLink}}" style="color: #3b82f6; text-decoration: none;">customer portal</a> later today.
       </p>
     </div>
     <table width="100%" cellpadding="6" cellspacing="0">
       <tr>
         {{{videoThumbnailsHtml}}}
       </tr>
     </table>
   </div>
   {{/if}}
   ```

5. **Pricing Breakdown Section**:
   ```html
   <div class="pricing-section" style="padding: 0 40px 30px;">
     <h3 style="margin: 0 0 16px; color: #1e3a8a; font-size: 18px;">Service Summary</h3>
     <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px;">
       {{{pricingBreakdownHtml}}}
     </div>
   </div>
   ```

**New Template Variables**:
- `{{paintCondition}}` - Paint condition rating
- `{{growthLevel}}` - Growth level assessment
- `{{thruHullCondition}}` - Thru-hull condition
- `{{thruHullNotes}}` - Additional thru-hull notes (optional)
- `{{propeller1}}` - Propeller 1 condition (optional)
- `{{propeller2}}` - Propeller 2 condition (optional)
- `{{propellerNotes}}` - Propeller inspection notes (optional)
- `{{anodeDetailsHtml}}` - Pre-rendered HTML table rows of anode details (optional)
- `{{videoThumbnailsHtml}}` - Pre-rendered HTML table cells with video thumbnails (optional)
- `{{pricingBreakdownHtml}}` - Pre-rendered HTML of pricing breakdown
- `{{amount}}` - Total amount charged
- `{{currentYear}}` - Current year for footer
- `{{portalLink}}` - Link to customer portal (hardcoded: https://portal.sailorskills.com)

### 2. Billing Charge Flow (`enhanced-charge-flow.js`)

**File**: `/sailorskills-billing/src/admin/inline-scripts/enhanced-charge-flow.js`

**Changes** (around line 785):

**Before**:
```javascript
const emailResponse = await window.supabaseClient.functions.invoke('send-receipt', {
  body: {
    customerEmail: customer.email,
    customerName: customer.name,
    amount: amount,
    // ... basic fields only
  }
});
```

**After**:
```javascript
// Build anode details HTML table rows
const anodeDetailsHtml = chargeBreakdown.anodeDetails?.length > 0
  ? chargeBreakdown.anodeDetails.map(anode => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">${anode.location} - ${anode.position}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">${anode.condition}%</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">${anode.status}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #111827; font-size: 14px; font-weight: 600;">${anode.status === 'replaced' ? '$' + (anode.price + anode.labor).toFixed(2) : 'N/A'}</td>
      </tr>
    `).join('')
  : null;

// Build pricing breakdown HTML
const pricingBreakdownHtml = `
  ${chargeBreakdown.lineItems.map(item =>
    `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span style="color: #374151; font-size: 14px;">${item.name}</span>
      <span style="color: #111827; font-size: 14px; font-weight: 600;">$${item.total.toFixed(2)}</span>
    </div>`
  ).join('')}
  ${chargeBreakdown.discounts?.length > 0
    ? chargeBreakdown.discounts.map(d =>
        `<div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #16a34a;">
          <span style="font-size: 14px;">${d.name}</span>
          <span style="font-size: 14px; font-weight: 600;">-$${d.amount.toFixed(2)}</span>
        </div>`
      ).join('')
    : ''}
  <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 2px solid #e5e7eb; margin-top: 12px;">
    <span style="color: #111827; font-size: 16px; font-weight: 700;">Total</span>
    <span style="color: #111827; font-size: 16px; font-weight: 700;">$${chargeBreakdown.total.toFixed(2)}</span>
  </div>
`;

// Fetch YouTube playlist videos for this boat
let videoThumbnailsHtml = null;
try {
  const { data: playlist } = await window.supabaseClient
    .from('youtube_playlists')
    .select('playlist_id, playlist_url')
    .eq('boat_id', boatId)
    .eq('is_public', true)
    .maybeSingle();

  if (playlist) {
    // Extract playlist ID from URL if needed
    const playlistId = playlist.playlist_id || extractPlaylistId(playlist.playlist_url);

    if (playlistId) {
      // Fetch latest 4 videos from playlist
      const { data: videosData } = await window.supabaseClient.functions.invoke('get-playlist-videos', {
        body: {
          playlistId,
          serviceDate: new Date().toISOString(),
          maxResults: 4
        }
      });

      if (videosData?.videos?.length > 0) {
        videoThumbnailsHtml = videosData.videos.map(video => `
          <td style="width: 50%; padding: 6px;">
            <a href="${video.url}" style="display: block; text-decoration: none;">
              <img src="${video.thumbnail}" alt="${video.title}"
                   style="width: 100%; border-radius: 4px; border: 1px solid #e5e7eb; display: block;" />
              <p style="margin: 8px 0 0; font-size: 12px; color: #6b7280; text-align: center;">${video.title}</p>
            </a>
          </td>
        `).join('');
      }
    }
  }
} catch (error) {
  console.warn('Failed to fetch YouTube videos for email:', error);
  // Continue without videos - not critical
}

// Helper function to extract playlist ID from URL
function extractPlaylistId(url) {
  if (!url) return null;
  const patterns = [
    /[?&]list=([a-zA-Z0-9_-]+)/,
    /playlist\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  if (/^[a-zA-Z0-9_-]+$/.test(url)) return url;
  return null;
}

// Call Operations send-notification with service_completion template
const emailResponse = await window.supabaseClient.functions.invoke('send-notification', {
  body: {
    type: 'service_completion',
    data: {
      // Basic info
      customerEmail: customer.email,
      customerName: customer.name,
      boatName: metadata.boat_name,
      serviceName: metadata.service_name,
      serviceDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      }),

      // Boat conditions
      paintCondition: chargeBreakdown.boatDetails?.paintCondition || 'Not assessed',
      growthLevel: chargeBreakdown.boatDetails?.growthLevel || 'Not assessed',
      thruHullCondition: chargeBreakdown.notes?.thruHull || 'Not assessed',
      thruHullNotes: chargeBreakdown.notes?.thruHullNotes || null,

      // Propeller details
      propeller1: chargeBreakdown.notes?.propeller1 || null,
      propeller2: chargeBreakdown.notes?.propeller2 || null,
      propellerNotes: chargeBreakdown.notes?.propellerNotes || null,

      // Pre-rendered HTML sections
      anodeDetailsHtml: anodeDetailsHtml,
      pricingBreakdownHtml: pricingBreakdownHtml,
      videoThumbnailsHtml: videoThumbnailsHtml,

      // Payment info
      amount: amount.toFixed(2),
      currentYear: new Date().getFullYear(),

      // Portal link (hardcoded)
      portalLink: 'https://portal.sailorskills.com'
    }
  }
});
```

### 3. Operations send-notification Function

**File**: `/sailorskills-operations/supabase/functions/send-notification/index.ts`

**Changes**: ✅ **None required** - Already handles:
- Database template loading
- Variable replacement
- BCC monitoring
- Error handling

## Data Flow

1. **User clicks "Charge Customer" in Billing**
2. **Billing collects all service data** (already happening):
   - Payment info (amount, payment intent)
   - Boat details (type, hull, paint, growth)
   - Anode details (location, position, condition, replacements)
   - Propeller notes
   - Pricing breakdown (line items, discounts, total)
3. **Billing fetches YouTube videos**:
   - Query `youtube_playlists` for boat's playlist
   - Call `get-playlist-videos` edge function
   - Get latest 4 video thumbnails and URLs
4. **Billing transforms data**:
   - Builds `anodeDetailsHtml` table rows
   - Builds `pricingBreakdownHtml`
   - Builds `videoThumbnailsHtml` grid cells
   - Maps all data to camelCase template variables
5. **Billing calls Operations send-notification**:
   - Endpoint: `supabase.functions.invoke('send-notification')`
   - Type: `'service_completion'`
   - Data: All collected + transformed data
6. **Operations loads template from database**:
   - Query: `email_templates` where `template_key = 'service_completion'`
   - Replace all `{{variables}}` with actual data
   - Conditional sections render only if data exists
7. **Operations sends email via Resend**:
   - Includes BCC address from `email_bcc_settings` table
   - Logs to `email_logs` table (if configured)

## Error Handling

### Email Send Failure
- **Current behavior**: Log error, don't block charge completion
- **Keep this approach**: Payment succeeded, email is supplementary
- **Enhancement**: Log failed emails to `email_logs` for audit

### Missing Data
- **Anodes**: If no anode data, hide "Anode Inspection" section entirely
- **Propellers**: If no propeller data, hide "Propeller" section
- **Boat Conditions**: If not assessed, show "Not assessed" instead of empty
- **YouTube Videos**: If no videos or fetch fails, hide "Service Videos" section

### Cross-Service Dependency
- If Operations `send-notification` is down:
  - Log error with all email data
  - Don't retry automatically (avoid duplicates)
  - Manual retry possible via logs

### YouTube API Failure
- If video fetch fails:
  - Log warning
  - Continue with email without videos section
  - Not critical - customer can view in portal

## Edge Cases

1. **Anodes Only service**: May have no boat condition assessment
   - Solution: Show anode details only, hide conditions section

2. **Propeller Removal/Installation**: May or may not include hull cleaning
   - Solution: Show propeller details, conditionally show other sections

3. **Underwater Inspection**: Detailed conditions, may not include anodes
   - Solution: Show conditions prominently, hide anode section if none

4. **Invoice flow** (not charge): Same email sent when invoice created
   - Solution: Use same send-notification call from invoice creation

5. **Multiple propellers**: Twin engines = 2 propellers
   - Solution: Template shows propeller1 and propeller2 conditionally

6. **Videos still uploading**: Email sent before YouTube upload completes
   - Solution: Template includes note to check portal later

7. **No YouTube playlist**: Boat doesn't have playlist configured
   - Solution: Hide videos section entirely (conditional rendering)

## Testing Strategy

### 1. Database Template Testing
- Update `service_completion` template with all new sections
- Send test email with mock data
- Verify all sections render correctly
- Test with/without optional sections (anodes, propellers, videos)

### 2. Billing Integration Testing
Test with real customer (standardhuman@gmail.com) using actual services:

| Service | Test Scenario |
|---------|---------------|
| **Recurring Cleaning & Anodes** | Full service: anodes + hull conditions + propellers + videos |
| **Anodes Only** | Only anode details, no hull cleaning conditions, maybe videos |
| **Propeller Removal/Installation** | Propeller details, may include anodes, videos |
| **Underwater Inspection** | Detailed boat condition documentation, videos |
| **One-time Cleaning w/ discounts** | Verify pricing breakdown shows correctly + videos |

### 3. YouTube Video Testing
- Test boat with playlist configured
- Test boat without playlist
- Test with videos uploading (partial results)
- Test with `get-playlist-videos` failure
- Verify thumbnail images render in email clients

### 4. Invoice Flow Testing
- Test "Send Invoice" button
- Verify same email format sent
- Confirm invoice number included

### 5. Regression Testing
- Payment receipt logs to database ✓
- Service logs created correctly ✓
- Charge summary modal works ✓
- No duplicate emails ✓

### 6. Email Client Testing
- Gmail (web, mobile)
- Apple Mail
- Outlook
- Verify images load
- Verify links work
- Verify responsive design

## Implementation Checklist

- [ ] Update `service_completion` template in database with all new sections
- [ ] Update `enhanced-charge-flow.js` to build HTML sections
- [ ] Update `enhanced-charge-flow.js` to fetch YouTube videos
- [ ] Update `enhanced-charge-flow.js` to call `send-notification`
- [ ] Test with each service type (5 scenarios)
- [ ] Test YouTube video integration (with/without playlist)
- [ ] Test invoice flow
- [ ] Verify regression tests pass
- [ ] Test email rendering in multiple clients
- [ ] Deploy Billing service
- [ ] Monitor first production emails
- [ ] Document for team

## Rollback Plan

If issues arise:
1. Revert `enhanced-charge-flow.js` to call `send-receipt`
2. Original receipt email continues working
3. Fix issues in development
4. Redeploy when ready

## Future Enhancement

- **Video upload notifications**: Separate email sent when videos finish uploading and are ready to view in portal

## Related Documentation

- Settings > Email Templates UI for template management
- BCC Email Configuration: `CLAUDE.md` in Settings service
- Email template database schema: `email_templates` table
- YouTube playlist management: `youtube_playlists` table
- Video fetching: `get-playlist-videos` edge function

---

**Approved by**: Brian
**Ready for Implementation**: Yes
