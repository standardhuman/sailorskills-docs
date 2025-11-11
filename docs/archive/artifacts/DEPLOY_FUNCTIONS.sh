#!/bin/bash
# Deploy all Supabase Edge Functions
# Run from sailorskills-billing directory

echo "🚀 Deploying all Supabase Edge Functions..."

cd "$(dirname "$0")/sailorskills-billing"

# Deploy all functions
functions=(
  "boats"
  "customer-details"
  "boat-anodes"
  "customer-services"
  "service-logs"
  "save-conditions"
  "save-service-log"
  "charge-customer"
  "stripe-customers"
  "send-receipt"
  "finalize-service-inventory"
  "invoices"
)

for func in "${functions[@]}"; do
  echo "📦 Deploying $func..."
  supabase functions deploy "$func"
  if [ $? -eq 0 ]; then
    echo "✅ $func deployed successfully"
  else
    echo "❌ Failed to deploy $func"
  fi
done

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set environment variables:"
echo "   supabase secrets set STRIPE_SECRET_KEY=sk_..."
echo "   supabase secrets set RESEND_API_KEY=re_..."
echo "   supabase secrets set EMAIL_FROM_ADDRESS='Sailor Skills <noreply@sailorskills.com>'"
echo ""
echo "2. Update frontend to use Supabase function URLs"
echo "3. Test in production"
echo "4. Remove /api directory from Vercel"
