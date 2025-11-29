// Gmail OAuth Callback Handler
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
const GOOGLE_REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/gmail-oauth-callback`
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://neira.fr'

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error) {
      return Response.redirect(`${FRONTEND_URL}/email-integration?error=${error}`)
    }

    if (!code || !state) {
      return Response.redirect(`${FRONTEND_URL}/email-integration?error=invalid_request`)
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Vérifier le state
    const { data: stateData } = await supabaseClient
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .single()

    if (!stateData || new Date(stateData.expires_at) < new Date()) {
      return Response.redirect(`${FRONTEND_URL}/email-integration?error=invalid_state`)
    }

    // Échanger le code contre les tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    })

    const tokens = await tokenResponse.json()

    if (!tokens.access_token) {
      return Response.redirect(`${FRONTEND_URL}/email-integration?error=token_failed`)
    }

    // Récupérer l'email de l'utilisateur Gmail
    const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    })
    const profile = await profileResponse.json()

    // Créer ou mettre à jour le compte email
    const { error: upsertError } = await supabaseClient
      .from('email_accounts')
      .upsert({
        user_id: stateData.user_id,
        email: profile.emailAddress,
        provider: 'gmail',
        status: 'connected',
        credentials: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          token_type: tokens.token_type
        }
      }, {
        onConflict: 'user_id,email'
      })

    if (upsertError) {
      console.error('Upsert error:', upsertError)
      return Response.redirect(`${FRONTEND_URL}/email-integration?error=save_failed`)
    }

    // Supprimer le state
    await supabaseClient.from('oauth_states').delete().eq('state', state)

    return Response.redirect(`${FRONTEND_URL}/email-integration?success=true`)

  } catch (error) {
    console.error('OAuth callback error:', error)
    return Response.redirect(`${FRONTEND_URL}/email-integration?error=unknown`)
  }
})
