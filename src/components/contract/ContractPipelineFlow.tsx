/**
 * Composant principal pour le flow de création de contrat multi-étapes
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Loader2, FileText, HelpCircle, Shield, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { 
  ContractPipelineState, 
  MissingInfoQuestion, 
  ClientAnswers,
  AuditIssue 
} from '@/types/contractPipeline';
import { ContractPipelineManager } from '@/lib/contractPipelineManager';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

interface Client {
  id: string;
  name: string;
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
}

interface ContractPipelineFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractType: string;
  description: string;
  role: 'avocat' | 'notaire';
  onComplete: (schema: any, brief: any) => void;
}

export function ContractPipelineFlow({
  open,
  onOpenChange,
  contractType,
  description,
  role,
  onComplete
}: ContractPipelineFlowProps) {
  const { user } = useAuth();
  const [pipeline, setPipeline] = useState<ContractPipelineManager | null>(null);
  const [state, setState] = useState<ContractPipelineState | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientAnswers, setClientAnswers] = useState<ClientAnswers>({});
  const [currentProgress, setCurrentProgress] = useState(0);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Charger les clients du cabinet au montage
  useEffect(() => {
    if (open && user) {
      loadClients();
    }
  }, [open, user, role]);

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      console.log('🔍 Chargement clients - user:', user?.id, 'role:', role);
      
      // Récupérer le cabinet de l'utilisateur via cabinet_members
      const { data: cabinetMember, error: memberError } = await supabase
        .from('cabinet_members')
        .select('cabinet_id, cabinets(id, role)')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single();

      console.log('📋 Cabinet member:', cabinetMember, 'error:', memberError);

      if (memberError || !cabinetMember) {
        console.error('❌ Aucun cabinet trouvé pour cet utilisateur');
        setClients([]);
        setLoadingClients(false);
        return;
      }

      const cabinetId = cabinetMember.cabinet_id;
      console.log('✅ Cabinet ID:', cabinetId);

      // Récupérer TOUS les clients directs du cabinet (sans filtre de rôle d'abord)
      const { data: directClients, error: directError } = await supabase
        .from('clients')
        .select('*')
        .eq('owner_id', cabinetId)
        .order('created_at', { ascending: false });

      console.log('📝 Clients directs (TOUS):', directClients?.length || 0, directClients);
      console.log('📝 Erreur directe:', directError);

      // Récupérer les clients partagés
      const { data: sharedClients, error: sharedError } = await supabase
        .from('cabinet_clients')
        .select(`
          client_id,
          clients (*)
        `)
        .eq('cabinet_id', cabinetId);

      console.log('🔗 Clients partagés:', sharedClients?.length || 0, sharedClients);
      console.log('🔗 Erreur partagés:', sharedError);

      // Combiner et filtrer par rôle
      const allClients = [...(directClients || [])];
      
      // Ajouter les clients partagés (en évitant les doublons)
      if (sharedClients) {
        for (const shared of sharedClients) {
          const client = (shared as any).clients;
          if (client && !allClients.some(c => c.id === client.id)) {
            allClients.push(client);
          }
        }
      }
      
      // Filtrer par rôle
      const roleClients = allClients.filter(c => c.role === role);
      
      console.log('📊 Total clients (tous rôles):', allClients.length);
      console.log('📊 Clients filtrés par rôle', role, ':', roleClients.length);
      console.log('✨ Clients finaux:', roleClients);
      
      setClients(roleClients);
    } catch (error) {
      console.error('💥 Erreur chargement clients:', error);
      toast.error('Impossible de charger les clients');
    } finally {
      setLoadingClients(false);
    }
  };

  // Initialiser le pipeline quand le dialog s'ouvre
  useEffect(() => {
    if (open && contractType && description) {
      const manager = new ContractPipelineManager(
        contractType,
        description,
        (newState) => {
          setState(newState);
          updateProgress(newState.step);
        }
      );
      setPipeline(manager);
      setState(manager.getState());
      
      // Démarrer automatiquement la clarification
      startPipeline(manager);
    }
  }, [open, contractType, description]);

  // Démarrer le pipeline
  const startPipeline = async (manager: ContractPipelineManager) => {
    setLoading(true);
    try {
      toast.info('🔍 Analyse de votre demande...');
      await manager.clarifyRequest(role);
      toast.success('✅ Analyse terminée');
    } catch (error: any) {
      toast.error('Erreur lors de l\'analyse: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Soumettre les réponses aux questions
  const handleSubmitAnswers = async () => {
    if (!pipeline) return;

    setLoading(true);
    try {
      toast.info('📝 Enregistrement de vos réponses...');
      await pipeline.submitClientAnswers(clientAnswers, role);
      
      // Vérifier si on doit générer le schéma
      const currentState = pipeline.getState();
      if (currentState.step === 'form_schema') {
        await generateSchema();
      }
    } catch (error: any) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Générer le schéma de formulaire
  const generateSchema = async () => {
    if (!pipeline) return;

    setLoading(true);
    try {
      toast.info('📋 Génération du formulaire...');
      await pipeline.generateFormSchema(role);
      
      // Lancer l'audit automatiquement
      await auditSchema();
    } catch (error: any) {
      toast.error('Erreur génération: ' + error.message);
      setLoading(false);
    }
  };

  // Auditer le schéma
  const auditSchema = async () => {
    if (!pipeline) return;

    try {
      toast.info('🔍 Vérification de la qualité...');
      const result = await pipeline.auditFormSchema(role);
      
      if (result.report.hasCriticalIssues) {
        toast.warning('⚠️ Problèmes détectés - correction en cours...');
      } else {
        toast.success('✅ Formulaire validé !');
        
        // Pipeline terminé - retourner le schéma et le brief
        const finalState = pipeline.getState();
        if (finalState.formSchema && finalState.brief) {
          setTimeout(() => {
            onComplete(finalState.formSchema, finalState.brief);
            onOpenChange(false);
          }, 500);
        }
      }
    } catch (error: any) {
      toast.error('Erreur audit: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour la progression
  const updateProgress = (step: string) => {
    const progressMap: Record<string, number> = {
      'clarification': 20,
      'missing_info_questions': 40,
      'form_schema': 60,
      'audit': 80,
      'form_filling': 100,
    };
    setCurrentProgress(progressMap[step] || 0);
  };

  // Gérer la réponse à une question
  const handleAnswerChange = (fieldName: string, value: any) => {
    setClientAnswers(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  if (!state) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Création du contrat - {contractType}
          </DialogTitle>
          <DialogDescription>
            Pipeline de création avec contrôle qualité automatique
          </DialogDescription>
        </DialogHeader>

        {/* Barre de progression */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progression</span>
            <span>{currentProgress}%</span>
          </div>
          <Progress value={currentProgress} className="h-2" />
          
          {/* Indicateurs d'étapes */}
          <div className="flex justify-between mt-4 text-xs">
            {['Analyse', 'Questions', 'Formulaire', 'Audit', 'Prêt'].map((label, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentProgress >= (idx + 1) * 20 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {currentProgress >= (idx + 1) * 20 ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span className="text-center">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contenu selon l'étape */}
        <div className="mt-6">
          {/* ÉTAPE: Clarification en cours */}
          {state.step === 'clarification' && loading && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <div>
                    <p className="font-medium">Analyse de votre demande...</p>
                    <p className="text-sm text-gray-600">
                      L'IA structure votre demande et identifie les informations nécessaires
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ÉTAPE: Brief généré - affichage */}
          {state.brief && state.step === 'clarification' && !loading && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Analyse terminée
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Contexte identifié:</h4>
                  <p className="text-sm text-gray-700">{state.brief.context.description}</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Parties impliquées:</h4>
                  <div className="flex gap-2">
                    {state.brief.parties.map((p, idx) => (
                      <Badge key={idx} variant="secondary">{p.role}</Badge>
                    ))}
                  </div>
                </div>

                {state.brief.pointsSensibles.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Points sensibles à traiter:</h4>
                    <ul className="text-sm text-gray-700 list-disc list-inside">
                      {state.brief.pointsSensibles.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ÉTAPE: Questions aux client */}
          {state.step === 'missing_info_questions' && state.questions && state.questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-orange-600" />
                  Informations complémentaires requises
                </CardTitle>
                <CardDescription>
                  Veuillez répondre aux questions suivantes pour créer un contrat complet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {state.questions.map((question) => (
                  <QuestionField
                    key={question.id}
                    question={question}
                    value={clientAnswers[question.fieldName] || ''}
                    onChange={(value) => handleAnswerChange(question.fieldName, value)}
                    clients={clients}
                    loadingClients={loadingClients}
                  />
                ))}

                <Button 
                  onClick={handleSubmitAnswers} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    'Continuer'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ÉTAPE: Génération du schéma */}
          {state.step === 'form_schema' && loading && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <div>
                    <p className="font-medium">Génération du formulaire...</p>
                    <p className="text-sm text-gray-600">
                      Création d'un formulaire adapté à votre situation
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ÉTAPE: Audit */}
          {state.step === 'audit' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Contrôle qualité en cours
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <div>
                      <p className="font-medium">Vérification du formulaire...</p>
                      <p className="text-sm text-gray-600">
                        Audit {state.auditIterations + 1}/3 - Détection des problèmes et corrections
                      </p>
                    </div>
                  </div>
                ) : state.auditReport && (
                  <AuditReport report={state.auditReport} />
                )}
              </CardContent>
            </Card>
          )}

          {/* ÉTAPE: Prêt pour la saisie */}
          {state.step === 'form_filling' && !loading && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-green-600">
                  <CheckCircle2 className="w-8 h-8" />
                  <div>
                    <p className="font-medium text-lg">Formulaire prêt !</p>
                    <p className="text-sm text-gray-600">
                      Le formulaire a été validé et est prêt à être rempli
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Historique (debug) */}
        {state.history.length > 0 && (
          <details className="mt-4">
            <summary className="text-xs text-gray-500 cursor-pointer">
              Historique ({state.history.length} actions)
            </summary>
            <div className="mt-2 text-xs space-y-1 max-h-40 overflow-y-auto">
              {state.history.map((entry, idx) => (
                <div key={idx} className="text-gray-600">
                  {new Date(entry.timestamp).toLocaleTimeString()} - {entry.action}
                </div>
              ))}
            </div>
          </details>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Composant pour afficher une question
 */
function QuestionField({ 
  question, 
  value, 
  onChange,
  clients = [],
  loadingClients = false
}: { 
  question: MissingInfoQuestion; 
  value: any; 
  onChange: (value: any) => void;
  clients?: Client[];
  loadingClients?: boolean;
}) {
  // Détecter si la question concerne un client
  const isClientField = question.fieldName.toLowerCase().includes('client') || 
                       question.questionText.toLowerCase().includes('client') ||
                       question.fieldName.toLowerCase().includes('partie');

  return (
    <div className="space-y-2">
      <Label htmlFor={question.id} className="flex items-center gap-2">
        {question.question}
        {question.required && <span className="text-red-500">*</span>}
        {question.priority === 'bloquant' && (
          <Badge variant="destructive" className="text-xs">Obligatoire</Badge>
        )}
        {question.priority === 'important' && (
          <Badge variant="default" className="text-xs">Important</Badge>
        )}
      </Label>
      
      {question.hint && (
        <p className="text-xs text-gray-500">{question.hint}</p>
      )}

      {/* Sélecteur de client si disponible et pertinent */}
      {isClientField && clients.length > 0 && (
        <div className="mb-3">
          <Label className="text-sm font-medium mb-2 block">Sélectionner un client existant (optionnel)</Label>
          <Select 
            value={value?.clientId || ''} 
            onValueChange={(clientId) => {
              const selectedClient = clients.find(c => c.id === clientId);
              if (selectedClient) {
                // Pré-remplir avec les données du client
                onChange({
                  clientId: selectedClient.id,
                  nom: selectedClient.nom || selectedClient.name,
                  prenom: selectedClient.prenom,
                  email: selectedClient.email,
                  telephone: selectedClient.telephone,
                  adresse: selectedClient.adresse
                });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir un client..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Saisie manuelle</SelectItem>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name || `${client.prenom} ${client.nom}`}
                  {client.email && ` (${client.email})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {value?.clientId && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
              ✓ Client sélectionné: <strong>{value.nom || value.prenom}</strong>
            </div>
          )}
        </div>
      )}

      {isClientField && clients.length === 0 && !loadingClients && (
        <Alert className="mb-3">
          <AlertDescription>
            ⚠️ Aucun client disponible. <a href="/clients" className="underline font-medium">Créez un client</a> ou utilisez la saisie manuelle ci-dessous.
          </AlertDescription>
        </Alert>
      )}

      {/* Champ de saisie principal */}
      {question.inputType === 'textarea' ? (
        <Textarea
          id={question.id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.hint}
          className="min-h-[100px]"
        />
      ) : question.inputType === 'select' ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez..." />
          </SelectTrigger>
          <SelectContent>
            {question.options?.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : question.inputType === 'radio' ? (
        <RadioGroup value={value} onValueChange={onChange}>
          {question.options?.map(opt => (
            <div key={opt} className="flex items-center space-x-2">
              <RadioGroupItem value={opt} id={`${question.id}-${opt}`} />
              <Label htmlFor={`${question.id}-${opt}`}>{opt}</Label>
            </div>
          ))}
        </RadioGroup>
      ) : (
        <Input
          id={question.id}
          type={question.inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.hint}
        />
      )}
    </div>
  );
}

/**
 * Composant pour afficher le rapport d'audit
 */
function AuditReport({ report }: { report: any }) {
  if (!report.issues || report.issues.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle2 className="w-5 h-5" />
        <span>Aucun problème détecté - Formulaire validé !</span>
      </div>
    );
  }

  const criticalIssues = report.issues.filter((i: AuditIssue) => i.severity === 'bloquant');
  const importantIssues = report.issues.filter((i: AuditIssue) => i.severity === 'important');
  const minorIssues = report.issues.filter((i: AuditIssue) => i.severity === 'mineur');

  return (
    <div className="space-y-4">
      {criticalIssues.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{criticalIssues.length} problème(s) critique(s)</strong>
            <ul className="mt-2 list-disc list-inside text-sm">
              {criticalIssues.map((issue: AuditIssue) => (
                <li key={issue.id}>{issue.title}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {importantIssues.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{importantIssues.length} point(s) à améliorer</strong>
            <ul className="mt-2 list-disc list-inside text-sm">
              {importantIssues.map((issue: AuditIssue) => (
                <li key={issue.id}>{issue.title}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {report.suggestions && report.suggestions.length > 0 && (
        <div className="text-sm">
          <strong>Suggestions:</strong>
          <ul className="mt-1 list-disc list-inside text-gray-600">
            {report.suggestions.map((suggestion: string, idx: number) => (
              <li key={idx}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
