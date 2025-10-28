-- Create 14 missing customers from Zoho export
-- Run this against the Sailor Skills database

-- Priority customers (most invoices)
INSERT INTO customers (name, email, phone, created_at, updated_at)
VALUES
  -- 30 invoices
  ('Louis Benainous', 'lben@benainous.com', NULL, NOW(), NOW()),

  -- 21 invoices
  ('Philip Freeman', 'bottomservice@svzeno.com', NULL, NOW(), NOW()),

  -- 14 invoices
  ('Joseph Cunliffe', 'boomtown@mail.com', NULL, NOW(), NOW()),

  -- 12 invoices each
  ('Emily Richards', 'emily.richards@me.com', NULL, NOW(), NOW()),
  ('David Janinis', 'davidjaninis@yahoo.com', NULL, NOW(), NOW()),

  -- 11 invoices each
  ('Jack Barben', 'jackbarben3@gmail.com', NULL, NOW(), NOW()),
  ('Pegasus Voyages Kingston', 'info@pegasusvoyages.org', NULL, NOW(), NOW()),

  -- 6 invoices
  ('Charlie Deist', 'chdeist@gmail.com', NULL, NOW(), NOW()),

  -- 4 invoices
  ('Melissa Bowden', 'patinage.tx@gmail.com', NULL, NOW(), NOW()),

  -- 2 invoices each
  ('Ilya Khanykov', 'khanykov@gmail.com', NULL, NOW(), NOW()),
  ('Navier', 'j.ott@navierboat.com', NULL, NOW(), NOW()),

  -- 1 invoice each
  ('KC Crowell', 'kc@caustic.org', NULL, NOW(), NOW()),
  ('Modern Sailing', 'kelly.abraham@accountingdepartment.com', NULL, NOW(), NOW()),
  ('Trystan Cotten', 'trystancotten@gmail.com', NULL, NOW(), NOW())

ON CONFLICT (email) DO NOTHING
RETURNING id, name, email;

-- Note: Joseph Cunliffe without email and General Customer without email
-- are excluded as they cannot be created without a valid email
