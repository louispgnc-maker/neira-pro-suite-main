# Configuration de la signature Universign

## Utilisation

Pour créer une signature avec une ancre textuelle :

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
    signatureAnchor: '[SIGNER_ICI]'  // L'ancre sur laquelle placer la signature
  }
});
```

## Ancre de signature

**Important** : La signature se place automatiquement sur l'ancre `[SIGNER_ICI]` présente dans votre document PDF.

- **signatureAnchor** : Toujours `'[SIGNER_ICI]'` (valeur par défaut et recommandée)

### Comment utiliser les ancres dans vos documents

1. Dans votre contrat HTML/PDF, ajoutez le mot-clé unique où vous voulez la signature :
   ```html
   <p>Fait à Paris, le 7 mars 2026</p>
   <p><strong>__SIGNATURE_CLIENT__</strong></p>
   ```

2. La signature Universign sera automatiquement placée sur ce mot, quelle que soit sa position dans le document

3. Vous pouvez utiliser plusieurs ancres différentes pour plusieurs signataires (à implémenter si besoin)

## Récupération du document signé

Une fois la signature complétée :

1. Le webhook `universign-webhook` est automatiquement appelé par Universign
2. Le document signé est téléchargé et u`[SIGNER_ICI]` où vous voulez la signature :
   ```html
   <p>Fait à Paris, le 7 mars 2026</p>
   <p><strong>[SIGNER_ICI]</strong></p>
   ```

2. La signature Universign sera automatiquement placée sur cette ancre, quelle que soit sa position dans le document
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
