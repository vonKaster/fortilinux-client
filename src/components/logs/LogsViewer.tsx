import { useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal } from 'lucide-react';

interface LogsViewerProps {
  logs: string;
}

export function LogsViewer({ logs }: LogsViewerProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Terminal className="h-5 w-5" />
        <div>
          <h2 className="text-lg font-semibold">Logs de Conexión</h2>
          <p className="text-sm text-muted-foreground">Salida de openfortivpn</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="bg-muted/30 p-4 font-mono text-sm">
              <pre className="whitespace-pre-wrap">
                {logs || 'Esperando conexión...'}
                <div ref={logsEndRef} />
              </pre>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

