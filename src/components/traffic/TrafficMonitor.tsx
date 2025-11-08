import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Download, Upload, Zap } from 'lucide-react';
import { TrafficChart } from '../TrafficChart';
import type { TrafficData } from '@/types';

interface TrafficMonitorProps {
  traffic: TrafficData | null;
}

export function TrafficMonitor({ traffic }: TrafficMonitorProps) {
  if (!traffic) {
    return (
      <Card>
        <CardContent className="flex h-96 items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Activity className="mx-auto h-16 w-16 mb-4 opacity-20" />
            <p className="text-sm font-medium">No hay datos de tráfico</p>
            <p className="text-xs mt-1">Conecta a una VPN para ver estadísticas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentRx = traffic.history[traffic.history.length - 1]?.rx || 0;
  const currentTx = traffic.history[traffic.history.length - 1]?.tx || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Monitoreo de Tráfico</h2>
        <p className="text-muted-foreground">Estadísticas en tiempo real de tu conexión VPN</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recibido</CardTitle>
            <Download className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(traffic.bytesReceived / 1024 / 1024).toFixed(2)} MB
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Datos descargados
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enviado</CardTitle>
            <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(traffic.bytesSent / 1024 / 1024).toFixed(2)} MB
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Datos subidos
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-green-200 dark:border-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Velocidad RX</CardTitle>
            <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {(currentRx / 1024).toFixed(1)} KB/s
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Velocidad actual
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-blue-200 dark:border-blue-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Velocidad TX</CardTitle>
            <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {(currentTx / 1024).toFixed(1)} KB/s
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Velocidad actual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Gráfico en Tiempo Real
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <TrafficChart data={traffic.history} />
        </CardContent>
      </Card>
    </div>
  );
}
