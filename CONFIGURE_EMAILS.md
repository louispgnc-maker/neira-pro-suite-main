# ⚡ Configuration des emails - Guide rapide

## 🎯 Problème actuel
Les emails de contact ne sont pas envoyés car la clé API Resend n'est pas configurée dans Supabase.

## ✅ Solution rapide (5 minutes)

### 1. Obtenir votre clé API Resend

1. **Créez un compte gratuit sur Resend** :
   - Allez sur : https://resend.com/signup
   - Inscrivez-vous avec votre email
   - Confirmez votre email

2. **Obtenez votre clé API** :
   - Une fois connecté, allez dans **API Keys**
   - Cliquez sur **Create API Key**
   - Donnez-lui un nom : "Neira Production"
   - Copiez la clé qui commence par `re_...`

### 2. Configurer la clé dans Supabase

**Via le Dashboard Supabase** (recommandé) :

1. Allez sur votre projet Supabase : https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh
2. Cliquez sur **Edge Functions** dans le menu de gauche
3. Cliquez sur **Manage secrets**
4. Ajoutez un nouveau secret :
   - Nom : `RESEND_API_KEY`
   - Valeur : Collez votre clé Resend (commence par `re_...`)
5. Cliquez sur **Save**

**Via Supabase CLI** (alternatif) :

```bash
# Dans le terminal
cd /Users/louispgnc/Desktop/neira-pro-suite-main

# Configurer le secret
supabase secrets set RESEND_API_KEY=re_VotreCleIci
```

### 3. Vérifier le domaine d'envoi (optionnel mais recommandé)

Pour éviter que les emails finissent en spam :

1. Dans Resend, allez dans **Domains**
2. Cliquez sur **Add Domain**
3. Entrez votre domaine : `neira.fr`
4. Suivez les instructions pour ajouter les enregistrements DNS

**Enregistrements DNS à ajouter** :
```
Type: TXT
Name: _resend
Value: (fourni par Resend)

Type: CNAME
Name: resend._domainkey
Value: (fourni par Resend)
```

### 4. Tester immédiatement

Une fois configuré :

1. Redéployez la fonction Edge (optionnel, elle se mettra à jour automatiquement)
2. Testez en envoyant un message depuis :
   - https://www.neira.fr/contact
   - ou https://www.neira.fr/notaires/profile (onglet Contact)

## 📊 Plan gratuit Resend

- ✅ 3000 emails/mois gratuits
- ✅ Pas de limite de destinataires
- ✅ Excellent deliverability
- ✅ Support des domaines personnalisés
- ✅ Statistiques détaillées

## 🔍 Vérifier que ça fonctionne

Après configuration, les messages de contact :
1. Seront sauvegardés dans Supabase (table `contact_messages`)
2. Vous recevrez un email sur `louispgnc@gmail.com` avec le contenu du message
3. L'utilisateur recevra un email de confirmation

## 🆘 En cas de problème

Si les emails ne partent toujours pas :

1. Vérifiez dans Resend > Logs si les emails sont envoyés
2. Vérifiez dans Supabase > Edge Functions > Logs s'il y a des erreurs
3. Vérifiez que la clé API commence bien par `re_`
4. Contactez le support Resend (très réactif)

## 📝 Alternative temporaire

En attendant la configuration Resend, les messages sont **quand même sauvegardés** dans Supabase.

Pour consulter les messages reçus :

```sql
-- Aller dans Supabase > SQL Editor
SELECT * FROM contact_messages 
ORDER BY created_at DESC;
```

Vous pouvez y répondre manuellement en attendant que Resend soit configuré.
