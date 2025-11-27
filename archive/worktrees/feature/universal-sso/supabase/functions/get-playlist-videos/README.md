# Get Playlist Videos Edge Function

Fetches the most recent videos from a YouTube playlist using the YouTube Data API v3.

## Purpose

This Edge Function is used by the Customer Portal to display video thumbnails from service video playlists. When a boat has a YouTube playlist configured, this function fetches the latest 2-4 videos to show on the portal dashboard.

## Prerequisites

1. **YouTube Data API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable YouTube Data API v3
   - Create API credentials (API Key)
   - Copy the API key

2. **Supabase Project**
   - Must have a Supabase project set up
   - Supabase CLI installed (`npm install -g supabase`)

## Deployment

### 1. Set YouTube API Key as Secret

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Set the YouTube API key as a secret
supabase secrets set YOUTUBE_API_KEY=<your-youtube-api-key>
```

### 2. Deploy the Function

```bash
# From the repo root
cd supabase/functions

# Deploy the function
supabase functions deploy get-playlist-videos
```

### 3. Verify Deployment

```bash
# Test the function
curl "https://<your-project-ref>.supabase.co/functions/v1/get-playlist-videos?playlistId=PL5nZd73O7zMb3hyuMnkjjqpNnDoCsrA6z&maxResults=4" \
  -H "Authorization: Bearer <your-anon-key>"
```

Expected response:
```json
{
  "videos": [
    {
      "id": "video_id",
      "title": "Video Title",
      "description": "Video description",
      "thumbnail": "https://i.ytimg.com/vi/...",
      "url": "https://www.youtube.com/watch?v=...",
      "publishedAt": "2025-11-05T12:00:00Z"
    }
  ]
}
```

## API Parameters

### Query Parameters

- `playlistId` (required): YouTube playlist ID
- `maxResults` (optional): Number of videos to return (default: 4, max: 50)

### Headers

- `Authorization`: Bearer token with Supabase anon key

## Usage in Portal

The Portal automatically calls this function when displaying videos:

```javascript
import { getPlaylistVideos } from '../api/boat-data.js';

// Fetch last 4 videos from playlist
const { videos, error } = await getPlaylistVideos(playlistId, null, 4);
```

## Troubleshooting

### "YouTube API key not configured"
- Make sure you set the secret: `supabase secrets set YOUTUBE_API_KEY=<key>`
- Redeploy the function after setting secrets

### "Failed to fetch playlist videos from YouTube API"
- Check that your YouTube API key is valid
- Verify the playlist ID is correct
- Ensure YouTube Data API v3 is enabled in Google Cloud Console
- Check API quota limits in Google Cloud Console

### CORS Errors
- The function includes CORS headers for all origins
- If still seeing CORS errors, check browser console for specific error details

## Cost Considerations

YouTube Data API has a quota limit:
- Default: 10,000 units/day
- Each playlist items request: ~1 unit
- Monitor usage in Google Cloud Console

## Related Files

- Portal: `/sailorskills-portal/src/api/boat-data.js` - `getPlaylistVideos()`
- Portal: `/sailorskills-portal/src/views/portal.js` - `loadServiceMedia()`
- Database: `youtube_playlists` table

## Development

To test locally:

```bash
# Start Supabase functions locally
supabase functions serve get-playlist-videos --env-file ./supabase/.env.local

# Test with curl
curl "http://localhost:54321/functions/v1/get-playlist-videos?playlistId=TEST_ID&maxResults=4"
```

Create `.env.local` in `/supabase/` directory:
```
YOUTUBE_API_KEY=your_api_key_here
```
