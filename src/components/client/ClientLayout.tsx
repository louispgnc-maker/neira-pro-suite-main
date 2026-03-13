import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, Home, FileText, Folder, User, Menu, X, FileSignature, MessageSquare, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [clientName, setClientName] = useState<string>('');
  const [cabinetName, setCabinetName] = useState<string>('');
  const [clientId, setClientId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadClientData();
  }, [user, navigate]);

  const loadClientData = async () => {
    try {
      // Get client data
      const { data: client, error } = await supabase
        .from('clients')
        .select('id, name, owner_id')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (client) {
        setClientId(client.id);
        setClientName(client.name);
        
        // Get cabinet name separately
        if (client.owner_id) {
          const { data: cabinet } = await supabase
            .from('cabinets')
            .select('nom')
            .eq('id', client.owner_id)
            .single();
          
          if (cabinet) {
            setCabinetName(cabinet.nom);
          }
        }
        
        // Load unread notifications count
        loadUnreadNotifications(client.id);
      }
    } catch (err) {
      console.error('Error loading client data:', err);
    }
  };

  const loadUnreadNotifications = async (clientId: string) => {
    try {
      const { count, error } = await supabase
        .from('client_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('is_read', false);

      if (!error) {
        setUnreadNotifications(count || 0);
      }
    } catch (err) {
      console.error('Error loading unread notifications:', err);
    }
  };

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel(`client-notifications-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_notifications',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          loadUnreadNotifications(clientId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Déconnexion réussie');
    navigate('/');
  };

  const navItems = [
    { path: '/client-space', label: 'Tableau de bord', icon: Home },
    { path: '/client-space/dossiers', label: 'Mes dossiers', icon: Folder },
    { path: '/client-space/contrats', label: 'Mes contrats', icon: FileSignature },
    { path: '/client-space/documents', label: 'Mes documents', icon: FileText },
    { path: '/client-space/discussion', label: 'Discussion', icon: MessageSquare },
    { path: '/client-space/profile', label: 'Mon profil', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img 
                src="https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Nouveau%20logo%20Neira.png" 
                alt="Neira" 
                className="w-16 h-16 rounded-full object-cover"
              />
              <div className="flex flex-col justify-center">
                <span className="text-sm font-semibold text-gray-900 whitespace-nowrap hidden sm:block">
                  Mon espace client
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200'
                        : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 hover:shadow-sm'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="leading-none">{item.label}</span>
                  </Link>
                );
              })}
              
              {/* Notification Bell */}
              <button
                onClick={() => navigate('/client-space')}
                className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 hover:shadow-sm transition-all duration-200"
              >
                <Bell className="h-3.5 w-3.5 flex-shrink-0" />
                {unreadNotifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 min-w-[16px] flex items-center justify-center p-0 px-1 text-[10px] bg-red-500 hover:bg-red-500 border-white border-2">
                    {unreadNotifications}
                  </Badge>
                )}
              </button>
            </nav>

            {/* User info & Sign out */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 shadow-sm">
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-900">{clientName}</p>
                  <p className="text-[10px] text-gray-600">{cabinetName}</p>
                </div>
              </div>
              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:text-red-700 hover:shadow-sm transition-all duration-200 whitespace-nowrap"
              >
                <LogOut className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="leading-none">Déconnexion</span>
              </Button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <nav className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200'
                          : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 hover:shadow-sm'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:shadow-sm transition-all duration-200"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Déconnexion</span>
                </button>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
