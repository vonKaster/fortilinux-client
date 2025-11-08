import { useState, useEffect } from 'react';
import { Server, History, Terminal, Activity } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { ConnectionsList } from '@/components/connections/ConnectionsList';
import { HistoryList } from '@/components/history/HistoryList';
import { LogsViewer } from '@/components/logs/LogsViewer';
import { TrafficMonitor } from '@/components/traffic/TrafficMonitor';
import { PasswordDialog } from '@/components/connections/PasswordDialog';
import { Toaster } from '@/components/ui/toaster';
import { useVPN } from '@/hooks/useVPN';
import { useConnections } from '@/hooks/useConnections';
import { useHistory } from '@/hooks/useHistory';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';
import type { Connection } from '@/types';

function App() {
  const { theme, toggleTheme } = useTheme();
  const { status, logs, traffic, connect, disconnect } = useVPN();
  const { connections, addConnection, updateConnection, deleteConnection } = useConnections();
  const { history, clearHistory } = useHistory();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  useEffect(() => {
    let handlingConnection = false;

    const handleVPNConnected = () => {
      if (handlingConnection) return;
      handlingConnection = true;
      
      setIsConnecting(false);
      toast.success('Conexión establecida', {
        description: 'VPN conectada correctamente',
      });

      setTimeout(() => {
        handlingConnection = false;
      }, 1000);
    };

    const handleVPNError = (event: any) => {
      setIsConnecting(false);
      toast.error('Error de conexión', {
        description: event.detail || 'No se pudo establecer la conexión VPN',
      });
    };

    window.addEventListener('vpn-connected', handleVPNConnected);
    window.addEventListener('vpn-error', handleVPNError);
    return () => {
      window.removeEventListener('vpn-connected', handleVPNConnected);
      window.removeEventListener('vpn-error', handleVPNError);
    };
  }, []);

  const handleConnect = async (connection: Connection) => {
    if (!connection.password) {
      setPendingConnection(connection);
      setShowPasswordDialog(true);
      return;
    }

    await performConnect(connection, connection.password);
  };

  const performConnect = async (connection: Connection, password: string) => {
    setIsConnecting(true);
    
    toast.info('Conectando...', {
      description: `Estableciendo conexión con ${connection.server}`,
      duration: 3000,
    });

    try {
      const result = await connect({
        server: connection.server,
        port: connection.port,
        username: connection.username,
        password: password,
        trustedCert: connection.trustedCert,
        connectionName: connection.name,
      });

      if (!result || !result.success) {
        toast.error('Error de conexión', {
          description: result?.message || 'No se pudo conectar al servidor VPN',
        });
        setIsConnecting(false);
      }
    } catch (error) {
      toast.error('Error inesperado', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
      setIsConnecting(false);
    }
  };

  const handlePasswordConfirm = async (password: string) => {
    if (pendingConnection) {
      await performConnect(pendingConnection, password);
      setPendingConnection(null);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const result = await disconnect();
      if (result?.success) {
        toast.info('VPN desconectada', {
          description: 'La conexión se ha cerrado correctamente',
        });
      }
    } catch (error) {
      toast.error('Error al desconectar', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleDelete = async (index: number) => {
    if (!confirm('¿Eliminar esta conexión?')) return;
    await deleteConnection(index);
    toast.success('Conexión eliminada', {
      description: 'La conexión se ha eliminado correctamente',
    });
  };

  const handleClearHistory = async () => {
    if (!confirm('¿Limpiar todo el historial?')) return;
    await clearHistory();
    toast.success('Historial limpiado', {
      description: 'Todo el historial ha sido eliminado',
    });
  };

  return (
    <>
      <Toaster />
      <PasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        username={pendingConnection?.username || ''}
        onConfirm={handlePasswordConfirm}
      />
      <div className="flex h-screen bg-background">
        <Sidebar
          theme={theme}
          onToggleTheme={toggleTheme}
          vpnStatus={status}
          traffic={traffic}
          onDisconnect={handleDisconnect}
          connectionsCount={connections.length}
          historyCount={history.length}
          successCount={history.filter((h) => h.success).length}
          failureCount={history.filter((h) => !h.success).length}
          isDisconnecting={isDisconnecting}
        />

      <main className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          <TopBar title="VPN Manager" />

          <div className="flex-1 overflow-auto p-8">
            <Tabs defaultValue="connections" className="h-full">
              <TabsList className="mb-6">
                <TabsTrigger value="connections" className="gap-2">
                  <Server className="h-4 w-4" />
                  Conexiones
                </TabsTrigger>
                <TabsTrigger value="traffic" disabled={!status.connected} className="gap-2">
                  <Activity className="h-4 w-4" />
                  Tráfico
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="h-4 w-4" />
                  Historial
                </TabsTrigger>
                <TabsTrigger value="logs" className="gap-2">
                  <Terminal className="h-4 w-4" />
                  Logs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="connections">
                <ConnectionsList
                  connections={connections}
                  isConnected={status.connected}
                  isConnecting={isConnecting}
                  onConnect={handleConnect}
                  onEdit={updateConnection}
                  onDelete={handleDelete}
                  onAdd={addConnection}
                />
              </TabsContent>

              <TabsContent value="traffic">
                <TrafficMonitor traffic={traffic} />
              </TabsContent>

              <TabsContent value="history">
                <HistoryList history={history} onClear={handleClearHistory} />
              </TabsContent>

              <TabsContent value="logs">
                <LogsViewer logs={logs} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
    </>
  );
}

export default App;
