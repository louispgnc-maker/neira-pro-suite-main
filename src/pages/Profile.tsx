import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

export default function Profile() {
  const { user } = useAuth();
  const location = useLocation();
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Mon profil</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-muted-foreground">Email</div>
            <div className="font-medium">{user?.email || '—'}</div>
            <div className="text-sm text-muted-foreground mt-4">Espace</div>
            <Badge variant="outline" className={role === 'notaire' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
              {role}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
