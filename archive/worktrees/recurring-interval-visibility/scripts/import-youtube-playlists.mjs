#!/usr/bin/env node

/**
 * Import YouTube Playlists from Notion Export
 *
 * Extracts playlist URLs from [Boat Name] Service Log .md files
 * and imports them into the youtube_playlists table.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const NOTION_EXPORT_DIR = './notion-export-new';

/**
 * Extract boat name from filename like "Psycho Tiller Service Log 559ee5ec9f8b4032aa4936fc3ebb6ad9.md"
 */
function extractBoatName(filename) {
  const match = filename.match(/^(.+?) Service Log [a-f0-9]+\.md$/);
  return match ? match[1].trim() : null;
}

/**
 * Extract playlist URL from markdown content
 */
function extractPlaylistUrl(content) {
  // Match: 📺 [Video Playlist](https://www.youtube.com/playlist?list=...)
  // or: ## ▶️ [Video Playlist](https://www.youtube.com/playlist?list=...)
  const match = content.match(/\[Video Playlist\]\((https:\/\/www\.youtube\.com\/playlist\?list=[^)]+)\)/);
  return match ? match[1] : null;
}

/**
 * Extract playlist ID from URL
 */
function extractPlaylistId(url) {
  const match = url.match(/[?&]list=([^&]+)/);
  return match ? match[1] : null;
}

/**
 * Find boat ID in database by name
 */
async function findBoatId(boatName) {
  const { data, error } = await supabase
    .from('boats')
    .select('id, boat_name')
    .ilike('boat_name', boatName)
    .single();

  if (error) {
    // Try case-insensitive search with wildcards for variations
    const { data: boats, error: searchError } = await supabase
      .from('boats')
      .select('id, boat_name')
      .ilike('boat_name', `%${boatName}%`)
      .limit(1);

    if (searchError || !boats || boats.length === 0) {
      return null;
    }

    return boats[0];
  }

  return data;
}

/**
 * Main import function
 */
async function importPlaylists() {
  console.log('🎬 YouTube Playlist Import\n');
  console.log(`📂 Reading from: ${NOTION_EXPORT_DIR}\n`);

  const files = readdirSync(NOTION_EXPORT_DIR);
  const serviceLogFiles = files.filter(f => f.includes('Service Log') && f.endsWith('.md'));

  console.log(`📄 Found ${serviceLogFiles.length} Service Log files\n`);

  const results = {
    success: 0,
    skipped: 0,
    noBoatMatch: 0,
    noPlaylist: 0,
    errors: 0,
    duplicates: 0
  };

  const notFound = [];
  const imported = [];

  for (const file of serviceLogFiles) {
    const boatName = extractBoatName(file);

    if (!boatName) {
      console.log(`⚠️  Could not extract boat name from: ${file}`);
      results.skipped++;
      continue;
    }

    const filePath = join(NOTION_EXPORT_DIR, file);
    const content = readFileSync(filePath, 'utf-8');
    const playlistUrl = extractPlaylistUrl(content);

    if (!playlistUrl) {
      // File has no playlist URL (like "New Client Service Log")
      results.noPlaylist++;
      continue;
    }

    const playlistId = extractPlaylistId(playlistUrl);

    if (!playlistId) {
      console.log(`⚠️  Could not extract playlist ID from URL: ${playlistUrl}`);
      results.errors++;
      continue;
    }

    // Find boat in database
    const boat = await findBoatId(boatName);

    if (!boat) {
      console.log(`❌ Boat not found in database: "${boatName}"`);
      notFound.push(boatName);
      results.noBoatMatch++;
      continue;
    }

    // Check if playlist already exists for this boat
    const { data: existing } = await supabase
      .from('youtube_playlists')
      .select('id')
      .eq('boat_id', boat.id)
      .single();

    if (existing) {
      // Update existing playlist
      const { error: updateError } = await supabase
        .from('youtube_playlists')
        .update({
          playlist_id: playlistId,
          playlist_url: playlistUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) {
        console.log(`❌ Error updating playlist for ${boatName}: ${updateError.message}`);
        results.errors++;
      } else {
        console.log(`🔄 Updated: ${boatName} → ${playlistId}`);
        results.duplicates++;
        imported.push({ boat: boatName, playlist: playlistId, action: 'updated' });
      }
      continue;
    }

    // Insert new playlist
    const { error: insertError } = await supabase
      .from('youtube_playlists')
      .insert({
        boat_id: boat.id,
        playlist_id: playlistId,
        playlist_url: playlistUrl,
        is_public: true
      });

    if (insertError) {
      console.log(`❌ Error inserting playlist for ${boatName}: ${insertError.message}`);
      results.errors++;
    } else {
      console.log(`✅ Imported: ${boatName} → ${playlistId}`);
      results.success++;
      imported.push({ boat: boatName, playlist: playlistId, action: 'inserted' });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully imported: ${results.success}`);
  console.log(`🔄 Updated existing: ${results.duplicates}`);
  console.log(`⏭️  No playlist URL: ${results.noPlaylist}`);
  console.log(`❌ Boat not found: ${results.noBoatMatch}`);
  console.log(`⚠️  Errors: ${results.errors}`);
  console.log(`📋 Total processed: ${serviceLogFiles.length}`);

  if (notFound.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ BOATS NOT FOUND IN DATABASE');
    console.log('='.repeat(60));
    notFound.forEach(name => console.log(`  - ${name}`));
    console.log('\nThese boats may have different names in the database.');
  }

  if (imported.length > 0 && imported.length <= 10) {
    console.log('\n' + '='.repeat(60));
    console.log('✅ IMPORTED PLAYLISTS');
    console.log('='.repeat(60));
    imported.forEach(({ boat, playlist, action }) => {
      console.log(`  ${action === 'updated' ? '🔄' : '✅'} ${boat}: ${playlist}`);
    });
  }

  console.log('\n✨ Import complete!\n');
}

// Run import
importPlaylists().catch(console.error);
