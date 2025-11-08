import { Square, Wifi, Activity, ArrowDown, ArrowUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatDuration } from '@/lib/utils';
import { MiniTrafficChart } from './MiniTrafficChart';
import type { VPNStatus, TrafficData } from '@/types';

interface VPNStatusWidgetProps {
  status: VPNStatus;
  traffic: TrafficData | null;
  onDisconnect: () => void;
  isDisconnecting?: boolean;
}

export function VPNStatusWidget({ status, traffic, onDisconnect, isDisconnecting = false }: VPNStatusWidgetProps) {
  const currentRx = traffic?.history[traffic.history.length - 1]?.rx || 0;
  const currentTx = traffic?.history[traffic.history.length - 1]?.tx || 0;

  return (
    <div className="border-b">
      <div className="p-6 space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  status.connected ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
              {status.connected && (
                <>
                  <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-green-500 animate-ping opacity-75" />
                  <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                </>
              )}
            </div>
            <span className="text-sm font-medium">
              {status.connected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          {status.connected && (
            <Activity className="h-4 w-4 text-green-500" />
          )}
        </div>

        {status.connected && (
          <>
            {/* IP Address */}
            {status.ip && (
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Dirección IP</span>
                </div>
                <span className="text-sm font-mono font-medium">{status.ip}</span>
              </div>
            )}

            {/* Duration */}
            {status.duration !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Duración</span>
                <span className="font-mono font-medium">{formatDuration(status.duration)}</span>
              </div>
            )}

            <Separator />

            {/* Traffic Chart */}
            {traffic && traffic.history.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Tráfico en Tiempo Real</span>
                </div>
                
                {/* Mini Chart */}
                <div className="bg-muted/30 rounded-lg p-2">
                  <MiniTrafficChart data={traffic.history} />
                </div>

                {/* Current Speed */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-500/10 rounded-lg p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <ArrowDown className="h-3 w-3 text-green-600 dark:text-green-400" />
                      <span className="text-xs text-green-600 dark:text-green-400">RX</span>
                    </div>
                    <div className="text-sm font-mono font-semibold text-green-600 dark:text-green-400">
                      {(currentRx / 1024).toFixed(1)} KB/s
                    </div>
                  </div>
                  <div className="bg-blue-500/10 rounded-lg p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <ArrowUp className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs text-blue-600 dark:text-blue-400">TX</span>
                    </div>
                    <div className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {(currentTx / 1024).toFixed(1)} KB/s
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Total Data */}
            {status.bytesReceived !== undefined && status.bytesSent !== undefined && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Total Recibido</span>
                  <span className="font-mono font-medium">{(status.bytesReceived / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Total Enviado</span>
                  <span className="font-mono font-medium">{(status.bytesSent / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>
            )}

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full hover:bg-destructive hover:text-destructive-foreground transition-colors" 
              onClick={onDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Desconectando
                </>
              ) : (
                <>
                  <Square className="mr-2 h-3.5 w-3.5" />
                  Desconectar
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
