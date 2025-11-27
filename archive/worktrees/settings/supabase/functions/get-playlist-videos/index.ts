// YouTube Playlist Videos Edge Function
// Fetches videos from a YouTube playlist using YouTube Data API v3

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check if API key is configured
    if (!YOUTUBE_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'YouTube API key not configured. Please add YOUTUBE_API_KEY to Supabase Edge Function secrets.'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Get playlist ID from query parameters
    const url = new URL(req.url)
    const playlistId = url.searchParams.get('playlistId')
    const maxResults = parseInt(url.searchParams.get('maxResults') || '4')

    if (!playlistId) {
      return new Response(
        JSON.stringify({ error: 'playlistId parameter is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Fetch playlist items from YouTube API
    const youtubeUrl = `https://www.googleapis.com/youtube/v3/playlistItems?` +
      `part=snippet&playlistId=${playlistId}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}&order=date`

    const response = await fetch(youtubeUrl)

    if (!response.ok) {
      const errorData = await response.json()
      console.error('YouTube API error:', errorData)
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch playlist videos from YouTube API',
          details: errorData
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const data = await response.json()

    // Transform YouTube API response to simpler format
    const videos = data.items.map((item: any) => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.medium.url,
      url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
      publishedAt: item.snippet.publishedAt,
    }))

    return new Response(
      JSON.stringify({ videos }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in get-playlist-videos function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
