#!/usr/bin/env node
/**
 * Quick script to check Notion Plan values for specific boats
 */

import { Client } from '@notionhq/client';
import 'dotenv/config';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const NOTION_CLIENT_DB_ID = process.env.NOTION_CLIENT_DB_ID;

const BOATS_TO_CHECK = ['Blue Heeler', 'Delta Cloud', 'Impulse', 'Shirley Jean'];

function extractPropertyValue(property) {
  if (!property || !property.type) return null;

  switch (property.type) {
    case 'title':
      return property.title?.map(t => t.plain_text).join('') || null;
    case 'select':
      return property.select?.name || null;
    case 'rich_text':
      return property.rich_text?.map(t => t.plain_text).join('') || null;
    default:
      return null;
  }
}

async function checkPlanValues() {
  console.log('🔍 Checking Notion Plan values...\n');

  try {
    // Query all records
    const response = await notion.databases.query({
      database_id: NOTION_CLIENT_DB_ID,
    });

    console.log(`Found ${response.results.length} total records\n`);

    // Filter for boats we care about
    for (const record of response.results) {
      const props = record.properties;
      const boatName = extractPropertyValue(props.Boat);

      if (BOATS_TO_CHECK.includes(boatName)) {
        const planValue = extractPropertyValue(props.Plan);
        console.log(`${boatName.padEnd(20)} → Plan: "${planValue || 'NULL'}"`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPlanValues();
