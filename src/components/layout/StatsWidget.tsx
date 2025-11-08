import { Server, History, CheckCircle2, XCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface StatsWidgetProps {
  connectionsCount: number;
  historyCount: number;
  successCount: number;
  failureCount: number;
}

export function StatsWidget({
  connectionsCount,
  historyCount,
  successCount,
  failureCount,
}: StatsWidgetProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-medium text-muted-foreground mb-3">Estadísticas</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <Server className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-tight">{connectionsCount}</div>
                <div className="text-xs text-muted-foreground">Conexiones</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <History className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-tight">{historyCount}</div>
                <div className="text-xs text-muted-foreground">Historial</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-xs font-medium text-muted-foreground mb-3">Resultados</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              <span className="text-sm text-muted-foreground">Exitosas</span>
            </div>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">{successCount}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              <span className="text-sm text-muted-foreground">Fallidas</span>
            </div>
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">{failureCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
