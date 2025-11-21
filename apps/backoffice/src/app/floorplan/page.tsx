'use client';

import { useEffect, useState } from 'react';

interface Table {
  id: string;
  name: string;
  capacity: number;
  status: string;
  x: number;
  y: number;
}

export default function FloorPlanPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedTable, setDraggedTable] = useState<string | null>(null);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await fetch('/api/tables');
      const data = await response.json();
      setTables(data.tables || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTablePosition = async (tableId: string, x: number, y: number) => {
    try {
      await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, x, y }),
      });
    } catch (error) {
      console.error('Error updating table position:', error);
    }
  };

  const handleDragStart = (tableId: string) => {
    setDraggedTable(tableId);
  };

  const handleDragEnd = (e: React.DragEvent, tableId: string) => {
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left - 40;
      const y = e.clientY - rect.top - 40;
      updateTablePosition(tableId, Math.max(0, x), Math.max(0, y));
    }
    setDraggedTable(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'seated':
        return 'bg-red-500';
      case 'cleaning':
        return 'bg-yellow-500';
      case 'held':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Floor Plan</h1>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
            {tables.map((table) => (
              <div
                key={table.id}
                draggable
                onDragStart={() => handleDragStart(table.id)}
                onDragEnd={(e) => handleDragEnd(e, table.id)}
                className={`absolute w-20 h-20 rounded-full flex items-center justify-center text-white cursor-move ${getStatusColor(
                  table.status
                )}`}
                style={{ left: `${table.x}px`, top: `${table.y}px` }}
              >
                <div className="text-center">
                  <p className="font-bold">{table.name}</p>
                  <p className="text-xs">({table.capacity})</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <h2 className="font-semibold mb-2">Legend</h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span>Seated</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span>Cleaning</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span>Held</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



