#!/bin/bash

# Script to copy email templates to clipboard for Supabase

TEMPLATES_DIR="/Users/brian/app-development/sailorskills-repos/sailorskills-settings/src/email/templates"

echo "📧 Sailor Skills Email Template Installer"
echo "=========================================="
echo ""
echo "This script will copy each email template to your clipboard."
echo "Paste them into the Supabase Auth Email Templates page."
echo ""
echo "Dashboard: https://supabase.com/dashboard/project/fzygakldvvzxmahkdylq/auth/templates"
echo ""

# Template 1: Invite User
echo "1️⃣  INVITE USER"
echo "   Template: Invite user"
echo "   Subject: You've Been Invited to Sailor Skills"
echo ""
read -p "Press Enter to copy Invite User template to clipboard..."
cat "$TEMPLATES_DIR/invite-user.html" | pbcopy
echo "✓ Copied! Paste into Supabase > Auth > Templates > Invite user"
echo ""

# Template 2: Email Change
echo "2️⃣  EMAIL CHANGE CONFIRMATION"
echo "   Template: Change Email Address"
echo "   Subject: Confirm Your Email Change"
echo ""
read -p "Press Enter to copy Email Change template to clipboard..."
cat "$TEMPLATES_DIR/email-change.html" | pbcopy
echo "✓ Copied! Paste into Supabase > Auth > Templates > Change Email Address"
echo ""

# Template 3: Password Reset
echo "3️⃣  PASSWORD RESET"
echo "   Template: Reset Password"
echo "   Subject: Reset Your Sailor Skills Password"
echo ""
read -p "Press Enter to copy Password Reset template to clipboard..."
cat "$TEMPLATES_DIR/password-reset.html" | pbcopy
echo "✓ Copied! Paste into Supabase > Auth > Templates > Reset Password"
echo ""

# Template 4: Reauthentication
echo "4️⃣  REAUTHENTICATION"
echo "   Template: Reauthenticate (2FA)"
echo "   Subject: Verification Code - Sailor Skills"
echo ""
read -p "Press Enter to copy Reauthentication template to clipboard..."
cat "$TEMPLATES_DIR/reauthentication.html" | pbcopy
echo "✓ Copied! Paste into Supabase > Auth > Templates > Reauthenticate"
echo ""

echo "✅ All templates ready!"
echo ""
echo "Summary of templates created:"
echo "  • Invite User (📧)"
echo "  • Email Change (✉️)"
echo "  • Password Reset (🔑)"
echo "  • Reauthentication (🛡️)"
echo ""
echo "Note: You already have Magic Link (🔐) and Signup Confirmation (⚓) installed."
