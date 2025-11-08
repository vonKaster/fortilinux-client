import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { CheckCircle2, XCircle, Wifi, User, Clock } from 'lucide-react';
import type { HistoryEntry } from '@/types';

interface HistoryCardProps {
  entry: HistoryEntry;
}

export function HistoryCard({ entry }: HistoryCardProps) {
  return (
    <Card className={`hover:shadow-md transition-all border-l-4 ${
      entry.success 
        ? 'border-l-green-500 hover:border-l-green-600' 
        : 'border-l-red-500 hover:border-l-red-600'
    }`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            {/* Icon */}
            <div className={`p-2 rounded-lg ${
              entry.success 
                ? 'bg-green-100 dark:bg-green-950' 
                : 'bg-red-100 dark:bg-red-950'
            }`}>
              {entry.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
            </div>

            {/* Content */}
            <div className="space-y-2 flex-1">
              <div>
                <h4 className="font-bold text-base">{entry.connectionName}</h4>
                <p className="text-sm text-muted-foreground font-mono">{entry.server}</p>
              </div>
              
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{entry.username}</span>
                </div>
                {entry.ip && (
                  <div className="flex items-center gap-1.5">
                    <Wifi className="h-3 w-3 text-muted-foreground" />
                    <span className="font-mono text-muted-foreground">{entry.ip}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{formatDate(entry.timestamp)}</span>
                </div>
              </div>

              {entry.error && (
                <p className="text-xs text-destructive font-medium bg-destructive/10 px-2 py-1 rounded-md inline-block">
                  {entry.error}
                </p>
              )}
            </div>
          </div>

          {/* Badge */}
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-2 ring-inset ${
              entry.success
                ? 'bg-green-50 text-green-700 ring-green-600/30 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/30'
                : 'bg-red-50 text-red-700 ring-red-600/30 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30'
            }`}
          >
            {entry.success ? 'EXITOSO' : 'FALLIDO'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
