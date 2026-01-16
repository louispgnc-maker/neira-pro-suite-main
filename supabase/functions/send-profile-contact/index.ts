import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      senderName, 
      senderEmail, 
      senderCompany, 
      subject, 
      message,
      recipientEmail,
      recipientName,
      recipientType // 'avocat' ou 'notaire'
    } = await req.json()

    if (!senderName || !senderEmail || !subject || !message || !recipientEmail || !recipientName) {
      return new Response(
        JSON.stringify({ error: 'Champs obligatoires manquants' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      console.error('Resend API key missing')
      return new Response(
        JSON.stringify({ error: 'Configuration email manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const companyInfo = senderCompany ? `<strong>Entreprise :</strong> ${senderCompany}<br>` : ''
    const professionLabel = recipientType === 'avocat' ? 'Avocat' : 'Notaire'

    // Send email to the professional
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Neira Contact <contact@neira.fr>',
        to: [recipientEmail],
        reply_to: senderEmail,
        subject: `[Contact profil] ${subject}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
        .info-box { background: white; padding: 15px; border-left: 4px solid #3b82f6; margin: 15px 0; }
        .message-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        .badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">📨 Nouveau contact depuis votre profil</h1>
        </div>
        <div class="content">
            <p>Bonjour ${recipientName},</p>
            
            <p>Vous avez reçu un nouveau message via votre profil ${professionLabel} sur Neira :</p>
            
            <div class="info-box">
                <strong>De :</strong> ${senderName}<br>
                <strong>Email :</strong> <a href="mailto:${senderEmail}">${senderEmail}</a><br>
                ${companyInfo}
                <strong>Sujet :</strong> ${subject}
            </div>
            
            <div class="message-box">
                <h3 style="margin-top: 0; color: #1f2937;">Message :</h3>
                <p style="white-space: pre-wrap;">${message}</p>
            </div>
            
            <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
                💡 <strong>Pour répondre :</strong> Cliquez simplement sur "Répondre" ou écrivez directement à <a href="mailto:${senderEmail}">${senderEmail}</a>
            </p>
        </div>
        <div class="footer">
            <p>Message envoyé depuis votre profil public sur Neira.fr</p>
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
      throw new Error('Erreur lors de l\'envoi de l\'email')
    }

    // Send confirmation email to sender
    const confirmationResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Neira <contact@neira.fr>',
        to: [senderEmail],
        subject: `Votre message à ${recipientName} a bien été envoyé`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
        .info-box { background: white; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">✅ Message envoyé avec succès</h1>
        </div>
        <div class="content">
            <p>Bonjour ${senderName},</p>
            
            <p>Votre message concernant "<strong>${subject}</strong>" a bien été transmis à ${recipientName}.</p>
            
            <div class="info-box">
                <strong>📧 Vous recevrez une réponse directement par email</strong><br>
                ${recipientName} vous répondra à l'adresse : ${senderEmail}
            </div>
            
            <p>Merci d'avoir utilisé Neira !</p>
            
            <p>Cordialement,<br>
            <strong>L'équipe Neira</strong></p>
        </div>
        <div class="footer">
            <p>© 2025 Neira - Plateforme de mise en relation professionnelle</p>
        </div>
    </div>
</body>
</html>
        `
      })
    })

    if (!confirmationResponse.ok) {
      console.warn('Confirmation email failed (non-critical)')
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending profile contact email:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
