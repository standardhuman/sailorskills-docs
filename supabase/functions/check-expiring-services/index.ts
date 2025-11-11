// Check Expiring Services Edge Function
// Runs daily via cron to:
// 1. Alert admin about boats expiring in 5 days (25 days after one-time service)
// 2. Auto-expire boats 30 days after one-time service completion
// Part of: Automated Boat Status Tracking System (Phase 2)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from "../_shared/cors.ts"

interface BoatToExpire {
  id: string
  boat_name: string
  customer_name: string
  last_service: string
  days_since_service: number
}

interface ExpirationResult {
  alertedBoats: BoatToExpire[]
  expiredBoats: BoatToExpire[]
  errors: string[]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const result: ExpirationResult = {
      alertedBoats: [],
      expiredBoats: [],
      errors: []
    }

    // ========================================================================
    // Step 1: Alert for boats at 25 days (expiring in 5 days)
    // ========================================================================
    const alertDate = new Date()
    alertDate.setDate(alertDate.getDate() - 25)

    const { data: boatsToAlert, error: alertError } = await supabase
      .from('boats')
      .select('id, boat_name, name, customer_name, last_service')
      .eq('plan_status', 'one_time_active')
      .eq('is_active', true)
      .lte('last_service', alertDate.toISOString().split('T')[0])
      .gte('last_service', new Date(alertDate.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Within 24 hours of 25 days

    if (alertError) {
      result.errors.push(`Error querying boats to alert: ${alertError.message}`)
    } else if (boatsToAlert && boatsToAlert.length > 0) {
      // Log alerts to history
      for (const boat of boatsToAlert) {
        const lastServiceDate = new Date(boat.last_service)
        const daysSince = Math.floor((Date.now() - lastServiceDate.getTime()) / (1000 * 60 * 60 * 24))

        result.alertedBoats.push({
          id: boat.id,
          boat_name: boat.boat_name || boat.name || 'Unknown',
          customer_name: boat.customer_name || 'Unknown',
          last_service: boat.last_service,
          days_since_service: daysSince
        })

        // Log to boat_status_history
        await supabase.from('boat_status_history').insert({
          boat_id: boat.id,
          old_status: 'one_time_active',
          new_status: 'one_time_active',
          old_is_active: true,
          new_is_active: true,
          reason: 'Expiration alert - 5 days remaining',
          notes: `Boat will expire in 5 days. Last service: ${boat.last_service} (${daysSince} days ago)`
        })

        console.log(`ALERT: Boat ${boat.boat_name} (${boat.customer_name}) expires in 5 days`)
      }

      // TODO: Send email notification to admin
      // This could be integrated with Resend or another email service
      console.log(`Sent alerts for ${result.alertedBoats.length} boats expiring in 5 days`)
    }

    // ========================================================================
    // Step 2: Auto-expire boats at 30 days
    // ========================================================================
    const expireDate = new Date()
    expireDate.setDate(expireDate.getDate() - 30)

    const { data: boatsToExpire, error: expireError } = await supabase
      .from('boats')
      .select('id, boat_name, name, customer_name, last_service')
      .eq('plan_status', 'one_time_active')
      .eq('is_active', true)
      .lte('last_service', expireDate.toISOString().split('T')[0])

    if (expireError) {
      result.errors.push(`Error querying boats to expire: ${expireError.message}`)
    } else if (boatsToExpire && boatsToExpire.length > 0) {
      for (const boat of boatsToExpire) {
        const lastServiceDate = new Date(boat.last_service)
        const daysSince = Math.floor((Date.now() - lastServiceDate.getTime()) / (1000 * 60 * 60 * 24))

        // Update boat to expired status
        const { error: updateError } = await supabase
          .from('boats')
          .update({
            is_active: false,
            plan_status: 'expired',
            status_changed_at: new Date().toISOString(),
            status_change_reason: 'Auto-expired after 30 days from one-time service completion',
            updated_at: new Date().toISOString()
          })
          .eq('id', boat.id)

        if (updateError) {
          result.errors.push(`Error expiring boat ${boat.id}: ${updateError.message}`)
          continue
        }

        // Deactivate service schedules for this boat
        await supabase
          .from('service_schedules')
          .update({
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('boat_id', boat.id)
          .eq('is_active', true)

        // Log to boat_status_history
        await supabase.from('boat_status_history').insert({
          boat_id: boat.id,
          old_status: 'one_time_active',
          new_status: 'expired',
          old_is_active: true,
          new_is_active: false,
          reason: 'Auto-expired after 30 days',
          notes: `One-time service completed ${daysSince} days ago on ${boat.last_service}. No new orders received.`
        })

        result.expiredBoats.push({
          id: boat.id,
          boat_name: boat.boat_name || boat.name || 'Unknown',
          customer_name: boat.customer_name || 'Unknown',
          last_service: boat.last_service,
          days_since_service: daysSince
        })

        console.log(`EXPIRED: Boat ${boat.boat_name} (${boat.customer_name}) after ${daysSince} days`)
      }

      // TODO: Send email notification to admin about expired boats
      console.log(`Expired ${result.expiredBoats.length} boats`)
    }

    // Return summary
    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        summary: {
          alertedCount: result.alertedBoats.length,
          expiredCount: result.expiredBoats.length,
          errorCount: result.errors.length
        },
        details: result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in check-expiring-services function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
