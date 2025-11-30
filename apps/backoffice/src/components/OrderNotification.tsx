'use client';

import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

export default function OrderNotification() {
    const lastOrderIdRef = useRef<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isInitializedRef = useRef<boolean>(false);

    useEffect(() => {
        // Initialize audio with error handling
        try {
            audioRef.current = new Audio('/sounds/notification.mp3');
            audioRef.current.volume = 0.7; // Set volume to 70%
        } catch (e) {
            console.warn('Could not initialize audio:', e);
        }

        // Initial fetch to set the baseline (don't notify on page load)
        const init = async () => {
            try {
                const response = await fetch('/api/orders/check-new', {
                    cache: 'no-store',
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.latestOrder) {
                        lastOrderIdRef.current = data.latestOrder.id;
                        console.log('[OrderNotification] Initialized with order:', data.latestOrder.id.slice(0, 8));
                    } else {
                        console.log('[OrderNotification] No existing orders found');
                    }
                } else {
                    console.warn('[OrderNotification] Failed to initialize:', response.status);
                }
                isInitializedRef.current = true;
            } catch (e) {
                console.error('[OrderNotification] Failed to initialize order notifications:', e);
                isInitializedRef.current = true;
            }
        };

        init();

        // Poll every 10 seconds (more frequent for better responsiveness)
        const intervalId = setInterval(async () => {
            // Don't poll until initialized
            if (!isInitializedRef.current) return;

            try {
                const response = await fetch('/api/orders/check-new', {
                    cache: 'no-store',
                });
                
                if (!response.ok) {
                    console.warn('[OrderNotification] Poll failed:', response.status);
                    return;
                }

                const data = await response.json();
                
                if (data.error) {
                    console.warn('[OrderNotification] API error:', data.error);
                    return;
                }

                const latestOrder = data.latestOrder;

                if (!latestOrder) {
                    // No orders yet, reset ref
                    if (lastOrderIdRef.current) {
                        lastOrderIdRef.current = null;
                    }
                    return;
                }

                // Check if it's a new order
                if (lastOrderIdRef.current && latestOrder.id !== lastOrderIdRef.current) {
                    // Only notify if the order is recent (e.g., within last 5 minutes)
                    // This prevents notifying about old orders if the user was offline
                    const createdTime = new Date(latestOrder.created).getTime();
                    const now = new Date().getTime();
                    const timeDiff = now - createdTime;
                    const isRecent = timeDiff < 5 * 60 * 1000; // 5 minutes

                    if (isRecent) {
                        console.log('[OrderNotification] New order detected:', latestOrder.id.slice(0, 8));

                        // Play sound
                        if (audioRef.current) {
                            try {
                                await audioRef.current.play();
                            } catch (e) {
                                console.warn('[OrderNotification] Audio play failed:', e);
                            }
                        }

                        // Format total (convert from paise to rupees)
                        const totalInRupees = (latestOrder.total || 0) / 100;

                        // Show toast
                        toast.success(
                            <div className="flex flex-col gap-1">
                                <span className="font-bold text-base">New Order Received! 🎉</span>
                                <span className="text-sm opacity-90">
                                    Order #{latestOrder.id.slice(0, 8)} • ₹{totalInRupees.toFixed(2)}
                                </span>
                                {latestOrder.status && (
                                    <span className="text-xs opacity-75">Status: {latestOrder.status}</span>
                                )}
                            </div>,
                            {
                                duration: 6000,
                                position: 'top-right',
                                style: {
                                    background: '#10B981',
                                    color: '#fff',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                },
                            }
                        );
                    } else {
                        console.log('[OrderNotification] Order is too old, skipping notification:', timeDiff / 1000, 'seconds old');
                    }
                }

                // Update ref
                lastOrderIdRef.current = latestOrder.id;
            } catch (error) {
                console.error('[OrderNotification] Error polling for new orders:', error);
            }
        }, 10000); // Poll every 10 seconds

        return () => {
            clearInterval(intervalId);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    return null; // This component doesn't render anything visible
}
