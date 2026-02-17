# 🚀 Configuration Ultra-Rapide du Storage (2 minutes)

## Vous êtes maintenant sur la page: Storage > Policies

### Étape 1: Créer 4 politiques (copier-coller direct)

Cliquez sur **"New Policy"** 4 fois et pour chaque politique:

---

### **Politique 1/4**
- **Policy name**: `Users can upload to their own folder`
- **Target roles**: `authenticated` ✅
- **Policy command**: `INSERT` 
- **USING expression**: (laisser vide)
- **WITH CHECK expression**:
```sql
(bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
```

---

### **Politique 2/4**
- **Policy name**: `Users can read their own files`
- **Target roles**: `authenticated` ✅
- **Policy command**: `SELECT`
- **USING expression**:
```sql
(bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
```
- **WITH CHECK expression**: (laisser vide)

---

### **Politique 3/4**
- **Policy name**: `Users can update their own files`
- **Target roles**: `authenticated` ✅
- **Policy command**: `UPDATE`
- **USING expression**:
```sql
(bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
```
- **WITH CHECK expression**: (même chose)
```sql
(bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
```

---

### **Politique 4/4**
- **Policy name**: `Users can delete their own files`
- **Target roles**: `authenticated` ✅
- **Policy command**: `DELETE`
- **USING expression**:
```sql
(bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
```
- **WITH CHECK expression**: (laisser vide)

---

## ✅ C'est TOUT !

Après ces 4 politiques, retournez dans votre app et testez le bouton "Télécharger PDF" - ça va fonctionner ! 🎉
