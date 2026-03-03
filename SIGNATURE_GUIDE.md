# Configuration de la signature Universign

## Utilisation

Pour créer une signature avec une position personnalisée :

```typescript
const { data, error } = await supabase.functions.invoke('universign-create-signature', {
  body: {
    itemId: 'document-id',
    itemType: 'document', // ou 'contrat', 'dossier'
    signatories: [{
      email: 'client@example.com',
      firstName: 'Jean',
      lastName: 'Dupont'
    }],
    signaturePosition: {
      page: 1,      // Numéro de page (commence à 1)
      x: 150,       // Position X (en points, 0 = gauche)
      y: 275        // Position Y (en points, 0 = haut)
    }
  }
});
```

## Coordonnées de la signature

- **page**: Numéro de la page où placer la signature (commence à 1)
- **x**: Position horizontale en points (0 = bord gauche, ~595 = bord droit pour A4)
- **y**: Position verticale en points (0 = haut de la page, ~842 = bas pour A4)

### Exemples de positions communes (format A4)

- **En bas à gauche**: `{ page: 1, x: 50, y: 750 }`
- **En bas à droite**: `{ page: 1, x: 400, y: 750 }`
- **En haut à droite**: `{ page: 1, x: 400, y: 50 }`
- **Au centre**: `{ page: 1, x: 250, y: 400 }`
- **Dernière page, en bas**: `{ page: -1, x: 50, y: 750 }` (à implémenter si nécessaire)

## Récupération du document signé

Une fois la signature complétée :

1. Le webhook `universign-webhook` est automatiquement appelé par Universign
2. Le document signé est téléchargé et uploadé dans Storage
3. Le champ `storage_path` du document est mis à jour avec le nouveau fichier signé
4. Le champ `signed_at` est rempli avec la date de signature

Pour télécharger le document signé :

```typescript
const { data: document } = await supabase
  .from('documents')
  .select('*')
  .eq('id', documentId)
  .single();

if (document.signed_at) {
  // Télécharger le document signé
  const { data: signedFile } = await supabase.storage
    .from('documents')
    .download(document.storage_path);
}
```

## Webhook URL

Le webhook Universign est configuré à :
```
https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/universign-webhook
```

Cette URL doit être autorisée dans les paramètres de votre compte Universign.
