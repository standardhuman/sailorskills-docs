#!/usr/bin/env node

/**
 * Apply Magic Link Email Template to Supabase Auth
 *
 * This script updates the Supabase Auth magic link email template
 * using the Supabase Management API.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Supabase credentials from environment
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  console.error('\nPlease set these in your environment or .env file');
  process.exit(1);
}

// Extract project reference from Supabase URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('❌ Could not extract project reference from SUPABASE_URL');
  process.exit(1);
}

console.log('🔧 Supabase Magic Link Template Installer');
console.log('==========================================\n');
console.log('Project:', projectRef);
console.log('URL:', SUPABASE_URL);
console.log();

// Read the magic link template from database
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getTemplateFromDatabase() {
  const { data, error } = await supabase
    .from('email_templates')
    .select('html_template_file, subject_line')
    .eq('template_key', 'magic_link')
    .single();

  if (error) {
    console.error('❌ Error fetching template from database:', error.message);
    process.exit(1);
  }

  if (!data) {
    console.error('❌ Magic link template not found in database');
    console.error('   Run the insert script first:');
    console.error('   source ../db-env.sh && psql "$DATABASE_URL" -f scripts/insert-magic-link-template.sql');
    process.exit(1);
  }

  return data;
}

async function applyTemplate() {
  console.log('📥 Fetching template from database...');
  const template = await getTemplateFromDatabase();

  console.log('✓ Template loaded');
  console.log('  Subject:', template.subject_line);
  console.log('  HTML length:', template.html_template_file.length, 'characters');
  console.log();

  // Note: Supabase doesn't have a direct Management API endpoint for updating email templates
  // You need to update them via the Supabase Dashboard
  // This script will output the template for you to copy/paste

  console.log('📋 INSTRUCTIONS:');
  console.log('=================\n');
  console.log('Supabase email templates must be updated via the Dashboard.\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef);
  console.log('2. Navigate to: Authentication > Email Templates');
  console.log('3. Click on: Magic Link');
  console.log('4. Update the following:\n');

  console.log('   Subject:');
  console.log('   --------');
  console.log('   ' + template.subject_line);
  console.log();

  console.log('   Message (Body):');
  console.log('   ---------------');
  console.log('   (Copying to clipboard and saving to file...)\n');

  // Save template to file for easy copying
  const outputPath = join(__dirname, '../src/email/templates/magic-link-for-supabase.html');
  const fs = await import('fs');
  fs.writeFileSync(outputPath, template.html_template_file);

  console.log('✓ Template saved to:', outputPath);
  console.log();

  // Try to copy to clipboard (macOS)
  try {
    const { execSync } = await import('child_process');
    execSync(`echo "${template.html_template_file.replace(/"/g, '\\"')}" | pbcopy`);
    console.log('✓ HTML template copied to clipboard!');
    console.log('  Just paste it into the Supabase dashboard.\n');
  } catch (e) {
    console.log('⚠️  Could not copy to clipboard automatically.');
    console.log('   Open the file above and copy the contents manually.\n');
  }

  console.log('5. Click "Save" in the Supabase dashboard');
  console.log('6. Test by requesting a magic link\n');

  console.log('✅ Setup complete! Template is ready to apply.');
}

applyTemplate().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
