// Script pour réinitialiser tous les compteurs de messages non lus
// Usage: node scripts/reset-all-message-counters.js

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  IMPORTANT: Ce script doit être exécuté CÔTÉ CLIENT           ║
║                                                                 ║
║  Les compteurs de messages sont stockés dans localStorage      ║
║  du navigateur de chaque utilisateur, pas dans la base de      ║
║  données.                                                       ║
║                                                                 ║
║  Pour réinitialiser les compteurs de TOUS les utilisateurs:    ║
║                                                                 ║
║  1. Ajoutez ce code dans un composant React qui se charge      ║
║     au démarrage de l'application                              ║
║                                                                 ║
║  2. Ou demandez à chaque utilisateur d'ouvrir la console       ║
║     (F12) et d'exécuter le code ci-dessous                     ║
║                                                                 ║
╚════════════════════════════════════════════════════════════════╝

CODE À EXÉCUTER DANS LA CONSOLE DU NAVIGATEUR:
------------------------------------------------

(async function resetMessageCounters() {
  try {
    // Obtenir tous les cabinets de l'utilisateur
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Utilisateur non connecté');
      return;
    }

    const { data: memberships } = await supabase
      .from('cabinet_members')
      .select('cabinet_id')
      .eq('user_id', user.id);

    if (!memberships || memberships.length === 0) {
      console.log('ℹ️  Aucun cabinet trouvé');
      return;
    }

    console.log(\`🔍 Traitement de \${memberships.length} cabinet(s)...\`);

    for (const { cabinet_id } of memberships) {
      // Récupérer tous les messages du cabinet
      const { data: messages } = await supabase
        .from('cabinet_messages')
        .select('id, conversation_id, recipient_id, sender_id')
        .eq('cabinet_id', cabinet_id)
        .neq('sender_id', user.id);

      if (!messages || messages.length === 0) {
        console.log(\`  ℹ️  Cabinet \${cabinet_id}: aucun message\`);
        continue;
      }

      // Identifier toutes les conversations
      const conversationIds = new Set();
      
      messages.forEach(msg => {
        if (!msg.conversation_id && !msg.recipient_id) {
          conversationIds.add('general');
        } else if (msg.conversation_id) {
          conversationIds.add(msg.conversation_id);
        } else if (msg.recipient_id === user.id) {
          conversationIds.add(\`direct-\${msg.sender_id}\`);
        }
      });

      // Marquer toutes les conversations comme lues
      const now = new Date().toISOString();
      conversationIds.forEach(convId => {
        const key = \`chat-last-viewed-\${cabinet_id}-\${convId}\`;
        localStorage.setItem(key, now);
      });

      console.log(\`  ✅ Cabinet \${cabinet_id}: \${conversationIds.size} conversation(s) marquée(s) comme lues\`);
    }

    console.log('✅ Réinitialisation terminée !');
    console.log('🔄 Rechargement de la page...');
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
})();

`);
