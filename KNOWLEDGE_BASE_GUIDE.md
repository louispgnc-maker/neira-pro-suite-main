# 🧠 Base de Connaissances IA - Guide d'utilisation

## 📚 Qu'est-ce que c'est ?

La base de connaissances IA est un système de **stockage interne** pour alimenter l'IA avec des références juridiques, guides, clauses types, et best practices. Contrairement aux templates (spécifiques par type de contrat), cette base contient du **savoir général** utilisé pour TOUS les contrats.

## 🎯 Différence avec les Templates

| Templates (contract-templates) | Base de Connaissances (ai-knowledge-base) |
|---|---|
| Exemples complets de contrats | Guides, références, clauses types |
| Spécifiques à UN type | Utilisés pour TOUS les types |
| Accessible via l'interface web | Accessible uniquement en interne (CLI) |
| L'IA copie le style | L'IA s'inspire du contenu |

## 📂 Catégories disponibles

- `general` - Connaissances générales (style de rédaction, règles communes)
- `clauses` - Clauses types et modèles (RGPD, confidentialité, résiliation, etc.)
- `jurisprudence` - Références jurisprudentielles
- `procedure` - Procédures et formalités
- `fiscal` - Droit fiscal
- `social` - Droit social (CDI, CDD, licenciement, etc.)
- `immobilier` - Droit immobilier (vente, bail, etc.)
- `commercial` - Droit commercial
- `famille` - Droit de la famille
- `penal` - Droit pénal

## 🚀 Comment uploader des documents

### Pré-requis

Avoir les variables d'environnement:
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### Upload d'un fichier

```bash
node upload-knowledge.mjs guide-redaction.txt general
```

### Upload d'un dossier complet

```bash
node upload-knowledge.mjs ./mes-guides/ social
```

Tous les fichiers .txt, .md, .pdf du dossier seront uploadés dans la catégorie spécifiée.

### Lister la base actuelle

```bash
node upload-knowledge.mjs list
```

### Aide

```bash
node upload-knowledge.mjs help
```

## 📝 Formats recommandés

Pour que l'IA puisse lire le contenu, utilisez:
- **`.txt`** (texte brut) - ✅ **Recommandé**
- **`.md`** (Markdown) - ✅ **Recommandé**
- `.pdf` - Stocké mais pas encore lu (à venir)

## 💡 Exemples d'utilisation

### 1. Guide de rédaction général

**Fichier:** `guide-style-redaction.txt`
```
GUIDE DE RÉDACTION DES CONTRATS

Style et ton:
- Utiliser un français juridique clair mais précis
- Éviter les néologismes et anglicismes
- Privilégier les phrases courtes

Formules d'introduction:
- "Entre les soussignés:"
- "Il a été convenu et arrêté ce qui suit:"
- "Les parties se sont rapprochées aux fins de..."

Clauses obligatoires:
- Préambule exposant le contexte
- Article définitions si nécessaire
- Clause RGPD (obligatoire)
- Clause confidentialité
- Clause résiliation
- Droit applicable et juridiction compétente
```

```bash
node upload-knowledge.mjs guide-style-redaction.txt general
```

### 2. Clauses types

**Fichier:** `clauses-rgpd.txt`
```
CLAUSE RGPD TYPE

Article X - Protection des données personnelles

Les données personnelles collectées dans le cadre du présent contrat 
sont traitées conformément au Règlement (UE) 2016/679 du 27 avril 2016
relatif à la protection des données personnelles (RGPD).

Finalité: [Préciser]
Base légale: Exécution du contrat
Durée de conservation: [Préciser]

Le responsable de traitement est: [Nom, adresse]

Les personnes concernées disposent des droits suivants:
- Droit d'accès (article 15 RGPD)
- Droit de rectification (article 16 RGPD)
- Droit à l'effacement (article 17 RGPD)
- Droit à la limitation du traitement (article 18 RGPD)
- Droit à la portabilité (article 20 RGPD)
- Droit d'opposition (article 21 RGPD)

Pour exercer ces droits, contacter: [Email]
```

```bash
node upload-knowledge.mjs clauses-rgpd.txt clauses
```

### 3. Références jurisprudentielles

**Fichier:** `jurisprudence-bail.txt`
```
JURISPRUDENCE - DROIT DU BAIL

Cour de Cassation, 3e Civ., 15 janvier 2020, n°18-24.567
Obligation du bailleur de délivrer un logement décent
→ Rappel des critères de décence (surface, chauffage, etc.)

Cour de Cassation, 3e Civ., 3 octobre 2019, n°18-19.508
Clause de solidarité entre locataires
→ Validité sous conditions, information claire requise
```

```bash
node upload-knowledge.mjs jurisprudence-bail.txt jurisprudence
```

## 🎯 Stratégie de contenu

### Quoi mettre dans la base de connaissances ?

✅ **À INCLURE:**
- Guides de style et formules juridiques
- Clauses types annotées
- Références légales et règlementaires
- Jurisprudence importante
- Procédures et formalités
- Définitions juridiques
- Best practices de rédaction

❌ **À ÉVITER:**
- Exemples complets de contrats → Utilisez les Templates
- Informations obsolètes ou dépassées
- Contenus trop spécifiques à UN seul cas
- Documents confidentiels ou sensibles

### Ordre de priorité

1. **Catégorie `general`** - Règles de base, style, formules
2. **Catégorie `clauses`** - Clauses types réutilisables
3. **Catégories spécifiques** - Selon votre activité principale

## 🔍 Comment l'IA utilise ces connaissances

1. **Détection du type de contrat** (ex: CDI)
2. **Sélection des catégories pertinentes** (general + social)
3. **Lecture de max 2 fichiers par catégorie** (5000 caractères chacun)
4. **Intégration dans le prompt** avant génération
5. **L'IA s'inspire** du contenu pour enrichir sa rédaction

### Exemple de mapping

| Type de contrat | Catégories consultées |
|---|---|
| CDI, CDD | general + social |
| Bail commercial | general + immobilier + commercial |
| NDA | general + commercial |
| Testament | general + famille + fiscal |

## 📊 Limites et optimisations

- **Max 2 fichiers par catégorie** pour ne pas surcharger
- **Max 5000 caractères par fichier** (tronqué automatiquement)
- **Formats .txt et .md uniquement** pour l'instant
- **Ordre chronologique inversé** (les plus récents d'abord)

## 🔒 Sécurité

- Bucket **privé** (pas d'accès public)
- Accessible uniquement via **SERVICE_ROLE_KEY**
- Utilisé côté serveur dans Edge Functions
- Jamais exposé au front-end

## 🚀 Workflow recommandé

1. **Commencer simple** - Upload 2-3 documents généraux
2. **Tester** - Générer un contrat et vérifier l'impact
3. **Itérer** - Ajouter progressivement par catégorie
4. **Maintenir** - Mettre à jour régulièrement (nouvelles lois, jurisprudence)

## 📞 Support

Questions ? Contactez l'équipe technique.
