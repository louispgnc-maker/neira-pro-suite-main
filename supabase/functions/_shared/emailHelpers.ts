// Helper pour envoyer l'email de confirmation après paiement
import { Resend } from 'https://esm.sh/resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface PaymentConfirmationData {
  customerEmail: string;
  customerName: string;
  subscriptionTier: string;
  quantity: number;
  amount: number;
  currency: string;
  invoiceUrl?: string;
}

const TIER_NAMES: Record<string, string> = {
  'essentiel': 'Essentiel',
  'professionnel': 'Professionnel',
  'cabinet-plus': 'Cabinet+'
};

export async function sendPaymentConfirmationEmail(data: PaymentConfirmationData) {
  const tierName = TIER_NAMES[data.subscriptionTier] || data.subscriptionTier;
  const pricePerMember = data.amount / data.quantity / 100;
  
  try {
    await resend.emails.send({
      from: 'Neira <contact@neira.fr>',
      to: data.customerEmail,
      subject: '✅ Votre abonnement Neira est confirmé !',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .success-icon {
              font-size: 48px;
              margin-bottom: 10px;
            }
            .recap-box {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #10b981;
            }
            .recap-item {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .recap-item:last-child {
              border-bottom: none;
              font-weight: bold;
              font-size: 18px;
              padding-top: 15px;
            }
            .button {
              display: inline-block;
              background: #3b82f6;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="success-icon">✅</div>
              <h1 style="margin: 0;">Paiement confirmé !</h1>
              <p style="margin: 10px 0 0 0;">Bienvenue dans la communauté Neira</p>
            </div>
            
            <div class="content">
              <p>Bonjour ${data.customerName},</p>
              
              <p>Nous sommes ravis de vous compter parmi nous ! Votre paiement a été traité avec succès et votre abonnement est maintenant actif.</p>
              
              <div class="recap-box">
                <h3 style="margin-top: 0; color: #10b981;">📋 Récapitulatif de votre commande</h3>
                
                <div class="recap-item">
                  <span>Formule :</span>
                  <strong>Neira ${tierName}</strong>
                </div>
                
                <div class="recap-item">
                  <span>Nombre d'utilisateurs :</span>
                  <strong>${data.quantity} ${data.quantity > 1 ? 'membres' : 'membre'}</strong>
                </div>
                
                <div class="recap-item">
                  <span>Prix par membre :</span>
                  <strong>${pricePerMember.toFixed(2)} €/mois</strong>
                </div>
                
                <div class="recap-item">
                  <span>Total mensuel :</span>
                  <strong>${(data.amount / 100).toFixed(2)} €</strong>
                </div>
              </div>
              
              <h3>🚀 Prochaines étapes :</h3>
              <ol>
                <li>Créez votre espace professionnel (Avocat ou Notaire)</li>
                <li>Configurez votre cabinet</li>
                <li>Invitez vos collaborateurs</li>
                <li>Profitez de toutes les fonctionnalités !</li>
              </ol>
              
              <div style="text-align: center;">
                <a href="https://www.neira.fr/select-profession" class="button">
                  Accéder à mon espace →
                </a>
              </div>
              
              ${data.invoiceUrl ? `
              <p style="margin-top: 30px;">
                <a href="${data.invoiceUrl}" style="color: #3b82f6;">📄 Télécharger votre facture</a>
              </p>
              ` : ''}
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
              
              <p style="font-size: 14px; color: #6b7280;">
                <strong>Besoin d'aide ?</strong><br>
                Notre équipe support est à votre disposition :<br>
                📧 <a href="mailto:support@neira.fr">support@neira.fr</a><br>
                Réponse sous 2h (jours ouvrés)
              </p>
            </div>
            
            <div class="footer">
              <p>Neira - Espace Professionnel Automatisé<br>
              © 2026 Neira. Tous droits réservés.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log('✅ Email de confirmation envoyé à:', data.customerEmail);
    return true;
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return false;
  }
}
