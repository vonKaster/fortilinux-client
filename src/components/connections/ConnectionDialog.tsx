import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { Connection } from '@/types';

interface ConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: Connection | null;
  onSave: (connection: Connection) => void;
}

export function ConnectionDialog({ open, onOpenChange, connection, onSave }: ConnectionDialogProps) {
  const [formData, setFormData] = useState<Connection>({
    name: '',
    server: '',
    port: 443,
    username: '',
    password: '',
    trustedCert: '',
    autoTrustCert: true,
  });
  const [savePassword, setSavePassword] = useState(false);

  useEffect(() => {
    if (connection) {
      setFormData({
        ...connection,
        autoTrustCert: connection.autoTrustCert !== undefined ? connection.autoTrustCert : true,
      });
      setSavePassword(!!connection.password);
    } else {
      setFormData({
        name: '',
        server: '',
        port: 443,
        username: '',
        password: '',
        trustedCert: '',
        autoTrustCert: true,
      });
      setSavePassword(false);
    }
  }, [connection, open]);

  const handleSave = () => {
    if (!formData.name || !formData.server || !formData.username) {
      alert('Completa todos los campos requeridos');
      return;
    }

    onSave({
      ...formData,
      password: savePassword ? formData.password : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{connection ? 'Editar' : 'Nueva'} Conexión</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Mi VPN"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 grid gap-2">
              <Label htmlFor="server">Servidor</Label>
              <Input
                id="server"
                value={formData.server}
                onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                placeholder="vpn.example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="port">Puerto</Label>
              <Input
                id="port"
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="username">Usuario</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="usuario"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="save-pwd" checked={savePassword} onCheckedChange={setSavePassword} />
            <Label htmlFor="save-pwd">Guardar contraseña</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              id="auto-trust" 
              checked={formData.autoTrustCert !== false} 
              onCheckedChange={(checked) => setFormData({ ...formData, autoTrustCert: checked })} 
            />
            <Label htmlFor="auto-trust">Auto-confiar en certificados</Label>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cert">Certificado específico (opcional)</Label>
            <Input
              id="cert"
              value={formData.trustedCert}
              onChange={(e) => setFormData({ ...formData, trustedCert: e.target.value })}
              placeholder="SHA256 fingerprint del certificado"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

