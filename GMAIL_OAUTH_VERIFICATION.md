# 📧 Vérification OAuth Gmail - Neira Pro Suite

## 🎯 Informations pour la vérification Google

### Application
- **Nom** : Neira Pro Suite
- **Domaine** : neira.fr
- **Type** : Plateforme collaborative pour professionnels du droit (avocats, notaires)

### Scopes demandés

#### 1. `https://www.googleapis.com/auth/gmail.readonly`
**Justification** : Permet aux utilisateurs de consulter leurs emails Gmail directement dans l'interface Neira, sans quitter la plateforme. Améliore la productivité en centralisant la communication professionnelle.

**Usage** :
- Synchronisation des emails dans l'interface Neira
- Affichage de la liste des emails
- Lecture du contenu des emails
- Téléchargement des pièces jointes

#### 2. `https://www.googleapis.com/auth/gmail.send`
**Justification** : Permet aux utilisateurs d'envoyer des emails directement depuis Neira, en utilisant leur compte Gmail. Facilite la communication avec les clients sans changer d'application.

**Usage** :
- Envoi d'emails depuis l'interface Neira
- Réponse aux emails reçus
- Transfert d'emails

#### 3. `https://www.googleapis.com/auth/gmail.compose`
**Justification** : Permet de créer des brouillons d'emails dans Gmail depuis Neira.

**Usage** :
- Composition de nouveaux messages
- Ajout de pièces jointes
- Gestion des destinataires (To, Cc)

---

## 🔐 Sécurité et confidentialité

### Stockage des données
- Les emails sont stockés dans une base de données Supabase (PostgreSQL) sécurisée
- Chiffrement en transit (HTTPS) et au repos
- Accès restreint par Row Level Security (RLS)
- Chaque utilisateur ne voit que ses propres emails

### Tokens OAuth
- Les refresh tokens sont stockés de manière sécurisée dans la base de données
- Jamais exposés côté client
- Utilisés uniquement par les Edge Functions Supabase (serverless)

### Partage des données
- **Aucune donnée n'est partagée avec des tiers**
- Les emails restent strictement confidentiels
- Pas de revente de données
- Pas de publicité ciblée

### Politique de confidentialité
Disponible sur : https://neira.fr/rgpd

### Conditions d'utilisation
Disponibles sur : https://neira.fr/cgu

---

## 🎥 Vidéo de démonstration

### Scénario de la vidéo

1. **Connexion Gmail** (0:00-0:30)
   - Utilisateur clique sur "Connecter Gmail"
   - Redirection vers Google OAuth
   - Acceptation des permissions
   - Retour sur Neira avec compte connecté

2. **Lecture des emails** (0:30-1:00)
   - Liste des emails synchronisés
   - Clic sur un email pour le lire
   - Affichage du contenu complet
   - Téléchargement d'une pièce jointe

3. **Envoi d'un email** (1:00-1:30)
   - Clic sur "Nouveau message"
   - Saisie du destinataire, objet, corps
   - Ajout d'une pièce jointe (optionnel)
   - Envoi de l'email
   - Confirmation d'envoi

4. **Sécurité** (1:30-2:00)
   - Démonstration que les emails sont isolés par utilisateur
   - Aucun accès aux emails d'autres utilisateurs

---

## 📊 Usage des données

### Ce que nous faisons
✅ Synchroniser vos emails pour affichage dans Neira
✅ Envoyer des emails en votre nom via Gmail API
✅ Stocker les métadonnées (expéditeur, sujet, date) pour recherche
✅ Permettre le téléchargement de pièces jointes

### Ce que nous NE faisons PAS
❌ Vendre vos données
❌ Partager vos emails avec des tiers
❌ Analyser vos emails pour de la publicité
❌ Accéder à vos emails sans votre consentement explicite

---

## 🔧 Architecture technique

### Frontend
- React + TypeScript
- Interface de messagerie intégrée
- Connexion OAuth via popup

### Backend
- Supabase (PostgreSQL + Edge Functions)
- Edge Functions Deno pour OAuth callback et opérations Gmail
- Row Level Security (RLS) pour isolation des données

### API
- Gmail API v1
- OAuth 2.0 avec refresh tokens
- Synchronisation automatique toutes les 5 minutes

---

## 📝 Conformité

- ✅ RGPD compliant
- ✅ Politique de confidentialité détaillée
- ✅ Consentement explicite de l'utilisateur
- ✅ Droit d'accès, de rectification et de suppression
- ✅ Chiffrement des données
- ✅ Audit logs disponibles

---

## 📞 Contact

**Responsable du traitement des données** :
- Louis POIGNONEC
- Email : contact@neira.fr
- Adresse : 36 Chemin d'Artigues, 33150 Cenon, France

---

## 🚀 Instructions de publication

1. ✅ Compléter l'écran de consentement OAuth
2. ✅ Ajouter les URLs de redirection
3. ✅ Lier la politique de confidentialité
4. ✅ Lier les conditions d'utilisation
5. ✅ Soumettre une vidéo de démonstration
6. ✅ Répondre au questionnaire de vérification
7. ⏳ Attendre l'approbation Google (2-6 semaines)
