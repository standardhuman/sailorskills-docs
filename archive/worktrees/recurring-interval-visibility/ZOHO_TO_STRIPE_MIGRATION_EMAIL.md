# Zoho to Stripe Payment Migration Email

**Purpose:** Email to send to customers asking them to add their payment method to the new Stripe system

**Target Audience:** 10-50 customers with billing details locked in Zoho Payments

**When to Send:** After payment setup system is deployed and tested

---

## Email Copy (Plain Text Version)

**Subject:** Action Required: Update Your Payment Information

Hi [Customer Name],

I'm excited to share that we're upgrading our payment system to provide you with a better billing experience!

As part of this transition from Zoho Payments to Stripe, we need you to add your payment method to our new system.

**WHY THIS CHANGE?**

- **Faster billing:** Get invoiced within minutes of service completion
- **Better transparency:** Clearer invoices and payment history
- **Enhanced security:** Industry-leading payment security from Stripe
- **Improved experience:** Easier access to billing information in your customer portal

**WHAT YOU NEED TO DO:**

Please visit this link to securely add your payment method:

https://portal.sailorskills.com/portal-payment-setup.html

This will only take a minute, and your payment information will be encrypted and stored securely by Stripe. We never store your card details on our servers.

**YOUR PAYMENT METHOD WILL ONLY BE CHARGED AFTER SERVICE IS COMPLETE**

Just like before, you'll only be billed after we complete service on your boat. The difference is that billing will now happen automatically and instantly rather than days or weeks later.

**NEED HELP?**

If you have any questions or need assistance, please don't hesitate to reply to this email or call me directly.

Thank you for your patience as we make these improvements!

Best regards,
Brian
Sailor Skills
standardhuman@gmail.com

---

## Email Copy (HTML Version)

**Subject:** Action Required: Update Your Payment Information

```html
<p>Hi [Customer Name],</p>

<p>I'm excited to share that we're <strong>upgrading our payment system</strong> to provide you with a better billing experience!</p>

<p>As part of this transition from Zoho Payments to Stripe, we need you to add your payment method to our new system.</p>

<h3>Why This Change?</h3>
<ul>
  <li><strong>Faster billing:</strong> Get invoiced within minutes of service completion</li>
  <li><strong>Better transparency:</strong> Clearer invoices and payment history</li>
  <li><strong>Enhanced security:</strong> Industry-leading payment security from Stripe</li>
  <li><strong>Improved experience:</strong> Easier access to billing information in your customer portal</li>
</ul>

<h3>What You Need To Do</h3>
<p>Please click the button below to securely add your payment method:</p>

<p style="text-align: center;">
  <a href="https://portal.sailorskills.com/portal-payment-setup.html" style="display: inline-block; padding: 15px 30px; background-color: #345475; color: #ffffff; text-decoration: none; font-weight: bold;">
    Add Payment Method
  </a>
</p>

<p><small>Or copy and paste this link: https://portal.sailorskills.com/portal-payment-setup.html</small></p>

<p style="padding: 15px; background-color: #e8f4f8; border-left: 4px solid #345475;">
  <strong>🔒 Secure & Safe:</strong> Your payment information will be encrypted and stored securely by Stripe. We never store your card details on our servers.
</p>

<h3>Your Payment Method Will Only Be Charged AFTER Service Is Complete</h3>
<p>Just like before, you'll only be billed after we complete service on your boat. The difference is that billing will now happen automatically and instantly rather than days or weeks later.</p>

<h3>Need Help?</h3>
<p>If you have any questions or need assistance, please don't hesitate to reply to this email or call me directly.</p>

<p>Thank you for your patience as we make these improvements!</p>

<p>
  Best regards,<br>
  <strong>Brian</strong><br>
  Sailor Skills<br>
  <a href="mailto:standardhuman@gmail.com">standardhuman@gmail.com</a>
</p>
```

---

## Customization Instructions

Before sending, customize each email with:

1. **[Customer Name]** - Replace with actual customer name
2. **Link verification** - Ensure `https://portal.sailorskills.com/portal-payment-setup.html` is working
3. **Test first** - Send to yourself or a test email to verify formatting

---

## Tracking Who Has Completed Setup

After sending emails, you can track which customers have added their payment methods by running this query in Supabase:

```sql
SELECT
  email,
  name,
  stripe_customer_id,
  CASE
    WHEN stripe_customer_id IS NOT NULL THEN 'Payment method added ✅'
    ELSE 'Needs to add payment method ⏳'
  END as status
FROM customers
WHERE email IN (
  -- Add your customer emails here
  'customer1@example.com',
  'customer2@example.com'
)
ORDER BY stripe_customer_id IS NULL DESC, email;
```

---

## Follow-Up Reminder Email (Send After 1 Week)

**Subject:** Reminder: Please Add Your Payment Method

Hi [Customer Name],

This is a quick reminder that we need you to add your payment method to our new billing system.

If you've already completed this, thank you! If not, please take a moment to visit:

https://portal.sailorskills.com/portal-payment-setup.html

This ensures you'll continue to receive uninterrupted service and faster billing after each visit to your boat.

**Having trouble?** Just reply to this email and I'll help you get set up.

Thanks!
Brian

---

## Notes

- The payment setup page requires customers to log in first
- If customers don't have a portal account, they'll need to create one at https://portal.sailorskills.com/signup.html
- Payment methods are stored in Stripe, not on your servers
- Customers can update or change their payment method anytime from Account Settings
- You can view which customers have payment methods by checking the `stripe_customer_id` field in the `customers` table

---

**Created:** 2025-11-08
**Status:** Ready to send after payment setup system is deployed and tested
