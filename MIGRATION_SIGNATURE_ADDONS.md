# Migration - Forfaits Signatures

## 📋 Résumé

Cette migration ajoute la capacité de tracker les forfaits de signatures supplémentaires achetés par les utilisateurs.

## 🗄️ Changements de schéma

Ajout de 3 nouvelles colonnes à la table `cabinets`:

- `signature_addon_quantity` (integer) - Nombre de signatures supplémentaires achetées par mois
- `signature_addon_price` (numeric) - Prix mensuel du forfait en euros
- `signature_addon_purchased_at` (timestamptz) - Date d'achat du forfait

## 🚀 Application de la migration

### Option 1: Via Supabase Dashboard (Recommandé)

1. Allez sur https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/sql
2. Créez une nouvelle query
3. Copiez-collez le contenu du fichier: `supabase/migrations/20251225_add_signature_addons.sql`
4. Cliquez sur "Run"

### Option 2: Via script bash

```bash
./apply-signature-addons-migration.sh
```

Ce script affichera la migration à appliquer manuellement.

## ✅ Vérification

Après application, vérifiez que les colonnes existent:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'cabinets'
AND column_name LIKE 'signature_addon%';
```

Résultat attendu:
```
signature_addon_quantity    | integer          | 0
signature_addon_price       | numeric(10,2)    | 0
signature_addon_purchased_at| timestamptz      | NULL
```

## 💡 Utilisation

### Exemple d'achat d'un forfait

```typescript
// L'utilisateur achète +40 signatures pour 15€/mois
await supabase
  .from('cabinets')
  .update({
    signature_addon_quantity: 40,
    signature_addon_price: 15,
    signature_addon_purchased_at: new Date().toISOString()
  })
  .eq('id', cabinetId);
```

### Calcul des limites totales

```typescript
// Plan Professionnel: 80 signatures de base
// + 40 signatures addon
// = 120 signatures totales par mois
const baseSignatures = 80;
const addonSignatures = 40;
const totalSignatures = baseSignatures + addonSignatures; // 120
```

## 🔧 Code concerné

- `src/hooks/useSubscriptionLimits.ts` - Lit et additionne les signatures
- `src/components/cabinet/BuySignaturesDialog.tsx` - Interface d'achat
- `src/components/cabinet/CabinetStats.tsx` - Affichage des statistiques
- `src/components/cabinet/MemberUsageStats.tsx` - Stats par membre

## 📊 Impact

- ✅ Les utilisateurs peuvent acheter des forfaits de signatures supplémentaires
- ✅ Les limites sont automatiquement mises à jour
- ✅ L'historique des achats est conservé
- ⏳ TODO: Intégration paiement Stripe pour le prorata
