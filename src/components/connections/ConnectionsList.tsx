import { Plus, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConnectionCard } from './ConnectionCard';
import { ConnectionDialog } from './ConnectionDialog';
import { useState } from 'react';
import type { Connection } from '@/types';

interface ConnectionsListProps {
  connections: Connection[];
  isConnected: boolean;
  isConnecting: boolean;
  onConnect: (connection: Connection) => void;
  onEdit: (index: number, connection: Connection) => void;
  onDelete: (index: number) => void;
  onAdd: (connection: Connection) => void;
}

export function ConnectionsList({
  connections,
  isConnected,
  isConnecting,
  onConnect,
  onEdit,
  onDelete,
  onAdd,
}: ConnectionsListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);

  const handleNew = () => {
    setEditingIndex(-1);
    setEditingConnection(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (index: number, connection: Connection) => {
    setEditingIndex(index);
    setEditingConnection(connection);
    setIsDialogOpen(true);
  };

  const handleSave = (connection: Connection) => {
    if (editingIndex >= 0) {
      onEdit(editingIndex, connection);
    } else {
      onAdd(connection);
    }
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Conexiones Guardadas</h2>
          <p className="text-sm text-muted-foreground">Administra tus conexiones VPN</p>
        </div>
        <Button variant="outline" onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Conexión
        </Button>
      </div>

      <div className="grid gap-4">
        {connections.length === 0 ? (
          <Card>
            <CardContent className="flex h-64 items-center justify-center">
              <div className="text-center">
                <Server className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No hay conexiones guardadas</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          connections.map((conn, index) => (
            <ConnectionCard
              key={index}
              connection={conn}
              isConnected={isConnected}
              isConnecting={isConnecting}
              onConnect={() => onConnect(conn)}
              onEdit={() => handleEdit(index, conn)}
              onDelete={() => onDelete(index)}
            />
          ))
        )}
      </div>

      <ConnectionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        connection={editingConnection}
        onSave={handleSave}
      />
    </div>
  );
}

