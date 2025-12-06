-- Script pour réinitialiser les compteurs de messages non lus
-- Ce script ne peut pas directement modifier localStorage côté client
-- Mais vous pouvez utiliser ce script côté client pour réinitialiser tous les compteurs

-- Option 1: Supprimer tous les messages (ATTENTION: perte de données)
-- DELETE FROM cabinet_messages;

-- Option 2: Marquer la date actuelle comme "dernière consultation" pour chaque utilisateur
-- Vous devrez exécuter ce code JavaScript dans la console du navigateur pour chaque utilisateur:

/*
// À exécuter dans la console du navigateur (F12) quand l'utilisateur est connecté
(async function resetAllMessageCounters() {
  const { data: cabinets } = await supabase
    .from('cabinet_members')
    .select('cabinet_id')
    .eq('user_id', (await supabase.auth.getUser()).data.user.id);

  for (const cabinet of cabinets || []) {
    const { data: messages } = await supabase
      .from('cabinet_messages')
      .select('id, conversation_id, recipient_id, sender_id')
      .eq('cabinet_id', cabinet.cabinet_id);

    const conversationIds = new Set();
    
    (messages || []).forEach(msg => {
      if (!msg.conversation_id && !msg.recipient_id) {
        conversationIds.add('general');
      } else if (msg.conversation_id) {
        conversationIds.add(msg.conversation_id);
      } else if (msg.recipient_id) {
        conversationIds.add(`direct-${msg.sender_id}`);
      }
    });

    const now = new Date().toISOString();
    conversationIds.forEach(convId => {
      const key = `chat-last-viewed-${cabinet.cabinet_id}-${convId}`;
      localStorage.setItem(key, now);
    });
  }
  
  console.log('✅ Compteurs réinitialisés pour tous les cabinets');
  window.location.reload();
})();
*/
