'use client';

import { useEffect, useState } from 'react';

const FOOD_EMOJIS = [
    '🍕', '🍔', '🌭', '🍟', '🍗', '🥩', '🍖', '🍤', '🍣', '🍱',
    '🥟', '🍜', '🍝', '🥪', '🌮', '🌯', '🍛', '🥘', '🍲', '🍚',
    '🍙', '🥗', '🍳', '🥞', '🧇', '🍰', '🧁', '🍩', '🍪', '🍦',
    '🍧', '🍨', '🍫', '🍿', '🥤', '🍹', '🍸', '🍺', '🥛', '🫖', '☕'
];

interface FloatingEmoji {
    id: number;
    emoji: string;
    left: number;
    animationDuration: number;
    delay: number;
    size: number;
}

export default function FloatingFoodEmojis() {
    const [emojis, setEmojis] = useState<FloatingEmoji[]>([]);

    useEffect(() => {
        // Generate a fixed set of emojis on mount to avoid hydration mismatch
        // and to keep them consistent during the session
        const newEmojis: FloatingEmoji[] = [];
        const count = 15; // Number of emojis on screen

        for (let i = 0; i < count; i++) {
            newEmojis.push({
                id: i,
                emoji: FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)],
                left: Math.random() * 100, // Random horizontal position (0-100%)
                animationDuration: 15 + Math.random() * 20, // Random duration between 15s and 35s
                delay: Math.random() * -20, // Negative delay to start at random positions in cycle
                size: 1.5 + Math.random() * 1.5, // Random size between 1.5rem and 3rem
            });
        }

        setEmojis(newEmojis);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-[50]">
            {emojis.map((item) => (
                <div
                    key={item.id}
                    className="absolute bottom-[-50px] opacity-[0.15] select-none animate-float"
                    style={{
                        left: `${item.left}%`,
                        fontSize: `${item.size}rem`,
                        animationDuration: `${item.animationDuration}s`,
                        animationDelay: `${item.delay}s`,
                        // Add some random rotation
                        transform: `rotate(${Math.random() * 360}deg)`,
                    }}
                >
                    {item.emoji}
                </div>
            ))}
            <style jsx global>{`
        @keyframes float {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.15;
          }
          90% {
            opacity: 0.15;
          }
          100% {
            transform: translateY(-110vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-float {
          animation-name: float;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
        </div>
    );
}
