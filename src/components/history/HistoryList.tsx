import { useState } from 'react';
import { History, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HistoryCard } from './HistoryCard';
import type { HistoryEntry } from '@/types';

interface HistoryListProps {
  history: HistoryEntry[];
  onClear: () => void;
}

const ITEMS_PER_PAGE = 10;

export function HistoryList({ history, onClear }: HistoryListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const reversedHistory = [...history].reverse();
  const totalPages = Math.ceil(reversedHistory.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = reversedHistory.slice(startIndex, endIndex);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleClear = () => {
    setCurrentPage(1);
    onClear();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Historial</h2>
          <p className="text-sm text-muted-foreground">
            Últimas 50 conexiones (mostrando {currentItems.length} de {reversedHistory.length})
          </p>
        </div>
        {history.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Trash2 className="mr-2 h-4 w-4" />
            Limpiar
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {history.length === 0 ? (
          <Card>
            <CardContent className="flex h-64 items-center justify-center">
              <div className="text-center">
                <History className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No hay historial</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {currentItems.map((entry, index) => (
                <HistoryCard key={startIndex + index} entry={entry} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4 pb-2 px-1">
                <p className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

