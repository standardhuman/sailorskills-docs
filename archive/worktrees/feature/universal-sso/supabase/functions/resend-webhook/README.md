# Resend Webhook Handler

Edge function to receive and process Resend email engagement events.

## Deployment

```bash
# Deploy to Supabase
supabase functions deploy resend-webhook

# Or with project reference
supabase functions deploy resend-webhook --project-ref fzygakldvvzxmahkdylq
```

## Resend Configuration

1. Go to Resend Dashboard → Webhooks
2. Add webhook URL: `https://fzygakldvvzxmahkdylq.supabase.co/functions/v1/resend-webhook`
3. Subscribe to events:
   - `email.opened`
   - `email.clicked`
   - `email.bounced`
   - `email.complained`
   - `email.delivered`
4. Save webhook

## Supported Events

### email.opened
Updates `opened_at` timestamp (first open only)

### email.clicked
Updates `first_click_at` (first click) and increments `click_count`

### email.bounced
Updates `bounced_at`, sets `status` to 'failed', records error message

### email.complained
Updates `complained_at` timestamp

### email.delivered
Updates `status` to 'sent' if currently 'pending'

## Testing

```bash
# Test locally (requires email_logs record with resend_id)
curl -X POST http://localhost:54321/functions/v1/resend-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email.opened",
    "data": {
      "email_id": "re_test123",
      "opened_at": "2025-11-06T15:30:00Z"
    }
  }'
```

## Environment Variables

Required in Supabase function environment:
- `SUPABASE_URL` (auto-set by Supabase)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-set by Supabase)

## Database Requirements

The `email_logs` table must have:
- `resend_id` column (used to match webhook events)
- `opened_at`, `first_click_at`, `click_count` columns
- `bounced_at`, `complained_at` columns
- `status` and `error_message` columns

These columns are created by migration `001_create_settings_tables.sql`.
