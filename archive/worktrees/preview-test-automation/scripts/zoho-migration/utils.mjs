import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import csv from 'csv-parser';
import { config } from 'dotenv';

config();

// Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// CSV Parser
export async function parseCSV(filePath) {
  const results = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Logger
export function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...data
  };

  if (level === 'ERROR') {
    console.error(JSON.stringify(logEntry, null, 2));
  } else {
    console.log(JSON.stringify(logEntry, null, 2));
  }
}

// Write JSON file
export function writeJSON(filename, data) {
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  log('INFO', `Wrote ${filename}`, { records: Array.isArray(data) ? data.length : 'N/A' });
}

// Write CSV file
export function writeCSV(filename, rows, headers) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
  ].join('\n');

  fs.writeFileSync(filename, csvContent);
  log('INFO', `Wrote ${filename}`, { rows: rows.length });
}

// Batch processor
export async function processBatch(items, batchSize, processor) {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    log('INFO', `Processing batch ${Math.floor(i / batchSize) + 1}`, {
      start: i,
      end: Math.min(i + batchSize, items.length),
      total: items.length
    });

    const batchResults = await processor(batch);
    results.push(...batchResults);
  }

  return results;
}

// Validate environment
export function validateEnv() {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    log('ERROR', 'Missing environment variables', { missing });
    process.exit(1);
  }

  log('INFO', 'Environment validated');
}

// CSV file paths
export const CSV_PATHS = {
  customers: `${process.env.CSV_PATH || '/Users/brian/Downloads'}/Customers.csv`,
  invoices: `${process.env.CSV_PATH || '/Users/brian/Downloads'}/Invoice.csv`,
  payments: `${process.env.CSV_PATH || '/Users/brian/Downloads'}/Payments.csv`
};
