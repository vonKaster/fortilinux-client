import { useEffect, useRef } from 'react';

interface TrafficPoint {
  timestamp: number;
  rx: number;
  tx: number;
}

interface TrafficChartProps {
  data: TrafficPoint[];
}

export function TrafficChart({ data }: TrafficChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  const smoothData = (values: number[], windowSize = 3): number[] => {
    if (values.length < windowSize) return values;
    
    const smoothed: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(values.length, i + Math.ceil(windowSize / 2));
      const window = values.slice(start, end);
      const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
      smoothed.push(avg);
    }
    return smoothed;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const width = rect.width;
    const height = rect.height;

    const render = () => {
      ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('background-color') || '#ffffff';
      ctx.fillRect(0, 0, width, height);
      const WINDOW_SIZE = 60;
      const displayData = data.slice(-WINDOW_SIZE);

      if (displayData.length < 2) return;

      const rxValues = displayData.map(d => d.rx);
      const txValues = displayData.map(d => d.tx);
      const smoothedRx = smoothData(rxValues, 5);
      const smoothedTx = smoothData(txValues, 5);
      const maxRx = Math.max(...smoothedRx, 100);
      const maxTx = Math.max(...smoothedTx, 100);
      const maxValue = Math.max(maxRx, maxTx);

      const padding = 50;
      const graphWidth = width - padding * 2;
      const graphHeight = height - padding * 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
      ctx.lineWidth = 1;
      
      for (let i = 0; i <= 4; i++) {
        const y = padding + (graphHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
      }

      const drawSmoothLine = (
        values: number[], 
        color: string, 
        shadowColor: string,
        label: string
      ) => {
        if (values.length < 2) return;

        const coords = values.map((value, index) => ({
          x: padding + (index / (values.length - 1)) * graphWidth,
          y: padding + graphHeight - (value / maxValue) * graphHeight
        }));

        ctx.beginPath();
        ctx.moveTo(coords[0].x, height - padding);
        ctx.lineTo(coords[0].x, coords[0].y);

        for (let i = 0; i < coords.length - 1; i++) {
          const xc = (coords[i].x + coords[i + 1].x) / 2;
          const yc = (coords[i].y + coords[i + 1].y) / 2;
          ctx.quadraticCurveTo(coords[i].x, coords[i].y, xc, yc);
        }

        const last = coords[coords.length - 1];
        const secondLast = coords[coords.length - 2];
        ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
        
        ctx.lineTo(last.x, height - padding);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        gradient.addColorStop(0, color.replace('1)', '0.3)'));
        gradient.addColorStop(1, color.replace('1)', '0.05)'));
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(coords[0].x, coords[0].y);
        
        for (let i = 0; i < coords.length - 1; i++) {
          const xc = (coords[i].x + coords[i + 1].x) / 2;
          const yc = (coords[i].y + coords[i + 1].y) / 2;
          ctx.quadraticCurveTo(coords[i].x, coords[i].y, xc, yc);
        }
        
        ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
        
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        
        const currentValue = values[values.length - 1];
        const displayValue = currentValue < 1024 
          ? `${currentValue.toFixed(0)} B/s`
          : currentValue < 1024 * 1024
          ? `${(currentValue / 1024).toFixed(1)} KB/s`
          : `${(currentValue / 1024 / 1024).toFixed(2)} MB/s`;
        
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillStyle = color;
        ctx.textAlign = 'right';
        ctx.fillText(`${label} ${displayValue}`, width - padding, last.y);
      };

      drawSmoothLine(smoothedTx, 'rgba(59, 130, 246, 1)', 'rgba(59, 130, 246, 0.3)', '↑');
      drawSmoothLine(smoothedRx, 'rgba(16, 185, 129, 1)', 'rgba(16, 185, 129, 0.3)', '↓');
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(100, 116, 139, 0.8)';
      ctx.textAlign = 'left';
      
      const maxLabel = maxValue < 1024 
        ? `${maxValue.toFixed(0)} B/s`
        : maxValue < 1024 * 1024
        ? `${(maxValue / 1024).toFixed(1)} KB/s`
        : `${(maxValue / 1024 / 1024).toFixed(2)} MB/s`;
      
      ctx.fillText(maxLabel, padding, padding - 10);
      ctx.fillText('0', padding, height - padding + 20);
      ctx.textAlign = 'center';
      ctx.fillText('Últimos 60 segundos', width / 2, height - 10);
    };

    const animate = () => {
      render();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [data]);

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg border border-border"
        style={{ height: '350px', background: 'hsl(var(--card))' }}
      />
      <div className="mt-4 flex justify-center gap-8 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500 shadow-sm" />
          <span className="font-medium text-foreground">↓ Recibido (Download)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500 shadow-sm" />
          <span className="font-medium text-foreground">↑ Enviado (Upload)</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Actualizándose en tiempo real cada 1 segundo
        </div>
      </div>
    </div>
  );
}
