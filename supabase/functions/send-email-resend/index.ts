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
    const { to, subject, body, fromEmail } = await req.json()

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Convert plain text body to HTML with line breaks
    const htmlBody = body
      .replace(/\n/g, '<br>')
      .replace(/\r/g, '');

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail || 'Neira Pro Suite <noreply@neira.fr>',
        to: [to],
        subject: subject,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .content { background: #ffffff; padding: 30px; border-radius: 10px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            ${htmlBody}
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

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('Resend error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to send email via Resend' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await emailResponse.json()
    console.log('Email sent successfully via Resend:', result)

    return new Response(
      JSON.stringify({ 
        success: true,
        messageId: result.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-email-resend:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
