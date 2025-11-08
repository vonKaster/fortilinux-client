import { Edit, Play, Trash2, Key, Server as ServerIcon, User, Shield, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Connection } from '@/types';

interface ConnectionCardProps {
  connection: Connection;
  isConnected: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ConnectionCard({
  connection,
  isConnected,
  isConnecting,
  onConnect,
  onCancel,
  onEdit,
  onDelete,
}: ConnectionCardProps) {
  return (
    <Card className="group hover:shadow-lg hover:border-primary/30 transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            {/* Header con nombre y badge */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base">{connection.name}</h3>
                {connection.password && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-1 rounded-md bg-green-100 dark:bg-green-950 border border-green-200 dark:border-green-900">
                    <Key className="h-3 w-3 text-green-700 dark:text-green-400" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">Credenciales guardadas</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Connection details */}
            <div className="space-y-2 pl-12">
              <div className="flex items-center gap-2 text-sm">
                <ServerIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-mono text-muted-foreground">{connection.server}</span>
                <span className="text-muted-foreground">:</span>
                <span className="font-mono font-semibold">{connection.port}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{connection.username}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onEdit}
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {isConnecting ? (
              <Button 
                variant="outline"
                size="sm" 
                onClick={onCancel}
                className="ml-2 font-medium bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700"
              >
                <X className="mr-2 h-3.5 w-3.5" />
                Cancelar
              </Button>
            ) : (
              <Button 
                variant="outline"
                size="sm" 
                disabled={isConnected} 
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isConnected && !isConnecting && onConnect) {
                    onConnect();
                  }
                }}
                className="ml-2 font-medium"
              >
                <Play className="mr-2 h-3.5 w-3.5" />
                Conectar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
