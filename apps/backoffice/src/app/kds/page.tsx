'use client';

import { useEffect, useState } from 'react';

interface KDSTicket {
  id: string;
  orderId: string;
  station: string;
  status: string;
  items?: any[];
  ticketItems?: any[];
  priority: boolean;
  created: string;
  expand?: {
    orderId?: {
      id: string;
      status: string;
      total: number;
    };
  };
}

export default function KDSPage() {
  const [tickets, setTickets] = useState<Record<string, KDSTicket[]>>({
    hot: [],
    cold: [],
    bar: [],
    default: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await fetch('/api/kds');
        const data = await response.json();
        const allTickets = data.tickets || [];

        const grouped: Record<string, KDSTicket[]> = {
          hot: [],
          cold: [],
          bar: [],
          default: [],
        };

        allTickets.forEach((ticket: any) => {
          const station = ticket.station || 'default';
          if (grouped[station]) {
            grouped[station].push(ticket);
          }
        });

        setTickets(grouped);
      } catch (error) {
        console.error('Error fetching tickets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();

    // Poll for updates (can be replaced with WebSocket/SSE in production)
    const interval = setInterval(fetchTickets, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const ticket = Object.values(tickets)
        .flat()
        .find((t) => t.id === ticketId);
      
      const response = await fetch('/api/kds', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticketId, 
          status: newStatus,
          orderId: ticket?.orderId 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update ticket');
      }

      // Refresh tickets
      const fetchTickets = async () => {
        const res = await fetch('/api/kds');
        const data = await res.json();
        const allTickets = data.tickets || [];
        const grouped: Record<string, KDSTicket[]> = {
          hot: [],
          cold: [],
          bar: [],
          default: [],
        };
        allTickets.forEach((t: any) => {
          const station = t.station || 'default';
          if (grouped[station]) {
            grouped[station].push(t);
          }
        });
        setTickets(grouped);
      };
      fetchTickets();
    } catch (error) {
      console.error('Error updating ticket:', error);
      alert('Failed to update ticket status');
    }
  };

  const getTimeElapsed = (created: string): string => {
    const now = new Date();
    const createdDate = new Date(created);
    const diff = Math.floor((now.getTime() - createdDate.getTime()) / 1000 / 60);
    return `${diff}m`;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading KDS...</div>;
  }

  const stations = [
    { key: 'hot', label: 'Hot Station' },
    { key: 'cold', label: 'Cold Station' },
    { key: 'bar', label: 'Bar' },
    { key: 'default', label: 'General' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 via-accent-purple/5 to-accent-green/5 p-4">
      <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">Kitchen Display System</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stations.map((station) => (
          <div key={station.key} className="card border-2 border-accent-blue/20">
            <h2 className="text-xl font-bold mb-4 text-accent-blue">{station.label}</h2>
            <div className="space-y-3">
              {tickets[station.key].map((ticket) => (
                <div
                  key={ticket.id}
                  className={`border-2 rounded-lg p-3 transition-all duration-200 ${
                    ticket.priority ? 'border-accent-pink bg-accent-pink/10 shadow-md' : 'border-gray-200 hover:border-accent-blue/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">
                        Order #{Array.isArray(ticket.orderId) ? ticket.orderId[0]?.slice(0, 8) : ticket.orderId?.slice(0, 8) || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">{getTimeElapsed(ticket.created)}</p>
                      {((ticket.ticketItems || ticket.items || []).length > 0) && (
                        <p className="text-xs text-gray-500 mt-1">
                          {(ticket.ticketItems || ticket.items || []).length} item{((ticket.ticketItems || ticket.items || []).length !== 1) ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        ticket.status === 'cooking'
                          ? 'bg-accent-orange/20 text-accent-brown border border-accent-orange/30'
                          : ticket.status === 'ready'
                          ? 'bg-accent-green/20 text-accent-green border border-accent-green/30'
                          : 'bg-accent-gray/20 text-accent-gray border border-accent-gray/30'
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </div>

                  <div className="mb-2 space-y-1">
                    {((ticket.ticketItems || ticket.items || []).length > 0) ? (
                      (ticket.ticketItems || ticket.items || []).map((item: any, idx: number) => (
                        <div key={idx} className="text-sm border-b border-gray-100 pb-1 last:border-0">
                          <div className="flex-1">
                            <span className="font-medium">
                              {item.qty}x {item.name || item.nameSnapshot || 'Unknown Item'}
                            </span>
                            {item.description && item.description.trim() && (
                              <div className="text-xs text-gray-600 mt-0.5 italic">
                                {item.description}
                              </div>
                            )}
                          </div>
                          {item.comment && item.comment.trim() && (
                            <div className="text-xs text-blue-600 font-medium mt-1 ml-2 italic">
                              💬 {item.comment}
                            </div>
                          )}
                          {item.options && Array.isArray(item.options) && item.options.length > 0 && (
                            <div className="text-xs text-gray-500 mt-0.5 ml-4">
                              {item.options.map((opt: any, optIdx: number) => (
                                <div key={optIdx}>
                                  {opt.groupId || 'Option'}: {Array.isArray(opt.valueIds) ? opt.valueIds.join(', ') : opt.valueIds}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 italic">No items</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {ticket.status === 'queued' && (
                      <button
                        onClick={() => updateTicketStatus(ticket.id, 'cooking')}
                        className="flex-1 btn-primary text-sm py-2"
                      >
                        Start
                      </button>
                    )}
                    {ticket.status === 'cooking' && (
                      <button
                        onClick={() => updateTicketStatus(ticket.id, 'ready')}
                        className="flex-1 btn-success text-sm py-2"
                      >
                        Ready
                      </button>
                    )}
                    {ticket.status === 'ready' && (
                      <button
                        onClick={() => updateTicketStatus(ticket.id, 'bumped')}
                        className="flex-1 bg-accent-gray text-white px-3 py-2 rounded-lg text-sm hover:opacity-90 transition-all duration-200"
                      >
                        Bump
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



