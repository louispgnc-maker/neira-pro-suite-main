# 🌐 Configuration DNS pour Resend

Guide pas-à-pas pour configurer les enregistrements DNS nécessaires à l'envoi d'emails via Resend.

---

## 📋 Enregistrements DNS à ajouter

### 1️⃣ DKIM - Domain Verification (Authentification)

**Pourquoi ?** Prouve que vous êtes bien le propriétaire du domaine.

```
Type    : TXT
Name    : resend._domainkey
Content : p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCy8hATzt1NdOxmAk+31wTh7pM07afO9JofULg60p4U15pJ07GFmAjyTyzR26hVtx1PSbEecylilZQXKBHvDkRn5vKKRVeAlBVGXt0fKmL8LcbKZJi0RuGZCjc5cFOaVkOIZRkC/Z9CeGNU8gcQLivJ0ht/CdK8nzUEerJtpbo+VwIDAQAB
TTL     : Auto (ou 3600)
```

---

### 2️⃣ SPF - Sending (Autorisation d'envoi)

**Pourquoi ?** Autorise Amazon SES (utilisé par Resend) à envoyer des emails pour votre domaine.

#### Enregistrement MX pour l'envoi
```
Type    : MX
Name    : send
Content : feedback-smtp.eu-west-1.amazonses.com
TTL     : Auto (ou 3600)
Priority: 10
```

#### Enregistrement TXT pour SPF
```
Type    : TXT
Name    : send
Content : v=spf1 include:amazonses.com ~all
TTL     : Auto (ou 3600)
```

---

### 3️⃣ MX - Receiving (Réception optionnelle)

**Pourquoi ?** Permet à Resend de recevoir des emails (webhooks de bounces, etc.).

```
Type    : MX
Name    : @ (ou vide pour le domaine racine)
Content : inbound-smtp.eu-west-1.amazonaws.com
TTL     : Auto (ou 3600)
Priority: 4
```

⚠️ **Attention** : Si vous utilisez déjà des emails sur ce domaine (Gmail, Exchange, etc.), **ne modifiez pas** cet enregistrement MX ou consultez votre administrateur système.

---

## 🔧 Configuration par hébergeur

### OVH

1. Allez sur https://www.ovh.com/manager/
2. Cliquez sur votre domaine
3. Onglet **"Zone DNS"**
4. Cliquez sur **"Ajouter une entrée"**
5. Pour chaque enregistrement :
   - **DKIM** : Choisissez "TXT" → Nom : `resend._domainkey` → Valeur : copier la clé DKIM
   - **SPF MX** : Choisissez "MX" → Nom : `send` → Serveur : `feedback-smtp.eu-west-1.amazonses.com` → Priorité : 10
   - **SPF TXT** : Choisissez "TXT" → Nom : `send` → Valeur : `v=spf1 include:amazonses.com ~all`
   - **Réception MX** : Choisissez "MX" → Nom : `@` → Serveur : `inbound-smtp.eu-west-1.amazonaws.com` → Priorité : 4

### Cloudflare

1. Allez sur https://dash.cloudflare.com/
2. Sélectionnez votre domaine
3. Onglet **"DNS"** → **"Records"**
4. Cliquez sur **"Add record"**
5. Pour chaque enregistrement :
   - **DKIM** : Type "TXT" → Name : `resend._domainkey` → Content : copier la clé
   - **SPF MX** : Type "MX" → Name : `send` → Mail server : `feedback-smtp.eu-west-1.amazonses.com` → Priority : 10
   - **SPF TXT** : Type "TXT" → Name : `send` → Content : `v=spf1 include:amazonses.com ~all`
   - **Réception MX** : Type "MX" → Name : `@` → Mail server : `inbound-smtp.eu-west-1.amazonaws.com` → Priority : 4

⚠️ **Cloudflare Proxy** : Désactivez le proxy orange (mode DNS only) pour les enregistrements MX.

### Google Domains

1. Allez sur https://domains.google.com/
2. Sélectionnez votre domaine
3. Menu **"DNS"**
4. Section **"Custom records"**
5. Cliquez sur **"Create new record"**
6. Ajoutez chaque enregistrement comme indiqué ci-dessus

### Autres hébergeurs

