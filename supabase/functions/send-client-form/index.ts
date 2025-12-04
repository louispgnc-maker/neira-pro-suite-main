import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { clientEmail, clientName, cabinetId, userId } = await req.json()

    if (!clientEmail || !cabinetId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Create the form
    const { data: form, error: formError } = await supabase
      .from('client_forms')
      .insert({
        cabinet_id: cabinetId,
        created_by: userId,
        client_email: clientEmail,
        client_name: clientName || null,
        status: 'pending',
        form_type: 'client_intake',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select()
      .single()

    if (formError) {
      console.error('Error creating form:', formError)
      throw formError
    }

    // Get cabinet name
    const { data: cabinet } = await supabase
      .from('cabinets')
      .select('nom')
      .eq('id', cabinetId)
      .single()

    const cabinetName = cabinet?.nom || 'notre cabinet'

    // Construct the form URL
    const formUrl = `${Deno.env.get('SITE_URL') || 'https://neira.fr'}/form/${form.token}`

    // Format expiration date
    const expirationDate = new Date(form.expires_at).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    console.log('Resend config check:', {
      hasApiKey: !!resendApiKey,
      formUrl: formUrl,
      clientEmail: clientEmail
    })

    if (!resendApiKey) {
      console.error('Resend API key missing')
      console.error('Please configure RESEND_API_KEY in Supabase Edge Functions secrets')
      // Return success with form URL even if email fails
      return new Response(
        JSON.stringify({ 
          success: true,
          formUrl: formUrl,
          emailSent: false,
          message: 'Formulaire créé mais email non envoyé (clé API Resend manquante)'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Neira Pro Suite <noreply@neira.fr>',
        to: [clientEmail],
        subject: `${cabinetName} - Formulaire à compléter`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #f97316 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
        .info-box { background: white; padding: 15px; border-left: 4px solid #f97316; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Formulaire d'informations client</h1>
        </div>
        <div class="content">
            <p>Bonjour ${clientName || 'Client'},</p>
            
            <p><strong>${cabinetName}</strong> vous invite à compléter vos informations personnelles via notre formulaire sécurisé.</p>
            
            <div class="info-box">
                <strong>📋 Pourquoi ce formulaire ?</strong><br>
                Ce formulaire nous permettra de créer votre dossier client et de vous accompagner au mieux dans vos démarches.
            </div>
            
            <p style="text-align: center;">
                <a href="${formUrl}" class="button">Compléter le formulaire</a>
            </p>
            
            <div class="info-box">
                <strong>⏱️ Temps estimé :</strong> 5-10 minutes<br>
                <strong>🔒 Sécurité :</strong> Toutes vos données sont chiffrées et confidentielles<br>
                <strong>📅 Validité :</strong> Ce lien expire le ${expirationDate}
            </div>
            
            <p><strong>Informations demandées :</strong></p>
            <ul>
                <li>État civil (nom, prénom, date de naissance)</li>
                <li>Coordonnées (adresse, téléphone, email)</li>
                <li>Situation familiale et professionnelle</li>
                <li>Informations complémentaires si nécessaire</li>
            </ul>
            
            <p>Si vous rencontrez un problème avec ce formulaire, vous pouvez contacter directement le cabinet.</p>
            
            <p>Cordialement,<br>
            <strong>${cabinetName}</strong></p>
        </div>
        <div class="footer">
            <p>© 2025 Neira - Plateforme professionnelle pour avocats et notaires</p>
            <p>Si vous n'êtes pas concerné par ce message, vous pouvez l'ignorer.</p>
        </div>
    </div>
</body>
</html>
        `
      })
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('Resend error:', errorText)
      // Return success avec le form URL même si l'email échoue
      return new Response(
        JSON.stringify({ 
          success: true,
          formUrl: formUrl,
          emailSent: false,
          message: 'Formulaire créé mais email non envoyé (erreur Resend)'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Email sent successfully via Resend to:', clientEmail)

    return new Response(
      JSON.stringify({ 
        success: true, 
        form: form,
        formUrl: formUrl,
        emailSent: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-client-form:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
