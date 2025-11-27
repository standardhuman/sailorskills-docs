-- Add bi-directional reference to service_logs
ALTER TABLE service_logs
ADD COLUMN invoice_id uuid REFERENCES invoices(id);

CREATE INDEX idx_service_logs_invoice_id ON service_logs(invoice_id);

-- Add RLS policy for customer payment access
CREATE POLICY "Customers can view own payments"
  ON payments FOR SELECT TO authenticated
  USING (customer_id IN (
    SELECT id FROM customers
    WHERE id = current_setting('app.current_customer_id', true)::uuid
  ));

-- Create view for optimized transaction queries
CREATE OR REPLACE VIEW transaction_details AS
SELECT
  i.id as invoice_id,
  i.invoice_number,
  i.customer_id,
  i.boat_id,
  i.service_id,
  i.amount,
  i.status as invoice_status,
  i.issued_at,
  i.due_at,
  i.paid_at,
  i.payment_method,
  i.customer_details,
  i.boat_details,
  i.service_details,
  p.id as payment_id,
  p.stripe_charge_id,
  p.stripe_payment_intent_id,
  p.status as payment_status,
  sl.id as service_log_id,
  sl.service_date,
  sl.service_type,
  sl.notes
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.id
LEFT JOIN service_logs sl ON sl.invoice_id = i.id;
