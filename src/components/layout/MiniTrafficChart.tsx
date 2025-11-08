import { useEffect, useRef } from 'react';

interface TrafficPoint {
  timestamp: number;
  rx: number;
  tx: number;
}

interface MiniTrafficChartProps {
  data: TrafficPoint[];
}

export function MiniTrafficChart({ data }: MiniTrafficChartProps) {
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

    const width = rect.width;
    const height = rect.height;

    const render = () => {
      ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('background-color') || 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, width, height);

      const displayData = data.slice(-30);

      if (displayData.length < 2) return;

      const rxValues = displayData.map(d => d.rx);
      const txValues = displayData.map(d => d.tx);
      
      const smoothedRx = smoothData(rxValues, 3);
      const smoothedTx = smoothData(txValues, 3);

      const maxRx = Math.max(...smoothedRx, 100);
      const maxTx = Math.max(...smoothedTx, 100);
      const maxValue = Math.max(maxRx, maxTx);

      const padding = 8;
      const graphWidth = width - padding * 2;
      const graphHeight = height - padding * 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const drawSmooth = (values: number[], color: string) => {
        const coords = values.map((value, index) => ({
          x: padding + (index / (values.length - 1)) * graphWidth,
          y: padding + graphHeight - (value / maxValue) * graphHeight
        }));

        // Área
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
        ctx.fillStyle = color.replace('1)', '0.2)');
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(coords[0].x, coords[0].y);

        for (let i = 0; i < coords.length - 1; i++) {
          const xc = (coords[i].x + coords[i + 1].x) / 2;
          const yc = (coords[i].y + coords[i + 1].y) / 2;
          ctx.quadraticCurveTo(coords[i].x, coords[i].y, xc, yc);
        }

        ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      };

      drawSmooth(smoothedTx, 'rgba(59, 130, 246, 1)');
      drawSmooth(smoothedRx, 'rgba(16, 185, 129, 1)');
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
    <div className="w-full">
      <canvas
        ref={canvasRef}
        className="w-full rounded-md"
        style={{ 
          width: '100%', 
          height: '100px',
          background: 'hsl(var(--muted))'
        }}
      />
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>Últimos 30s</span>
        <span>Tiempo real</span>
      </div>
    </div>
  );
}
