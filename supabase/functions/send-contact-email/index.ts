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
    const { firstName, lastName, email, company, subject, message } = await req.json()

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

    // Send notification email to Neira team
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Neira Contact <contact@neira.fr>',
        to: ['louispgnc@gmail.com'],
        reply_to: email,
        subject: `[Neira Contact] ${subject}`,
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
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">📬 Nouveau message de contact</h1>
        </div>
        <div class="content">
            <div class="info-box">
                <strong>De :</strong> ${fullName}<br>
                <strong>Email :</strong> <a href="mailto:${email}">${email}</a><br>
                ${companyInfo}
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
            <p>Message envoyé depuis le formulaire de contact Neira.fr</p>
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

    // Send confirmation email to client
    const confirmationResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Neira <contact@neira.fr>',
        to: [email],
        subject: 'Votre message a bien été reçu - Neira',
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
            <h1 style="margin: 0;">✅ Message bien reçu</h1>
        </div>
        <div class="content">
            <p>Bonjour ${firstName},</p>
            
            <p>Nous avons bien reçu votre message concernant : <strong>${subject}</strong></p>
            
            <div class="info-box">
                <strong>⏱️ Temps de réponse :</strong> Notre équipe vous répondra dans les plus brefs délais, généralement sous 24-48 heures.
            </div>
            
            <p>En attendant, n'hésitez pas à découvrir notre solution sur <a href="https://neira.fr/solution" style="color: #3b82f6;">neira.fr/solution</a></p>
            
            <p>Cordialement,<br>
            <strong>L'équipe Neira</strong></p>
        </div>
        <div class="footer">
            <p>© 2025 Neira - Plateforme professionnelle pour avocats et notaires</p>
        </div>
    </div>
</body>
</html>
        `
      })
    })

    if (!confirmationResponse.ok) {
      console.error('Confirmation email failed, but main email sent')
    }

    console.log('Contact email sent successfully from:', email)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Message envoyé avec succès'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-contact-email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
