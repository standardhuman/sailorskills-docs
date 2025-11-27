#!/usr/bin/env python3
"""
Find Missing Playlists from YouTube

Uses BOATY's YouTube API (from sailorskills-video) to search for playlists
matching boat names, then inserts them into the Supabase database.

Usage:
    python scripts/find-missing-playlists-from-youtube.py [--dry-run]
"""

import sys
import os
import json

# Add sailorskills-video to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'sailorskills-video'))

from utils.youtube_api import YouTubeAPI

# Import Supabase client
from supabase import create_client

# Load environment variables
SUPABASE_URL = os.environ.get('VITE_SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print('❌ Missing Supabase credentials')
    print('   Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY')
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
dry_run = '--dry-run' in sys.argv

print('🧪 Dry-run mode\n' if dry_run else '🚀 Import mode\n')

# Initialize BOATY YouTube API
print('📺 Initializing YouTube API (using BOATY)...')
os.chdir(os.path.join(os.path.dirname(__file__), '..', 'sailorskills-video'))
youtube = YouTubeAPI()

try:
    youtube.get_authenticated_service()
    print('✅ YouTube API authenticated\n')
except RuntimeError as e:
    print(f'❌ {e}')
    print('   Please authenticate BOATY first by running app.py and uploading a video')
    sys.exit(1)

# Get all playlists from YouTube
print('📥 Fetching all playlists from YouTube...')
all_playlists = youtube.get_playlists()
print(f'   Found {len(all_playlists)} playlists\n')

# Get boats without playlists from database
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
print('📥 Fetching boats without playlists from database...')
result = supabase.from_('boats') \
    .select('id, name') \
    .eq('is_active', True) \
    .execute()

boats = result.data

# Filter to only boats without playlists
result = supabase.from_('youtube_playlists') \
    .select('boat_id') \
    .execute()

existing_boat_ids = set(p['boat_id'] for p in result.data)
boats_without_playlists = [b for b in boats if b['id'] not in existing_boat_ids]

print(f'   Found {len(boats_without_playlists)} boats without playlists\n')

# Try to match each boat
stats = {
    'success': 0,
    'failed': 0,
    'not_found': 0
}

for boat in boats_without_playlists:
    boat_name = boat['name']
    boat_id = boat['id']

    # Skip test boats
    if 'test' in boat_name.lower() or 'safe to delete' in boat_name.lower():
        print(f'⏭️  Skipping test boat: {boat_name}')
        continue

    # Use BOATY's fuzzy matching
    matched_playlist = youtube.find_matching_playlist(boat_name)

    if not matched_playlist:
        print(f'⚠️  No playlist found: {boat_name}')
        stats['not_found'] += 1
        continue

    playlist_url = f"https://www.youtube.com/playlist?list={matched_playlist['id']}"

    if dry_run:
        print(f'📝 Would import: {boat_name} → {matched_playlist["title"]} ({matched_playlist["videoCount"]} videos)')
        print(f'   URL: {playlist_url}')
        stats['success'] += 1
    else:
        try:
            supabase.from_('youtube_playlists').insert({
                'boat_id': boat_id,
                'playlist_id': matched_playlist['id'],
                'playlist_url': playlist_url,
                'is_public': True
            }).execute()

            print(f'✅ Imported: {boat_name} → {matched_playlist["title"]} ({matched_playlist["videoCount"]} videos)')
            stats['success'] += 1
        except Exception as e:
            print(f'❌ Failed to import {boat_name}: {str(e)}')
            stats['failed'] += 1

# Summary
print('\n' + '=' * 60)
print('📊 Import Summary:')
print('=' * 60)
print(f'Success:     {stats["success"]} ✅')
print(f'Not Found:   {stats["not_found"]} ⚠️')
print(f'Failed:      {stats["failed"]} ❌')
print('=' * 60)

if dry_run:
    print('\n✅ Dry-run complete. Run without --dry-run to import.')
elif stats['failed'] == 0:
    print('\n🎉 Import completed successfully!')
else:
    print(f'\n⚠️  Import completed with {stats["failed"]} errors.')
