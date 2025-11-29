/**
 * Système de permissions pour les rôles de cabinet
 */

export type CabinetRole = 'Fondateur' | 'Associé' | 'Collaborateur' | 'Stagiaire' | 'Assistant' | 'membre';

export const CABINET_ROLES = {
  FONDATEUR: 'Fondateur' as CabinetRole,
  ASSOCIE: 'Associé' as CabinetRole,
  COLLABORATEUR: 'Collaborateur' as CabinetRole,
  STAGIAIRE: 'Stagiaire' as CabinetRole,
  ASSISTANT: 'Assistant' as CabinetRole,
  MEMBRE: 'membre' as CabinetRole, // rôle par défaut
};

/**
 * Vérifie si l'utilisateur peut gérer l'abonnement
 * Seul le Fondateur peut modifier l'abonnement
 */
export function canManageSubscription(role: CabinetRole | string | null): boolean {
  return role === CABINET_ROLES.FONDATEUR;
}

/**
 * Vérifie si l'utilisateur peut supprimer le cabinet
 * Seul le Fondateur peut supprimer le cabinet
 */
export function canDeleteCabinet(role: CabinetRole | string | null): boolean {
  return role === CABINET_ROLES.FONDATEUR;
}

/**
 * Vérifie si l'utilisateur peut inviter des membres
 * Fondateur et Associé peuvent inviter
 */
export function canInviteMembers(role: CabinetRole | string | null): boolean {
  return role === CABINET_ROLES.FONDATEUR || role === CABINET_ROLES.ASSOCIE;
}

/**
 * Vérifie si l'utilisateur peut retirer des membres
 * Fondateur et Associé peuvent retirer (sauf le Fondateur lui-même)
 */
export function canRemoveMembers(role: CabinetRole | string | null): boolean {
  return role === CABINET_ROLES.FONDATEUR || role === CABINET_ROLES.ASSOCIE;
}

/**
 * Vérifie si l'utilisateur peut changer le rôle d'un membre
 * Fondateur et Associé peuvent changer les rôles, avec des restrictions pour l'Associé
 */
export function canChangeRoles(role: CabinetRole | string | null): boolean {
  return role === CABINET_ROLES.FONDATEUR || role === CABINET_ROLES.ASSOCIE;
}

/**
 * Vérifie si l'utilisateur peut attribuer un rôle spécifique
 * Le Fondateur peut attribuer tous les rôles
 * L'Associé ne peut pas attribuer Fondateur ou Associé
 */
export function canAssignRole(userRole: CabinetRole | string | null, targetRole: string): boolean {
  if (userRole === CABINET_ROLES.FONDATEUR) {
    return true;
  }
  if (userRole === CABINET_ROLES.ASSOCIE) {
    return targetRole !== CABINET_ROLES.FONDATEUR && targetRole !== CABINET_ROLES.ASSOCIE && targetRole !== 'owner';
  }
  return false;
}

/**
 * Vérifie si l'utilisateur peut modifier le rôle d'un membre spécifique
 * Le Fondateur peut modifier tous les rôles
 * L'Associé ne peut pas modifier les rôles des Fondateurs ou autres Associés
 */
export function canModifyMemberRole(userRole: CabinetRole | string | null, targetMemberRole: string): boolean {
  if (userRole === CABINET_ROLES.FONDATEUR) {
    return true;
  }
  if (userRole === CABINET_ROLES.ASSOCIE) {
    return targetMemberRole !== CABINET_ROLES.FONDATEUR && targetMemberRole !== CABINET_ROLES.ASSOCIE && targetMemberRole !== 'owner';
  }
  return false;
}

/**
 * Vérifie si l'utilisateur peut créer des ressources (clients, dossiers, etc.)
 * Fondateur, Associé et Collaborateur peuvent créer
 */
export function canCreateResources(role: CabinetRole | string | null): boolean {
  return role === CABINET_ROLES.FONDATEUR || 
         role === CABINET_ROLES.ASSOCIE || 
         role === CABINET_ROLES.COLLABORATEUR;
}

/**
 * Vérifie si l'utilisateur peut modifier des ressources
 * Fondateur, Associé et Collaborateur peuvent modifier
 */
export function canEditResources(role: CabinetRole | string | null): boolean {
  return role === CABINET_ROLES.FONDATEUR || 
         role === CABINET_ROLES.ASSOCIE || 
         role === CABINET_ROLES.COLLABORATEUR;
}

/**
 * Vérifie si l'utilisateur peut supprimer des ressources importantes
 * Fondateur et Associé peuvent supprimer
 */
export function canDeleteResources(role: CabinetRole | string | null): boolean {
  return role === CABINET_ROLES.FONDATEUR || role === CABINET_ROLES.ASSOCIE;
}

/**
 * Vérifie si l'utilisateur a des permissions d'administration
 * Fondateur et Associé sont considérés comme admins
 */
export function isAdmin(role: CabinetRole | string | null): boolean {
  return role === CABINET_ROLES.FONDATEUR || role === CABINET_ROLES.ASSOCIE;
}

/**
 * Retourne un message d'erreur approprié pour un refus de permission
 */
export function getPermissionDeniedMessage(role: CabinetRole | string | null): string {
  if (role === CABINET_ROLES.STAGIAIRE) {
    return "Les stagiaires n'ont pas accès à cette fonctionnalité";
  }
  if (role === CABINET_ROLES.ASSISTANT) {
    return "Les assistants n'ont pas accès à cette fonctionnalité";
  }
  if (role === CABINET_ROLES.COLLABORATEUR) {
    return "Seuls les Fondateurs et Associés peuvent effectuer cette action";
  }
  return "Vous n'avez pas les permissions nécessaires pour cette action";
}
