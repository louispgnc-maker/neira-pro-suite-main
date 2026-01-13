import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Lock, TrendingUp, TrendingDown, Users, FileText, FileSignature, FolderOpen, Clock, AlertCircle, DollarSign, CheckCircle, XCircle, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type DossierStats = {
  total: number;
  nouveau: number;
  enCours: number;
  enAttenteSignature: number;
  termine: number;
  byStatus: Record<string, number>;
};

type ContratStats = {
  total: number;
  signes: number;
  enAttente: number;
  avgTimeToSignature: number; // en jours
  byType: Record<string, number>; // Types de contrats
};

type ClientStats = {
  total: number;
  nouveauxCeMois: number;
  nouveauxMoisPrecedent: number;
  avecDossiersActifs: number;
  sansActivite: number;
};

type SignatureStats = {
  total: number;
  electroniques: number;
  presentielle: number;
};

export default function Statistiques() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  // Détecte le rôle depuis l'URL
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const limits = useSubscriptionLimits(role);

  // Stats states
  const [dossierStats, setDossierStats] = useState<DossierStats>({
    total: 0,
    nouveau: 0,
    enCours: 0,
    enAttenteSignature: 0,
    termine: 0,
    byStatus: {},
  });
  const [contratStats, setContratStats] = useState<ContratStats>({
    total: 0,
    signes: 0,
    enAttente: 0,
    avgTimeToSignature: 0,
    byType: {},
  });
  const [clientStats, setClientStats] = useState<ClientStats>({
    total: 0,
    nouveauxCeMois: 0,
    nouveauxMoisPrecedent: 0,
    avecDossiersActifs: 0,
    sansActivite: 0,
  });
  const [signatureStats, setSignatureStats] = useState<SignatureStats>({
    total: 0,
    electroniques: 0,
    presentielle: 0,
  });
  const [ca, setCa] = useState(0); // Chiffre d'affaires (placeholder)
  const [caEvolution, setCaEvolution] = useState(0); // % évolution

  useEffect(() => {
    async function loadStats() {
      if (!user) return;
      
      // Attendre que les limites soient chargées
      if (limits.loading) return;

      setStatsLoading(true);
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // 1. Dossiers stats
        const { data: dossiers } = await supabase
          .from('dossiers')
          .select('id, status, title, created_at, updated_at')
          .eq('owner_id', user.id)
          .eq('role', role);

        if (dossiers) {
          const nouveau = dossiers.filter(d => d.status === 'Nouveau').length;
          const enCours = dossiers.filter(d => d.status === 'En cours').length;
          const enAttenteSignature = dossiers.filter(d => d.status === 'En attente de signature').length;
          const termine = dossiers.filter(d => d.status === 'Terminé').length;
          
          // Comptage par statut pour affichage
          const byStatus: Record<string, number> = {};
          dossiers.forEach(d => {
            const status = d.status || 'Non défini';
            byStatus[status] = (byStatus[status] || 0) + 1;
          });

          setDossierStats({
            total: dossiers.length,
            nouveau,
            enCours,
            enAttenteSignature,
            termine,
            byStatus,
          });
        }

        // 2. Contrats stats
        const { data: contrats } = await supabase
          .from('contrats')
          .select('id, name, type, created_at, updated_at')
          .eq('owner_id', user.id)
          .eq('role', role);

        if (contrats) {
          // Simuler les statuts (à adapter selon votre modèle)
          const signes = Math.floor(contrats.length * 0.6); // 60% signés
          const enAttente = contrats.length - signes;
          
          // Temps moyen (simulation simple)
          let totalDays = 0;
          contrats.forEach(c => {
            const created = new Date(c.created_at);
            const updated = new Date(c.updated_at);
            const diff = Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
            totalDays += diff;
          });
          const avgTimeToSignature = contrats.length > 0 ? Math.floor(totalDays / contrats.length) : 0;

          // Comptage par type de contrat
          const byType: Record<string, number> = {};
          contrats.forEach(c => {
            const type = c.type || 'Non défini';
            byType[type] = (byType[type] || 0) + 1;
          });

          setContratStats({
            total: contrats.length,
            signes,
            enAttente,
            avgTimeToSignature,
            byType,
          });
        }

        // 3. Clients stats
        const { data: allClients } = await supabase
          .from('clients')
          .select('id, created_at')
          .eq('owner_id', user.id)
          .eq('role', role);

        if (allClients) {
          const nouveauxCeMois = allClients.filter(c => new Date(c.created_at) >= startOfMonth).length;
          const nouveauxMoisPrecedent = allClients.filter(c => {
            const date = new Date(c.created_at);
            return date >= startOfLastMonth && date <= endOfLastMonth;
          }).length;

          // Vérifier pour chaque client s'il est dans un dossier
          let avecDossiersActifs = 0;
          
          for (const client of allClients) {
            // Vérifier dans la table dossiers si ce client est lié
            const { data: clientDossiers } = await supabase
              .from('dossiers')
              .select('id')
              .eq('owner_id', user.id)
              .eq('role', role)
              .eq('client_id', client.id)
              .limit(1);
            
            if (clientDossiers && clientDossiers.length > 0) {
              avecDossiersActifs++;
            }
          }
          
          const sansActivite = allClients.length - avecDossiersActifs;

          setClientStats({
            total: allClients.length,
            nouveauxCeMois,
            nouveauxMoisPrecedent,
            avecDossiersActifs,
            sansActivite,
          });
        }

        // 4. Signatures stats (ce mois-ci)
        const { data: signatures } = await supabase
          .from('signatures')
          .select('id, status')
          .eq('owner_id', user.id)
          .eq('role', role)
          .gte('last_reminder_at', startOfMonth.toISOString());

        if (signatures) {
          // Simuler électroniques vs présentielle (à adapter selon votre modèle)
          const total = signatures.length;
          const electroniques = Math.floor(total * 0.75); // 75% électroniques
          const presentielle = total - electroniques;

          setSignatureStats({
            total,
            electroniques,
            presentielle,
          });
        }

        // 5. CA (placeholder - à connecter à votre système de facturation)
        setCa(15000 + Math.floor(Math.random() * 5000)); // Simulation
        setCaEvolution(5 + Math.floor(Math.random() * 15)); // +5% à +20%

      } catch (error) {
        console.error('Error loading statistics:', error);
      } finally {
        setLoading(false);
        setStatsLoading(false);
      }
    }

    loadStats();
  }, [user, role, limits.loading, limits.subscription_plan]);

  // Afficher le loading pendant le chargement des limites OU des stats
  if (loading || limits.loading || statsLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Chargement des statistiques...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const evolutionClients = clientStats.nouveauxMoisPrecedent > 0 
    ? ((clientStats.nouveauxCeMois - clientStats.nouveauxMoisPrecedent) / clientStats.nouveauxMoisPrecedent * 100).toFixed(1)
    : clientStats.nouveauxCeMois > 0 ? '+100' : '0';

  // Vérifier si l'utilisateur a accès Cabinet+
  const planName = (limits.subscription_plan || '').toLowerCase().replace(/[\s\-_]/g, '');
  const hasAccess = planName === 'cabinetplus' || planName === 'cabinet+';
  
  console.log('📊 Statistiques access check:', {
    subscription_plan: limits.subscription_plan,
    normalized: planName,
    hasAccess
  });

  // Page accessible avec Cabinet+
  return (
    <AppLayout>
      <div className="p-6 relative">
        {/* Contenu flouté si pas d'accès */}
        <div className={hasAccess ? '' : 'filter blur-sm pointer-events-none select-none'}>
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900">Statistiques</h1>
            <p className="text-foreground mt-1">Analyse avancée de votre activité</p>
          </div>

          {/* 1️⃣ Activité et Performance du Cabinet */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Activité et Performance du Cabinet
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dossiers traités ce mois</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dossierStats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {dossierStats.enCours} en cours, {dossierStats.urgents} urgents
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Signatures réalisées</CardTitle>
                <FileSignature className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{signatureStats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {signatureStats.electroniques} électroniques / {signatureStats.presentielle} présentielle
                </p>
              </CardContent>
            </Card>

            <Card className="relative">
              <div className="absolute inset-0 backdrop-blur-sm bg-white/30 z-10 rounded-lg flex flex-col items-center justify-center">
                <Lock className="h-12 w-12 text-gray-700 mb-2" />
                <p className="text-sm text-gray-700 font-semibold">En cours de développement</p>
              </div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-muted-foreground">— €</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  En cours de développement
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 2️⃣ Gestion des Dossiers et Documents */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gestion des Dossiers et Documents
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">État des dossiers</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-1">
                      <Minus className="h-3 w-3 text-blue-500" /> Nouveau
                    </span>
                    <span className="text-sm font-medium">{dossierStats.nouveau}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-orange-500" /> En cours
                    </span>
                    <span className="text-sm font-medium">{dossierStats.enCours}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-1">
                      <Clock className="h-3 w-3 text-purple-500" /> En attente de signature
                    </span>
                    <span className="text-sm font-medium">{dossierStats.enAttenteSignature}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" /> Terminé
                    </span>
                    <span className="text-sm font-medium">{dossierStats.termine}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Types de contrats</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(contratStats.byType)
                    .sort((a, b) => b[1] - a[1]) // Trier par nombre décroissant
                    .slice(0, 5) // Afficher les 5 plus fréquents
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm truncate pr-2">{type}</span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    ))}
                  {Object.keys(contratStats.byType).length === 0 && (
                    <p className="text-xs text-muted-foreground">Aucun contrat</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Temps moyen entre création et signature</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">{contratStats.avgTimeToSignature} jours</div>
                <p className="text-xs text-success flex items-center gap-1">
                  {contratStats.avgTimeToSignature <= 3 ? 'Excellent délai' : contratStats.avgTimeToSignature <= 7 ? 'Bon délai' : 'À optimiser'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 3️⃣ Clients et Relations Clientèle */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Clients et Relations Clientèle
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nouveaux clients ce mois</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clientStats.nouveauxCeMois}</div>
                <p className="text-xs text-muted-foreground">
                  Sur {clientStats.total} clients au total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Évolution nouveaux clients</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${parseFloat(evolutionClients) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {parseFloat(evolutionClients) >= 0 ? '+' : ''}{evolutionClients}%
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {parseFloat(evolutionClients) >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-success" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  vs mois précédent ({clientStats.nouveauxMoisPrecedent})
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Activité clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-success" /> Dossiers actifs
                    </span>
                    <span className="text-sm font-medium">{clientStats.avecDossiersActifs}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-1">
                      <Minus className="h-3 w-3 text-muted-foreground" /> Sans activité
                    </span>
                    <span className="text-sm font-medium">{clientStats.sansActivite}</span>
                  </div>
                </div>
                <Progress 
                  value={clientStats.total > 0 ? (clientStats.avecDossiersActifs / clientStats.total) * 100 : 0} 
                  className="h-2 mt-3" 
                />
              </CardContent>
            </Card>
          </div>
        </div>
        </div>

        {/* Overlay avec cadenas si pas d'accès */}
        {!hasAccess && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="max-w-md mx-auto border-2 shadow-2xl bg-background/95 backdrop-blur">
              <CardContent className="pt-6 text-center space-y-4">
                <div className={`mx-auto w-20 h-20 ${role === 'notaire' ? 'bg-orange-100' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
                  <Lock className={`h-10 w-10 ${role === 'notaire' ? 'text-orange-600' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">Fonctionnalité réservée</h2>
                  <p className="text-muted-foreground mb-4">
                    Les statistiques avancées sont disponibles uniquement avec l'offre <strong className={role === 'notaire' ? 'text-orange-600' : 'text-blue-600'}>Neira Cabinet+</strong>.
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Votre plan actuel : <span className="font-semibold capitalize">{limits.subscription_plan || 'Gratuit'}</span>
                  </p>
                </div>
                <Button 
                  onClick={() => navigate(`/${role === 'notaire' ? 'notaires' : 'avocats'}/subscription`)}
                  className={role === 'notaire' 
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'}
                >
                  Passer à Cabinet+
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
