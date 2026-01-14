import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, clientName, token } = await req.json();

    if (!email || !clientName || !token) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send email using Resend
    const invitationUrl = `https://www.neira.fr/client-invitation/${token}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Neira <noreply@neira.fr>",
        to: [email],
        subject: "Invitation à votre espace client Neira",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .header {
                  text-align: center;
                  padding: 20px 0;
                  border-bottom: 2px solid #f0f0f0;
                }
                .logo {
                  font-size: 32px;
                  font-weight: bold;
                  color: #1e40af;
                }
                .content {
                  padding: 30px 0;
                }
                .button {
                  display: inline-block;
                  padding: 12px 30px;
                  background-color: #1e40af;
                  color: white !important;
                  text-decoration: none;
                  border-radius: 8px;
                  margin: 20px 0;
                }
                .footer {
                  padding-top: 20px;
                  border-top: 2px solid #f0f0f0;
                  font-size: 14px;
                  color: #666;
                  text-align: center;
                }
                .info-box {
                  background-color: #f9fafb;
                  border-left: 4px solid #1e40af;
                  padding: 15px;
                  margin: 20px 0;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="logo">Neira</div>
              </div>
              
              <div class="content">
                <h1>Bienvenue sur votre espace client Neira</h1>
                
                <p>Bonjour ${clientName},</p>
                
                <p>Votre professionnel vous invite à accéder à votre espace client sécurisé sur Neira. Cet espace vous permettra de :</p>
                
                <ul>
                  <li>Consulter vos documents en temps réel</li>
                  <li>Suivre l'avancement de vos dossiers</li>
                  <li>Échanger de manière sécurisée</li>
                  <li>Accéder à vos informations 24h/24</li>
                </ul>
                
                <div style="text-align: center;">
                  <a href="${invitationUrl}" class="button">Activer mon espace client</a>
                </div>
                
                <div class="info-box">
                  <p><strong>⏰ Cette invitation est valable pendant 48 heures.</strong></p>
                  <p style="margin: 5px 0;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
                  <p style="word-break: break-all; color: #1e40af;">${invitationUrl}</p>
                </div>
                
                <p>Si vous n'avez pas demandé cet accès, vous pouvez ignorer cet email en toute sécurité.</p>
              </div>
              
              <div class="footer">
                <p>© 2025 Neira - Plateforme de gestion pour professionnels</p>
                <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
              </div>
            </body>
          </html>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, messageId: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
