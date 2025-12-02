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
  return (
    <Card 
      className={`relative overflow-hidden border-border bg-gradient-card transition-shadow hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${iconBgColor}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {trend && (
          <p className={`text-xs ${trend.positive ? 'text-success' : 'text-destructive'}`}>
            {trend.positive ? '+' : '-'}{trend.value} ce mois
          </p>
        )}
      </CardContent>
    </Card>
  );
}
