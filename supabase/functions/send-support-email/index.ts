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
    const { firstName, lastName, email, company, subject, message, userId } = await req.json()

    if (!firstName || !lastName || !email || !subject || !message) {
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

    const fullName = `${firstName} ${lastName}`
    const companyInfo = company ? `<strong>Cabinet/Entreprise :</strong> ${company}<br>` : ''
    const userIdInfo = userId ? `<strong>ID Utilisateur :</strong> ${userId}<br>` : ''

    // Send notification email to Neira support
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Neira Support <contact@neira.fr>',
        to: ['louispgnc@gmail.com'],
        reply_to: email,
        subject: `[Support Neira] ${subject}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
        .info-box { background: white; padding: 15px; border-left: 4px solid #ef4444; margin: 15px 0; }
        .message-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        .badge { display: inline-block; background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">🆘 Demande de support</h1>
        </div>
        <div class="content">
            <p><span class="badge">SUPPORT UTILISATEUR</span></p>
            
            <div class="info-box">
                <strong>De :</strong> ${fullName}<br>
                <strong>Email :</strong> <a href="mailto:${email}">${email}</a><br>
                ${companyInfo}
                ${userIdInfo}
                <strong>Sujet :</strong> ${subject}
            </div>
            
            <div class="message-box">
                <h3 style="margin-top: 0; color: #1f2937;">Message :</h3>
                <p style="white-space: pre-wrap;">${message}</p>
            </div>
            
            <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
                💡 <strong>Répondre :</strong> Cliquez simplement sur "Répondre" pour répondre directement à ${email}
            </p>
        </div>
        <div class="footer">
            <p>Message envoyé depuis l'espace professionnel Neira</p>
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

    // Send confirmation email to user
    const confirmationResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Neira Support <contact@neira.fr>',
        to: [email],
        subject: 'Votre demande de support a bien été reçue - Neira',
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
        .info-box { background: white; padding: 15px; border-left: 4px solid #3b82f6; margin: 15px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">✅ Demande bien reçue</h1>
        </div>
        <div class="content">
            <p>Bonjour ${firstName},</p>
            
            <p>Nous avons bien reçu votre demande de support concernant : <strong>${subject}</strong></p>
            
            <div class="info-box">
                <strong>⏱️ Temps de réponse :</strong> Notre équipe support vous répondra dans les plus brefs délais, généralement sous 24 heures maximum.
            </div>
            
            <p>En attendant, consultez notre <a href="https://neira.fr/aide" style="color: #3b82f6;">centre d'aide</a> qui pourrait répondre à vos questions.</p>
            
            <p>Cordialement,<br>
            <strong>L'équipe Support Neira</strong></p>
        </div>
        <div class="footer">
            <p>© 2025 Neira - Support technique</p>
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
    console.error('Error sending support email:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
