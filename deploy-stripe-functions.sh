#!/bin/bash

# Script de déploiement des Edge Functions Stripe
# Usage: ./deploy-stripe-functions.sh [PROJECT_REF]

set -e

# Couleurs pour le terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Déploiement des Edge Functions Stripe - Neira      ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI n'est pas installé${NC}"
    echo -e "${YELLOW}   Installez-le avec: npm install -g supabase${NC}"
    exit 1
fi

# Récupérer le PROJECT_REF
if [ -z "$1" ]; then
    echo -e "${YELLOW}⚠️  Aucun PROJECT_REF fourni${NC}"
    echo -n "Entrez votre PROJECT_REF Supabase: "
    read PROJECT_REF
else
    PROJECT_REF=$1
fi

if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}❌ PROJECT_REF requis${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Utilisation du projet: $PROJECT_REF${NC}"
echo ""

# Liste des fonctions à déployer
FUNCTIONS_WITH_JWT=(
    "create-subscription-checkout"
    "create-signature-checkout"
    "create-portal-session"
    "update-subscription-quantity"
    "get-payment-history"
)

FUNCTIONS_WITHOUT_JWT=(
    "stripe-webhook-subscriptions"
    "stripe-webhook-signatures"
)

# Fonction pour déployer avec JWT
deploy_with_jwt() {
    local func=$1
    echo -e "${BLUE}📤 Déploiement de ${func}...${NC}"
    
    if supabase functions deploy "$func" --project-ref "$PROJECT_REF"; then
        echo -e "${GREEN}✓ $func déployé avec succès${NC}"
        return 0
    else
        echo -e "${RED}✗ Échec du déploiement de $func${NC}"
        return 1
    fi
}

# Fonction pour déployer sans JWT (webhooks)
deploy_without_jwt() {
    local func=$1
    echo -e "${BLUE}📤 Déploiement de ${func} (webhook)...${NC}"
    
    if supabase functions deploy "$func" --project-ref "$PROJECT_REF" --no-verify-jwt; then
        echo -e "${GREEN}✓ $func déployé avec succès (sans JWT)${NC}"
        return 0
    else
        echo -e "${RED}✗ Échec du déploiement de $func${NC}"
        return 1
    fi
}

# Compteurs
SUCCESS_COUNT=0
FAIL_COUNT=0
TOTAL_COUNT=$((${#FUNCTIONS_WITH_JWT[@]} + ${#FUNCTIONS_WITHOUT_JWT[@]}))

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Déploiement des fonctions avec JWT...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

for func in "${FUNCTIONS_WITH_JWT[@]}"; do
    if deploy_with_jwt "$func"; then
        ((SUCCESS_COUNT++))
    else
        ((FAIL_COUNT++))
    fi
    echo ""
done

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Déploiement des webhooks (sans JWT)...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

for func in "${FUNCTIONS_WITHOUT_JWT[@]}"; do
    if deploy_without_jwt "$func"; then
        ((SUCCESS_COUNT++))
    else
        ((FAIL_COUNT++))
    fi
    echo ""
done

# Résumé
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}RÉSUMÉ DU DÉPLOIEMENT${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Total de fonctions:    $TOTAL_COUNT"
echo -e "${GREEN}✓ Succès:              $SUCCESS_COUNT${NC}"

if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "${RED}✗ Échecs:              $FAIL_COUNT${NC}"
fi

echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ Toutes les fonctions ont été déployées avec succès║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📋 Prochaines étapes:${NC}"
    echo ""
    echo -e "1. Configurez les webhooks dans Stripe Dashboard:"
    echo -e "   ${YELLOW}https://dashboard.stripe.com/webhooks${NC}"
    echo ""
    echo -e "2. URLs des webhooks:"
    echo -e "   • Abonnements: ${GREEN}https://$PROJECT_REF.supabase.co/functions/v1/stripe-webhook-subscriptions${NC}"
    echo -e "   • Signatures:  ${GREEN}https://$PROJECT_REF.supabase.co/functions/v1/stripe-webhook-signatures${NC}"
    echo ""
    echo -e "3. Événements Stripe à écouter:"
    echo -e "   • checkout.session.completed"
    echo -e "   • customer.subscription.updated"
    echo -e "   • customer.subscription.deleted"
    echo -e "   • invoice.payment_failed"
    echo -e "   • invoice.paid"
    echo ""
    echo -e "4. Configurez les secrets Supabase:"
    echo -e "   • STRIPE_SECRET_KEY"
    echo -e "   • STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS"
    echo -e "   • STRIPE_WEBHOOK_SECRET"
    echo ""
    exit 0
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ⚠️  Certaines fonctions n'ont pas pu être déployées  ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Vérifiez les erreurs ci-dessus et réessayez.${NC}"
    exit 1
fi
