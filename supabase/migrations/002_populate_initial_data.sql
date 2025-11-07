-- Populate business_pricing_config from Estimator hardcoded values

-- Service Base Rates
INSERT INTO business_pricing_config (config_key, config_value, config_type, display_name, description, unit) VALUES
  ('recurring_cleaning_rate', 4.50, 'service_rate', 'Recurring Cleaning Rate', 'Base rate for recurring cleaning services', 'dollars_per_foot'),
  ('onetime_cleaning_rate', 6.00, 'service_rate', 'One-Time Cleaning Rate', 'Base rate for one-time cleaning services', 'dollars_per_foot'),
  ('underwater_inspection_rate', 4.00, 'service_rate', 'Underwater Inspection Rate', 'Base rate for underwater inspection', 'dollars_per_foot'),
  ('item_recovery_rate', 199.00, 'service_rate', 'Item Recovery Rate', 'Flat rate for item recovery service', 'flat_rate'),
  ('propeller_service_rate', 349.00, 'service_rate', 'Propeller Service Rate', 'Flat rate for propeller removal/installation', 'flat_rate'),
  ('anodes_only_rate', 150.00, 'service_rate', 'Anodes Only Rate', 'Minimum charge for anode-only service', 'flat_rate'),
  ('minimum_service_charge', 150.00, 'minimum', 'Minimum Service Charge', 'Minimum charge for any service', 'flat_rate')
ON CONFLICT (config_key) DO NOTHING;

-- Anode Pricing
INSERT INTO business_pricing_config (config_key, config_value, config_type, display_name, description, unit) VALUES
  ('anode_installation_rate', 15.00, 'anode', 'Anode Installation Labor', 'Labor charge per anode installed', 'dollars_per_unit'),
  ('anode_markup_percentage', 50.00, 'anode', 'Anode Markup Percentage', 'Markup percentage on anode cost', 'percentage'),
  ('anode_minimum_markup', 2.00, 'anode', 'Anode Minimum Markup', 'Minimum profit per anode', 'dollars_per_unit')
ON CONFLICT (config_key) DO NOTHING;

-- Hull Type Surcharges
INSERT INTO business_pricing_config (config_key, config_value, config_type, display_name, description, unit) VALUES
  ('surcharge_powerboat', 25.00, 'surcharge', 'Powerboat Surcharge', 'Additional charge for powerboat vs sailboat', 'percentage'),
  ('surcharge_catamaran', 25.00, 'surcharge', 'Catamaran Surcharge', 'Additional charge for catamaran hull', 'percentage'),
  ('surcharge_trimaran', 50.00, 'surcharge', 'Trimaran Surcharge', 'Additional charge for trimaran hull', 'percentage'),
  ('surcharge_additional_propeller', 10.00, 'surcharge', 'Additional Propeller', 'Charge per propeller beyond first', 'percentage')
ON CONFLICT (config_key) DO NOTHING;

-- Paint Condition Surcharges
INSERT INTO business_pricing_config (config_key, config_value, config_type, display_name, description, unit) VALUES
  ('surcharge_paint_poor', 10.00, 'surcharge', 'Poor Paint Surcharge', 'Surcharge when paint is in poor condition', 'percentage'),
  ('surcharge_paint_missing', 15.00, 'surcharge', 'Missing Paint Surcharge', 'Surcharge when paint is missing', 'percentage')
ON CONFLICT (config_key) DO NOTHING;

-- Growth/Fouling Surcharges
INSERT INTO business_pricing_config (config_key, config_value, config_type, display_name, description, unit) VALUES
  ('surcharge_moderate_heavy_growth', 10.00, 'surcharge', 'Moderate-Heavy Growth', 'Surcharge for moderate to heavy growth', 'percentage'),
  ('surcharge_heavy_growth', 50.00, 'surcharge', 'Heavy Growth', 'Surcharge for heavy growth/fouling', 'percentage'),
  ('surcharge_heavy_severe_growth', 100.00, 'surcharge', 'Heavy-Severe Growth', 'Surcharge for heavy to severe growth', 'percentage'),
  ('surcharge_severe_growth', 200.00, 'surcharge', 'Severe Growth', 'Surcharge for severe growth/fouling', 'percentage'),
  ('surcharge_extreme_growth', 250.00, 'surcharge', 'Extreme Growth', 'Surcharge for extreme growth/fouling', 'percentage')
ON CONFLICT (config_key) DO NOTHING;

-- Populate email_templates from existing templates
INSERT INTO email_templates (template_key, template_name, subject_line, email_body, html_template_file, available_variables, service) VALUES
  (
    'order_confirmation',
    'Order Confirmation',
    'Your Sailor Skills order #{{ORDER_NUMBER}} is confirmed',
    'Hi {{CUSTOMER_NAME}},

Thanks for choosing Sailor Skills! Your order has been confirmed.

Order Details:
- Boat: {{BOAT_NAME}}
- Service: {{SERVICE_TYPE}}
- Scheduled: {{SERVICE_DATE}}
- Total: ${{TOTAL_AMOUNT}}

We''ll send you a reminder 24 hours before your service.

Thank you,
The Sailor Skills Team',
    'shared/src/email/templates/order-confirmation.html',
    '["ORDER_NUMBER", "CUSTOMER_NAME", "BOAT_NAME", "SERVICE_TYPE", "SERVICE_DATE", "TOTAL_AMOUNT"]'::jsonb,
    'shared'
  ),
  (
    'service_completion',
    'Service Completion',
    'Your {{SERVICE_TYPE}} on {{BOAT_NAME}} is complete',
    'Hi {{CUSTOMER_NAME}},

Great news! We''ve completed the {{SERVICE_TYPE}} service on {{BOAT_NAME}}.

Service Summary:
{{SERVICE_NOTES}}

Your invoice is ready to view in your customer portal.

Thank you for choosing Sailor Skills!

The Sailor Skills Team',
    'operations/src/email/templates/service-completion.html',
    '["CUSTOMER_NAME", "BOAT_NAME", "SERVICE_TYPE", "SERVICE_NOTES", "COMPLETION_DATE"]'::jsonb,
    'operations'
  )
ON CONFLICT (template_key) DO NOTHING;
