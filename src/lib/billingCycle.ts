/**
 * Calcule le début du cycle de facturation actuel pour un cabinet
 * @param subscriptionStartedAt - Date de début d'abonnement du cabinet
 * @returns Date de début du cycle mensuel actuel
 */
export function getCurrentBillingCycleStart(subscriptionStartedAt: string | null): Date {
  if (!subscriptionStartedAt) {
    // Pas de date d'abonnement, utiliser le 1er du mois actuel
    const now = new Date();
    const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return cycleStart;
  }

  const startDate = new Date(subscriptionStartedAt);
  const now = new Date();
  
  // Calculer combien de mois se sont écoulés depuis le début
  let monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + 
                   (now.getMonth() - startDate.getMonth());
  
  // Si on n'a pas encore atteint le jour anniversaire ce mois-ci, on est encore dans le cycle précédent
  if (now.getDate() < startDate.getDate()) {
    monthsDiff--;
  }
  
  // Calculer la date de début du cycle actuel
  const cycleStart = new Date(startDate);
  cycleStart.setMonth(cycleStart.getMonth() + monthsDiff);
  
  return cycleStart;
}

/**
 * Calcule la fin du cycle de facturation actuel pour un cabinet
 * @param subscriptionStartedAt - Date de début d'abonnement du cabinet  
 * @returns Date de fin du cycle mensuel actuel
 */
export function getCurrentBillingCycleEnd(subscriptionStartedAt: string | null): Date {
  const cycleStart = getCurrentBillingCycleStart(subscriptionStartedAt);
  const cycleEnd = new Date(cycleStart);
  cycleEnd.setMonth(cycleEnd.getMonth() + 1);
  cycleEnd.setSeconds(cycleEnd.getSeconds() - 1); // 1 seconde avant le prochain cycle
  return cycleEnd;
}
