import { Lock, Cloud, CheckCircle } from "lucide-react";

export function TrustIndicator() {
  return (
    <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-green-600" />
          <span>Sécurité : <span className="font-medium text-green-600">OK</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-green-600" />
          <span>Sauvegarde : <span className="font-medium text-green-600">OK</span></span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span>Données <span className="font-medium text-green-600">conformes</span></span>
        </div>
      </div>
    </div>
  );
}