La plupart des hébergeurs ont une interface similaire :
- Cherchez "Zone DNS", "DNS Records", ou "Gestion DNS"
- Ajoutez les enregistrements TXT et MX
- Attendez 5-30 minutes pour la propagation

---

## ✅ Vérifier la configuration

### Méthode 1 : Dashboard Resend
1. Allez sur https://resend.com/domains
2. Cliquez sur votre domaine
3. Resend vérifie automatiquement les DNS
4. Statut **"Verified"** = ✅ tout fonctionne

### Méthode 2 : Outil en ligne
1. Allez sur https://mxtoolbox.com/SuperTool.aspx
2. Tapez : `resend._domainkey.votre-domaine.fr`
3. Vérifiez que le TXT record apparaît

### Méthode 3 : Terminal
```bash
# Vérifier le DKIM
dig TXT resend._domainkey.votre-domaine.fr

# Vérifier le SPF
dig TXT send.votre-domaine.fr

# Vérifier le MX
dig MX send.votre-domaine.fr
```

---

## 🕐 Temps de propagation

| Hébergeur | Temps moyen |
|-----------|-------------|
| Cloudflare | 2-5 minutes |
| OVH | 15-30 minutes |
| Google Domains | 5-10 minutes |
| GoDaddy | 10-30 minutes |
| Autres | 5-60 minutes |

💡 **Astuce** : Vous pouvez envoyer des emails de test pendant ce temps en utilisant `onboarding@resend.dev` comme expéditeur.

---

## ❓ FAQ

### Dois-je ajouter tous ces enregistrements ?

**DKIM** (resend._domainkey) : ✅ **Obligatoire**
- Sans ça, les emails arrivent en spam ou ne partent pas

**SPF** (send) : ✅ **Obligatoire**
- Nécessaire pour envoyer des emails

**MX** (@) : ⚠️ **Optionnel**
- Utile pour recevoir les notifications de bounce
- **Ne pas ajouter** si vous utilisez déjà des emails sur ce domaine

### J'ai déjà un enregistrement MX (Gmail, Office 365)

**Ne touchez pas** à l'enregistrement MX racine (`@`). Vous pouvez :
1. Ignorer l'enregistrement MX de réception Resend
2. Utiliser un sous-domaine : `mail.votre-domaine.fr` au lieu de `votre-domaine.fr`

### Mes emails arrivent en spam

Vérifiez que :
1. ✅ DKIM est configuré et vérifié
2. ✅ SPF est configuré et vérifié
3. ✅ Attendez 24-48h pour que la réputation du domaine s'améliore
4. ✅ Demandez aux destinataires de marquer "Pas un spam"

### Comment savoir si c'est bien configuré ?

Dans le dashboard Resend :
- **DKIM** : ✅ Verified
- **SPF** : ✅ Verified
- **MX** : ✅ Verified (si configuré)

---

## 🔗 Liens utiles

- **Resend Dashboard** : https://resend.com/domains
- **Vérifier DNS** : https://mxtoolbox.com/
- **Test SPF** : https://www.kitterman.com/spf/validate.html
- **Support Resend** : support@resend.com

---

## 📝 Exemple de configuration complète

Pour le domaine `cabinet-avocat.fr` :

```
# DKIM
resend._domainkey.cabinet-avocat.fr TXT "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCy8hATzt1NdOxmAk+31wTh7pM07afO9JofULg60p4U15pJ07GFmAjyTyzR26hVtx1PSbEecylilZQXKBHvDkRn5vKKRVeAlBVGXt0fKmL8LcbKZJi0RuGZCjc5cFOaVkOIZRkC/Z9CeGNU8gcQLivJ0ht/CdK8nzUEerJtpbo+VwIDAQAB"

# SPF
send.cabinet-avocat.fr MX feedback-smtp.eu-west-1.amazonses.com (priorité 10)
send.cabinet-avocat.fr TXT "v=spf1 include:amazonses.com ~all"

# MX (optionnel)
cabinet-avocat.fr MX inbound-smtp.eu-west-1.amazonaws.com (priorité 4)
```

---

Une fois configuré, vos emails partiront depuis `noreply@votre-domaine.fr` au lieu de `noreply@neira.fr` ! 🎉
