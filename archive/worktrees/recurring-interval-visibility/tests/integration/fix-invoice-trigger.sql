-- Fix notify_invoice_created trigger function to use current schema
-- This migration updates field references to match the current invoices table schema
--
-- Changes:
-- - payment_status → status
-- - total_amount → amount
-- - service_date, invoice_date, due_date → issued_at, due_at
-- - Remove service_date reference (not in current schema)

CREATE OR REPLACE FUNCTION public.notify_invoice_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  customer_data RECORD;
  boat_data RECORD;
  invoice_status TEXT;
BEGIN
  -- Get boat information
  SELECT name INTO boat_data
  FROM boats
  WHERE id = NEW.boat_id;

  -- Get customer information and check preferences
  SELECT
    ca.id,
    ca.email,
    ca.name,
    ca.notification_preferences
  INTO customer_data
  FROM customer_boat_access cba
  JOIN customer_accounts ca ON ca.id = cba.customer_account_id
  WHERE cba.boat_id = NEW.boat_id
  LIMIT 1;

  -- Check if customer wants invoice notifications
  IF customer_data.notification_preferences->>'new_invoices' = 'false' THEN
    RETURN NEW;
  END IF;

  -- Determine invoice status (updated field name)
  invoice_status := CASE
    WHEN NEW.status = 'paid' THEN 'Paid'
    WHEN NEW.status = 'overdue' THEN 'Overdue'
    ELSE 'Unpaid'
  END;

  -- Send notification (updated field names)
  PERFORM call_send_notification_edge_function(
    'new_invoice',
    jsonb_build_object(
      'customerEmail', customer_data.email,
      'customerName', customer_data.name,
      'boatName', boat_data.name,
      'invoiceNumber', NEW.invoice_number,
      'invoiceTotal', '$' || NEW.amount::TEXT,
      'invoiceStatus', invoice_status,
      'invoiceDate', TO_CHAR(NEW.issued_at, 'Month DD, YYYY'),
      'dueDate', TO_CHAR(NEW.due_at, 'Month DD, YYYY'),
      'paymentLink', 'https://sailorskills-portal.vercel.app/portal-invoices.html'
    )
  );

  -- Log notification (updated field name)
  INSERT INTO notification_log (
    customer_account_id,
    notification_type,
    channel,
    related_id,
    status,
    sent_at,
    metadata
  ) VALUES (
    customer_data.id,
    'new_invoice',
    'email',
    NEW.id::TEXT,
    'sent',
    NOW(),
    jsonb_build_object(
      'invoice_number', NEW.invoice_number,
      'total_amount', NEW.amount
    )
  );

  RETURN NEW;
END;
$function$;

-- Verify the trigger is still attached
-- (The trigger should already exist: on_invoice_insert BEFORE INSERT ON invoices)
