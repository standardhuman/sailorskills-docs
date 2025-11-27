#!/bin/bash

echo "🔍 Testing Service Completion - Maris Workflow"
echo "================================================"
echo ""
echo "Prerequisites:"
echo "  ✅ Dev server running on http://localhost:5173"
echo "  ✅ Logged in to app (authenticated session exists)"
echo "  ✅ Maris has a service order scheduled for today"
echo ""
echo "Starting test..."
echo ""

cd /Users/brian/app-development/sailorskills-repos

VITE_SUPABASE_URL=https://fzygakldvvzxmahkdylq.supabase.co \
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eWdha2xkdnZ6eG1haGtkeWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODM4OTgsImV4cCI6MjA2OTY1OTg5OH0.8BNDF5zmpk2HFdprTjsdOWTDh_XkAPdTnGo7omtiVIk \
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eWdha2xkdnZ6eG1haGtkeWxxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4Mzg5OCwiZXhwIjoyMDY5NjU5ODk4fQ.2yijB4vVm1CLBDT0-ifiA0suOwcoStqA-qMqBHjUlV0 \
npx playwright test tests/e2e/service-completion-maris-workflow.spec.js --reporter=list --headed

echo ""
echo "Test complete! Check output above for results."
