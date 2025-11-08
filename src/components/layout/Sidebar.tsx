import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VPNStatusWidget } from './VPNStatusWidget';
import { StatsWidget } from './StatsWidget';
import type { VPNStatus, TrafficData } from '@/types';

interface SidebarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  vpnStatus: VPNStatus;
  traffic: TrafficData | null;
  onDisconnect: () => void;
  connectionsCount: number;
  historyCount: number;
  successCount: number;
  failureCount: number;
  isDisconnecting?: boolean;
}

export function Sidebar({
  theme,
  onToggleTheme,
  vpnStatus,
  traffic,
  onDisconnect,
  connectionsCount,
  historyCount,
  successCount,
  failureCount,
  isDisconnecting = false,
}: SidebarProps) {
  return (
    <aside className="w-72 border-r bg-card">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <h2 className="text-lg font-semibold tracking-tight">FortiLinux</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggleTheme}
            className="hover:bg-muted"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </div>

        <VPNStatusWidget status={vpnStatus} traffic={traffic} onDisconnect={onDisconnect} isDisconnecting={isDisconnecting} />

        {/* Stats */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <StatsWidget
              connectionsCount={connectionsCount}
              historyCount={historyCount}
              successCount={successCount}
              failureCount={failureCount}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
