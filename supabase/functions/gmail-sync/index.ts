// Gmail OAuth2 Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
const GOOGLE_REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/gmail-oauth-callback`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Lire le body de la requête
    const body = await req.json()
    const { action, account_id, to, subject } = body

    if (action === 'get-auth-url') {
      // Générer l'URL d'autorisation OAuth2
      const state = crypto.randomUUID()
      
      // Stocker le state temporairement
      await supabaseClient.from('oauth_states').insert({
        state,
        user_id: user.id,
        expires_at: new Date(Date.now() + 600000).toISOString() // 10 minutes
      })

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
      authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send')
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('access_type', 'offline')
      authUrl.searchParams.set('prompt', 'consent')

      return new Response(
        JSON.stringify({ authUrl: authUrl.toString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'sync') {
      // Synchroniser les emails
      if (!account_id) {
        throw new Error('account_id required')
      }

      // Récupérer le compte email
      const { data: account } = await supabaseClient
        .from('email_accounts')
        .select('*')
        .eq('id', account_id)
        .eq('user_id', user.id)
        .single()

      if (!account || !account.credentials?.access_token) {
        throw new Error('Account not found or not authorized')
      }

      // Refresh token si nécessaire
      let accessToken = account.credentials.access_token
      if (account.credentials.expires_at && new Date(account.credentials.expires_at) < new Date()) {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: account.credentials.refresh_token,
            grant_type: 'refresh_token'
          })
        })
        const refreshData = await refreshResponse.json()
        accessToken = refreshData.access_token

        // Mettre à jour le token
        await supabaseClient
          .from('email_accounts')
          .update({
            credentials: {
              ...account.credentials,
              access_token: accessToken,
              expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
            }
          })
          .eq('id', account_id)
      }

      // Récupérer les messages via Gmail API
      const messagesResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&labelIds=INBOX',
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )
      const messagesData = await messagesResponse.json()

      if (!messagesData.messages) {
        return new Response(
          JSON.stringify({ synced: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let syncedCount = 0

      // Récupérer les détails de chaque message
      for (const message of messagesData.messages.slice(0, 20)) {
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        )
        const messageData = await messageResponse.json()

        // Extraire les informations
        const headers = messageData.payload.headers
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(Sans objet)'
        const from = headers.find((h: any) => h.name === 'From')?.value || ''
        const to = headers.find((h: any) => h.name === 'To')?.value || ''
        const date = headers.find((h: any) => h.name === 'Date')?.value || ''
        
        // Extraire le corps du message
        let body = ''
        if (messageData.payload.body.data) {
          body = atob(messageData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'))
        } else if (messageData.payload.parts) {
          const textPart = messageData.payload.parts.find((p: any) => p.mimeType === 'text/plain')
          if (textPart?.body?.data) {
            body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'))
          }
        }

        const isUnread = messageData.labelIds?.includes('UNREAD') || false
        const isStarred = messageData.labelIds?.includes('STARRED') || false
        const hasAttachments = messageData.payload.parts?.some((p: any) => p.filename) || false

        // Vérifier si le message existe déjà
        const { data: existing } = await supabaseClient
          .from('emails')
          .select('id')
          .eq('account_id', account_id)
          .eq('message_id', message.id)
          .single()

        if (!existing) {
          // Insérer le message
          await supabaseClient.from('emails').insert({
            account_id: account_id,
            message_id: message.id,
            subject,
            from,
            to,
            body: body.substring(0, 10000), // Limiter la taille
            received_at: new Date(date).toISOString(),
            read: !isUnread,
            starred: isStarred,
            has_attachments: hasAttachments,
            folder: 'inbox'
          })
          syncedCount++
        }
      }

      // Mettre à jour last_sync
      await supabaseClient
        .from('email_accounts')
        .update({ last_sync: new Date().toISOString(), status: 'connected' })
        .eq('id', account_id)

      return new Response(
        JSON.stringify({ synced: syncedCount }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'send') {
      // Envoyer un email
      if (!account_id || !to || !subject) {
        throw new Error('account_id, to, and subject are required')
      }

      const { data: account } = await supabaseClient
        .from('email_accounts')
        .select('*')
        .eq('id', account_id)
        .eq('user_id', user.id)
        .single()

      if (!account || !account.credentials?.access_token) {
        throw new Error('Account not found or not authorized')
      }

      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        body
      ].join('\r\n')

      const encodedMessage = btoa(email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

      const sendResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${account.credentials.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ raw: encodedMessage })
        }
      )

      if (!sendResponse.ok) {
        throw new Error('Failed to send email')
      }

      return new Response(
        JSON.stringify({ sent: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid action')

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
