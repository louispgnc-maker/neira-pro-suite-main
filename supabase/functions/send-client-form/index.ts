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

    // Send email using EmailJS-compatible API
    const emailJsServiceId = Deno.env.get('EMAILJS_SERVICE_ID')
    const emailJsTemplateId = Deno.env.get('EMAILJS_CLIENT_FORM_TEMPLATE_ID') || Deno.env.get('EMAILJS_TEMPLATE_ID')
    const emailJsUserId = Deno.env.get('EMAILJS_USER_ID')

    console.log('EmailJS config check:', {
      hasServiceId: !!emailJsServiceId,
      hasTemplateId: !!emailJsTemplateId,
      hasUserId: !!emailJsUserId
    })

    if (!emailJsServiceId || !emailJsTemplateId || !emailJsUserId) {
      console.error('EmailJS configuration missing', {
        serviceId: !!emailJsServiceId,
        templateId: !!emailJsTemplateId,
        userId: !!emailJsUserId
      })
      // Return success with form URL even if email fails
      return new Response(
        JSON.stringify({ 
          success: true,
          formUrl: formUrl,
          emailSent: false,
          message: 'Formulaire créé mais email non envoyé (configuration manquante)'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: emailJsServiceId,
        template_id: emailJsTemplateId,
        user_id: emailJsUserId,
        template_params: {
          to_email: clientEmail,
          to_name: clientName || 'Client',
          cabinet_name: cabinetName,
          form_url: formUrl,
          expiration_date: new Date(form.expires_at).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        }
      })
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('EmailJS error:', errorText)
      // Return success avec le form URL même si l'email échoue
      return new Response(
        JSON.stringify({ 
          success: true,
          formUrl: formUrl,
          emailSent: false,
          message: 'Formulaire créé mais email non envoyé (erreur EmailJS)'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
