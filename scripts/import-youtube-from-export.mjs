#!/usr/bin/env node
/**
 * Import YouTube Playlists from Notion Export
 *
 * Reads the Notion export markdown files and extracts YouTube playlist URLs,
 * then inserts them into the youtube_playlists table.
 *
 * Usage:
 *   node scripts/import-youtube-from-export.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const dryRun = process.argv.includes('--dry-run');

console.log(dryRun ? '🧪 Dry-run mode\n' : '🚀 Import mode\n');

// Path to Notion export
const exportDir = join(process.cwd(), 'notion-export-new');

try {
  // Get all markdown files
  console.log('📁 Reading Notion export files...');
  const files = readdirSync(exportDir).filter(f => f.endsWith('.md'));
  console.log(`   Found ${files.length} markdown files\n`);

  // Extract YouTube URLs from files
  const playlistData = [];

  for (const file of files) {
    const content = readFileSync(join(exportDir, file), 'utf-8');

    // Extract boat name from filename (e.g., "Another High Time Service Log abc123.md")
    const boatNameMatch = file.match(/^(.+?) Service Log/);
    if (!boatNameMatch) continue;

    const boatName = boatNameMatch[1].trim();

    // Extract YouTube playlist URL (handles multiple formats)
    // Patterns: [📺 Video Playlist], [▶️ Video Playlist], [Videos], V[ideos], etc.
    const playlistMatch = content.match(/\[?(?:📺|▶️)?\s*(?:Video Playlist|Videos?)\]?\(?(https:\/\/(?:www\.)?youtube\.com\/(?:playlist\?list=|watch\?[^&]*list=)([^\)&\s]+))\)?/);
    if (!playlistMatch) continue;

    const playlistUrl = playlistMatch[1];
    const playlistId = playlistMatch[2]; // Extract playlist ID from URL

    playlistData.push({
      boatName,
      playlistUrl,
      playlistId,
      fileName: file
    });
  }

  console.log(`🎥 Found ${playlistData.length} playlists in export files\n`);

  // Fetch all boats from database
  console.log('📥 Fetching boats from database...');
  const { data: boats, error: boatsError } = await supabase
    .from('boats')
    .select('id, name');

  if (boatsError) {
    console.error('❌ Error fetching boats:', boatsError.message);
    process.exit(1);
  }
  console.log(`   Found ${boats.length} boats in database\n`);

  // Build lookup map (case-insensitive)
  const boatMap = new Map();
  for (const boat of boats) {
    boatMap.set(boat.name.toLowerCase().trim(), boat.id);
  }

  // Check existing playlists
  const { data: existingPlaylists, error: playlistError } = await supabase
    .from('youtube_playlists')
    .select('boat_id');

  if (playlistError) {
    console.error('❌ Error fetching existing playlists:', playlistError.message);
    process.exit(1);
  }

  const existingBoatIds = new Set(existingPlaylists.map(p => p.boat_id));
  console.log(`   Found ${existingBoatIds.size} boats with existing playlists\n`);

  // Match and import
  const stats = {
    success: 0,
    failed: 0,
    notFound: 0,
    existing: 0
  };

  for (const { boatName, playlistUrl, playlistId, fileName } of playlistData) {
    const boatId = boatMap.get(boatName.toLowerCase().trim());

    if (!boatId) {
      console.log(`⚠️  Boat not found: ${boatName} (${fileName})`);
      stats.notFound++;
      continue;
    }

    if (existingBoatIds.has(boatId)) {
      console.log(`⏭️  Playlist exists: ${boatName}`);
      stats.existing++;
      continue;
    }

    if (dryRun) {
      console.log(`📝 Would import: ${boatName} → ${playlistUrl}`);
      stats.success++;
    } else {
      const { error } = await supabase
        .from('youtube_playlists')
        .insert({
          boat_id: boatId,
          playlist_id: playlistId,
          playlist_url: playlistUrl,
          is_public: true
        });

      if (error) {
        console.error(`❌ Failed to import ${boatName}:`, error.message);
        stats.failed++;
      } else {
        console.log(`✅ Imported: ${boatName}`);
        stats.success++;
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Import Summary:');
  console.log('='.repeat(60));
  console.log(`Success:     ${stats.success} ✅`);
  console.log(`Existing:    ${stats.existing} ⏭️`);
  console.log(`Not Found:   ${stats.notFound} ⚠️`);
  console.log(`Failed:      ${stats.failed} ❌`);
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('\n✅ Dry-run complete. Run without --dry-run to import.');
  } else if (stats.failed === 0) {
    console.log('\n🎉 Import completed successfully!');
  } else {
    console.log(`\n⚠️  Import completed with ${stats.failed} errors.`);
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error);
  process.exit(1);
}
