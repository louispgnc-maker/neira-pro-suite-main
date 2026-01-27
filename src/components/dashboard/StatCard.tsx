import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  iconColor?: string;
  iconBgColor?: string;
  onClick?: () => void;
}

export function StatCard({ title, value, icon: Icon, trend, iconColor = "text-primary", iconBgColor = "bg-primary/10", onClick }: StatCardProps) {
  // Détecter si le statut nécessite une alerte (orange/rouge)
  const needsAlert = typeof value === 'number' && value > 0 && (title.includes('attente') || title.includes('relancer'));
  const alertColor = needsAlert ? 'text-orange-600' : 'text-gray-900';

  return (
    <Card 
      className={`relative overflow-hidden border-border transition-shadow hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${iconBgColor}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${alertColor}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
