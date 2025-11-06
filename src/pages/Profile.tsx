import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { useState } from "react";

export default function Profile() {
  const { user } = useAuth();
  const location = useLocation();
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';
  const [inviteCode, setInviteCode] = useState("");
  const colorClass = role === 'notaire' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Mon profil</h1>
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
          <CardFooter className="pt-2">
            <div id="cabinet" className="w-full">
              <div className="text-sm font-medium mb-2">Rejoindre un cabinet</div>
              <div className="flex gap-2">
                <Input
                  placeholder="Code d'invitation cabinet"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
                <Button className={colorClass} disabled={!inviteCode.trim()} onClick={() => {/* TODO: implémenter jonction cabinet */}}>
                  Rejoindre
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Saisissez le code d'invitation fourni par votre cabinet pour relier votre compte.</p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}
